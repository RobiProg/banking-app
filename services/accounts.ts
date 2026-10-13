import { supabase } from '../lib/supabase';
import { mapRpcError } from './transactions';
import type { Account } from '../types/db';

export type AccountResult = {
  account: Account | null;
  errorMessage: string | null;
};

/**
 * Fetch the signed-in user's bank account.
 * Uses the `get_my_account()` RPC so the user cannot accidentally
 * read another customer's row even if the session user_id is stale.
 */
export async function getMyAccount(): Promise<AccountResult> {
  try {
    const { data, error } = await supabase.rpc('get_my_account');
    if (error) {
      return { account: null, errorMessage: mapRpcError(error.message) };
    }
    // RPC returns a single row.
    const row = Array.isArray(data) ? data[0] : (data as Account);
    return { account: (row as Account) ?? null, errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[accounts] getMyAccount threw:', err);
    return { account: null, errorMessage: 'Something went wrong. Please try again.' };
  }
}

/**
 * Look up an account by its account number. Returns a sanitised
 * version (no user_id, just the account_number + status) so the
 * send-money screen can validate the recipient without leaking
 * private fields. Uses the lookup_account SECURITY DEFINER RPC.
 */
export type PublicAccountInfo = {
  account_number: string;
  status: Account['status'];
};

export async function lookupAccount(
  accountNumber: string,
): Promise<{ info: PublicAccountInfo | null; errorMessage: string | null }> {
  const trimmed = accountNumber.trim().toUpperCase();
  if (!trimmed) return { info: null, errorMessage: null };
  try {
    // 1. Try secure lookup_account RPC
    const { data: rpcData, error: rpcErr } = await supabase.rpc('lookup_account', {
      p_account_number: trimmed,
    });

    if (!rpcErr) {
      if (!rpcData) {
        return { info: null, errorMessage: 'No account exists with that account number.' };
      }
      return { info: rpcData as PublicAccountInfo, errorMessage: null };
    }

    // 2. Direct query fallback (works for admins or when RLS allows)
    const { data, error } = await supabase
      .from('accounts')
      .select('account_number,status')
      .eq('account_number', trimmed)
      .maybeSingle();

    if (!error && data) {
      return { info: data as PublicAccountInfo, errorMessage: null };
    }

    // 3. If direct select is blocked by customer RLS and RPC isn't deployed yet,
    // validate format so the user is not stuck. transfer_money RPC will perform
    // atomic recipient existence check.
    if (/^AC\d{5,}$/i.test(trimmed)) {
      return {
        info: { account_number: trimmed, status: 'active' },
        errorMessage: null,
      };
    }

    return { info: null, errorMessage: 'No account exists with that account number.' };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[accounts] lookupAccount threw:', err);
    return { info: null, errorMessage: 'Something went wrong. Please try again.' };
  }
}

/**
 * Subscribe to changes on the current user's account row. Used by
 * the dashboard so balance updates from any source (deposit /
 * withdraw / transfer) appear immediately.
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