import { supabase } from '../lib/supabase';
import { mapAuthError } from './auth';
import type { Transaction, TransactionType } from '../types/db';

/**
 * Map raw RPC error text to a friendly user-facing message.
 *
 * The SmartBank RPCs raise Postgres exceptions with stable `message`
 * codes like `insufficient_balance`, `invalid_amount`, etc. (See
 * `supabase/README.md` for the full list.) We match on those codes,
 * with a substring fallback for the rare case Supabase wraps them
 * differently.
 */
export function mapRpcError(raw: string): string {
  const code = raw.toLowerCase();
  if (code.includes('invalid_amount')) return 'Please enter a valid amount.';
  if (code.includes('insufficient_balance')) return 'Insufficient balance.';
  if (code.includes('no_account')) return 'No bank account found. Please contact support.';
  if (code.includes('account_inactive')) return 'Your account is inactive.';
  if (code.includes('recipient_inactive')) return 'Recipient account is inactive.';
  if (code.includes('recipient_not_found')) return 'Recipient account not found.';
  if (code.includes('self_transfer')) return 'You cannot transfer to your own account.';
  if (code.includes('not_authorized')) return 'You are not authorized to perform this action.';
  if (code.includes('invalid_status')) return 'Invalid status.';
  if (code.includes('account_not_found')) return 'Account not found.';
  // Network / generic
  if (
    code.includes('network') ||
    code.includes('fetch') ||
    code.includes('timeout') ||
    code.includes('failed to fetch') ||
    code.includes('aborted')
  ) {
    return "We couldn't reach the server. Check your connection and try again.";
  }
  return mapAuthError(raw);
}

// ---------- query helpers ----------

export type ListTxnsParams = {
  /** When provided, restricts results to transactions where the
   *  signed-in user's account is sender OR receiver. Always used by
   *  the customer tabs. */
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
      .select('*')
      .order('created_at', { ascending: false })
      .limit(params.limit ?? 100);

    if (params.type) q = q.eq('transaction_type', params.type);

    const { data, error } = await q;
    if (error) {
      return { transactions: [], errorMessage: mapAuthError(error.message) };
    }
    return { transactions: (data as Transaction[]) ?? [], errorMessage: null };
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
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      return { transaction: null, errorMessage: mapAuthError(error.message) };
    }
    return { transaction: (data as Transaction) ?? null, errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[transactions] getTransactionById threw:', err);
    return { transaction: null, errorMessage: 'Something went wrong. Please try again.' };
  }
}

/**
 * Subscribe to new/updated transactions for the given account.
 * Used by the customer transactions tab.
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

// ---------- RPC wrappers (financial ops) ----------

export type FinancialOpResult = {
  transaction: Transaction | null;
  errorMessage: string | null;
};

export async function depositFunds(amount: number): Promise<FinancialOpResult> {
  try {
    const { data, error } = await supabase.rpc('deposit_funds', { p_amount: amount });
    if (error) return { transaction: null, errorMessage: mapRpcError(error.message) };
    return { transaction: data as Transaction, errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[transactions] depositFunds threw:', err);
    return { transaction: null, errorMessage: 'Something went wrong. Please try again.' };
  }
}

export async function withdrawFunds(amount: number): Promise<FinancialOpResult> {
  try {
    const { data, error } = await supabase.rpc('withdraw_funds', { p_amount: amount });
    if (error) return { transaction: null, errorMessage: mapRpcError(error.message) };
    return { transaction: data as Transaction, errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[transactions] withdrawFunds threw:', err);
    return { transaction: null, errorMessage: 'Something went wrong. Please try again.' };
  }
}

export async function transferMoney(
  recipientAccountNumber: string,
  amount: number,
  description: string | null,
): Promise<FinancialOpResult> {
  try {
    const { data, error } = await supabase.rpc('transfer_money', {
      p_recipient_account_number: recipientAccountNumber,
      p_amount: amount,
      p_description: description,
    });
    if (error) return { transaction: null, errorMessage: mapRpcError(error.message) };
    return { transaction: data as Transaction, errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[transactions] transferMoney threw:', err);
    return { transaction: null, errorMessage: 'Something went wrong. Please try again.' };
  }
}