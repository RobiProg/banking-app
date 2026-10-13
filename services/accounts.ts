import { supabase } from '../lib/supabase';
import { mapRpcError } from './transactions';
import type { Account, Branch, RecipientLookupInfo } from '../types/db';

export type AccountResult = {
  account: Account | null;
  errorMessage: string | null;
};

/**
 * Fetch the signed-in user's bank account with linked branch details.
 * (FR-ACC-01, FR-ACC-03, FR-BR-01)
 */
export async function getMyAccount(): Promise<AccountResult> {
  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return { account: null, errorMessage: 'Please sign in to view your account.' };
    }

    const { data, error } = await supabase
      .from('accounts')
      .select('id, user_id, branch_id, account_number, account_type, balance, status, created_at, branches(*)')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (error) {
      // Fallback to RPC if RLS select was constrained
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_my_account');
      if (rpcErr) {
        return { account: null, errorMessage: mapRpcError(rpcErr.message) };
      }
      const row = Array.isArray(rpcData) ? rpcData[0] : (rpcData as Account);
      return { account: (row as Account) ?? null, errorMessage: null };
    }

    if (!data) {
      // Try self-healing profile and account creation
      const { error: healErr } = await supabase.rpc('ensure_user_profile');
      if (!healErr) {
        const retry = await supabase
          .from('accounts')
          .select('id, user_id, branch_id, account_number, account_type, balance, status, created_at, branches(*)')
          .eq('user_id', userData.user.id)
          .maybeSingle();
        if (retry.data) {
          const joined = retry.data as unknown as Account & { branches: Branch | null };
          return {
            account: {
              ...joined,
              branch: joined.branches ?? null,
            },
            errorMessage: null,
          };
        }
      }
      return { account: null, errorMessage: 'No bank account found. Please contact support.' };
    }

    type JoinedAccount = Account & { branches: Branch | null };
    const joined = data as unknown as JoinedAccount;
    return {
      account: {
        ...joined,
        branch: joined.branches ?? null,
      },
      errorMessage: null,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[accounts] getMyAccount threw:', err);
    return { account: null, errorMessage: 'Something went wrong. Please try again.' };
  }
}

/**
 * Look up a recipient account for Send Money (FR-TRF-02, NFR-SEC-05, TC-21).
 * Returns verified confirmation details with minimal disclosure:
 *  - Abbreviated name (e.g. "Md. R***")
 *  - Masked account number ("••••••4821")
 *  - Branch name & district
 *  - Account eligibility
 * Never exposes the recipient's full legal name or user_id.
 */
export async function lookupRecipient(
  accountNumber: string,
): Promise<{ info: RecipientLookupInfo | null; errorMessage: string | null }> {
  const trimmed = accountNumber.trim().toUpperCase();
  if (!trimmed) return { info: null, errorMessage: null };
  try {
    const { data, error } = await supabase.rpc('lookup_recipient', {
      p_account_number: trimmed,
    });

    if (error) {
      return { info: null, errorMessage: mapRpcError(error.message) };
    }

    if (!data) {
      return { info: null, errorMessage: 'No SmartBank account found for that number.' };
    }

    return { info: data as RecipientLookupInfo, errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[accounts] lookupRecipient threw:', err);
    return { info: null, errorMessage: 'Something went wrong. Please try again.' };
  }
}

/**
 * Backward compatibility alias for lookupRecipient.
 */
export async function lookupAccount(
  accountNumber: string,
): Promise<{
  info: { account_number: string; status: Account['status']; abbreviated_name?: string; branch_name?: string } | null;
  errorMessage: string | null;
}> {
  const res = await lookupRecipient(accountNumber);
  if (res.errorMessage || !res.info) {
    return { info: null, errorMessage: res.errorMessage };
  }
  return {
    info: {
      account_number: res.info.account_number,
      status: res.info.status,
      abbreviated_name: res.info.abbreviated_name,
      branch_name: res.info.branch_name,
    },
    errorMessage: null,
  };
}

/**
 * Subscribe to changes on the current user's account row. Used by
 * the dashboard so balance updates from any source (transfer /
 * withdraw / deposit) appear immediately.
 */
export function subscribeToMyAccount(
  myAccountId: string,
  cb: (a: Account) => void,
): () => void {
  const channelId = `account:${myAccountId}:${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'accounts', filter: `id=eq.${myAccountId}` },
      (payload) => cb(payload.new as Account),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}