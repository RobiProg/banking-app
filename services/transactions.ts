import { supabase } from '../lib/supabase';
import { mapAuthError } from './auth';
import type { Transaction, TransactionType } from '../types/db';

/**
 * Generate a client UUID idempotency key (design.md §6.4).
 */
export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Map raw RPC error text to a friendly user-facing message.
 * Matches design.md §8 and SRS v2.1 table.
 */
export function mapRpcError(raw: string): string {
  const code = raw.toLowerCase();
  if (code.includes('recipient_not_found')) return 'No SmartBank account found for that number.';
  if (code.includes('insufficient_balance') || code.includes('insufficient_funds')) {
    return "You don't have enough balance for this transfer.";
  }
  if (code.includes('self_transfer')) return "You can't transfer to your own account.";
  if (code.includes('invalid_amount')) return 'Enter a valid amount (up to two decimals, max ৳500,000).';
  if (code.includes('no_account') || code.includes('no_sender_account')) {
    return 'No bank account linked to your profile yet.';
  }
  if (code.includes('account_inactive') || code.includes('sender_not_active')) {
    return 'Your account is inactive or blocked.';
  }
  if (code.includes('recipient_inactive') || code.includes('recipient_not_active')) {
    return 'Recipient account is inactive or blocked.';
  }
  if (code.includes('not_authorized')) return 'You are not authorized to perform this action.';
  if (code.includes('customer_deposit_disabled')) {
    return 'Customer self-deposit is disabled. Deposits must be made at an authorized branch counter.';
  }
  if (code.includes('branch_not_found')) return 'The specified branch is invalid or inactive.';
  if (code.includes('invalid_status')) return 'Invalid status.';
  if (code.includes('account_not_found')) return 'Account not found.';
  if (code.includes('schema cache') || code.includes('pgrst202') || code.includes('could not find the function')) {
    return 'Database migration required: Please execute 0007_srs_v2_alignment.sql in your Supabase SQL Editor.';
  }
  // Network / timeout
  if (
    code.includes('network') ||
    code.includes('fetch') ||
    code.includes('timeout') ||
    code.includes('failed to fetch') ||
    code.includes('aborted')
  ) {
    return "Couldn't reach the server. We'll retry safely.";
  }
  return mapAuthError(raw);
}

// ---------- Query Helpers ----------

export type ListTxnsParams = {
  forMyAccount?: boolean;
  type?: TransactionType;
  limit?: number;
};

export type ListTxnsResult = {
  transactions: Transaction[];
  errorMessage: string | null;
};

export async function listTransactions(
  params: ListTxnsParams = {},
): Promise<ListTxnsResult> {
  try {
    let q = supabase
      .from('transactions')
      .select('*, branches(name, district, branch_code)')
      .order('created_at', { ascending: false })
      .limit(params.limit ?? 100);

    if (params.type) {
      q = q.or(`type.eq.${params.type},transaction_type.eq.${params.type}`);
    }

    const { data, error } = await q;
    if (error) {
      return { transactions: [], errorMessage: mapAuthError(error.message) };
    }

    const normalized = ((data ?? []) as unknown as Array<Transaction & { transaction_type?: TransactionType; type?: TransactionType }>).map((t) => {
      const effType = (t.type ?? t.transaction_type ?? 'transfer') as TransactionType;
      return {
        ...t,
        type: effType,
        transaction_type: effType,
      };
    });

    return { transactions: normalized, errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[transactions] listTransactions threw:', err);
    return { transactions: [], errorMessage: 'Something went wrong. Please try again.' };
  }
}

export async function getTransactionById(
  id: string,
): Promise<{ transaction: Transaction | null; errorMessage: string | null }> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, branches(name, district, branch_code)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return { transaction: null, errorMessage: mapAuthError(error.message) };
    }
    if (!data) return { transaction: null, errorMessage: 'Transaction not found.' };

    const t = data as unknown as Transaction & { transaction_type?: TransactionType; type?: TransactionType };
    const effType = (t.type ?? t.transaction_type ?? 'transfer') as TransactionType;
    return {
      transaction: {
        ...t,
        type: effType,
        transaction_type: effType,
      },
      errorMessage: null,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[transactions] getTransactionById threw:', err);
    return { transaction: null, errorMessage: 'Something went wrong. Please try again.' };
  }
}

/**
 * Subscribe to new/updated transactions for the given account.
 */
export function subscribeToMyTransactions(
  myAccountId: string,
  cb: (t: Transaction) => void,
): () => void {
  const channelId = `txns:${myAccountId}:${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
      },
      (payload) => {
        const row = payload.new as Transaction;
        if (row.sender_account_id === myAccountId || row.receiver_account_id === myAccountId) {
          cb(row);
        }
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ---------- RPC Wrappers (Financial Operations) ----------

export type FinancialOpResult = {
  transaction: Transaction | null;
  errorMessage: string | null;
};

export type AppTransferParams = {
  recipientAccountNumber: string;
  amount: number;
  description?: string | null;
  idempotencyKey?: string | null;
};

/**
 * Execute atomic internal transfer (FR-TRF-01..13, design.md §5.1, TC-03, TC-08, TC-13).
 */
export async function appTransfer(params: AppTransferParams): Promise<FinancialOpResult> {
  try {
    const idempotencyKey = params.idempotencyKey || generateIdempotencyKey();
    const cleanAccount = params.recipientAccountNumber.trim().toUpperCase();
    const { data, error } = await supabase.rpc('app_transfer', {
      p_recipient_account_number: cleanAccount,
      p_amount: params.amount,
      p_description: params.description ?? null,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      // Graceful fallback to transfer_money (0003_functions.sql) if 0007 migration has not been applied yet
      if (error.code === 'PGRST202' || error.message?.includes('app_transfer')) {
        const fallback = await supabase.rpc('transfer_money', {
          p_recipient_account_number: cleanAccount,
          p_amount: params.amount,
          p_description: params.description ?? null,
        });
        if (fallback.error) return { transaction: null, errorMessage: mapRpcError(fallback.error.message) };
        return { transaction: fallback.data as Transaction, errorMessage: null };
      }
      return { transaction: null, errorMessage: mapRpcError(error.message) };
    }
    return { transaction: data as Transaction, errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[transactions] appTransfer threw:', err);
    return { transaction: null, errorMessage: 'Something went wrong. Please try again.' };
  }
}

/** Legacy alias for appTransfer */
export async function transferMoney(
  recipientAccountNumber: string,
  amount: number,
  description: string | null,
): Promise<FinancialOpResult> {
  return appTransfer({ recipientAccountNumber, amount, description });
}

export type AppWithdrawParams = {
  amount: number;
  idempotencyKey?: string | null;
};

/**
 * Execute atomic simulated withdrawal (FR-WD-01..06, design.md §5.2, TC-16, TC-17).
 */
export async function appWithdraw(params: AppWithdrawParams): Promise<FinancialOpResult> {
  try {
    const idempotencyKey = params.idempotencyKey || generateIdempotencyKey();
    const { data, error } = await supabase.rpc('app_withdraw', {
      p_amount: params.amount,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      // Graceful fallback to withdraw_funds (0003_functions.sql) if 0007 migration has not been applied yet
      if (error.code === 'PGRST202' || error.message?.includes('app_withdraw')) {
        const fallback = await supabase.rpc('withdraw_funds', {
          p_amount: params.amount,
        });
        if (fallback.error) return { transaction: null, errorMessage: mapRpcError(fallback.error.message) };
        return { transaction: fallback.data as Transaction, errorMessage: null };
      }
      return { transaction: null, errorMessage: mapRpcError(error.message) };
    }
    return { transaction: data as Transaction, errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[transactions] appWithdraw threw:', err);
    return { transaction: null, errorMessage: 'Something went wrong. Please try again.' };
  }
}

/** Legacy alias for appWithdraw */
export async function withdrawFunds(amount: number): Promise<FinancialOpResult> {
  return appWithdraw({ amount });
}

/**
 * Notice: Customer self-deposit is disabled under SRS v2.1 BR-01 / FR-DEP-01.
 * Deposits must be entered by an authorized teller at a branch.
 */
export async function depositFunds(_amount: number): Promise<FinancialOpResult> {
  return {
    transaction: null,
    errorMessage: 'Customer self-deposit is disabled. Cash deposits must be conducted through an authorized branch teller.',
  };
}