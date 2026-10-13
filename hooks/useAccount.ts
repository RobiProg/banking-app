import { useCallback, useEffect, useState } from 'react';
import { getMyAccount, subscribeToMyAccount } from '../services/accounts';
import type { Account } from '../types/db';

type State = {
  account: Account | null;
  loading: boolean;
  errorMessage: string | null;
};

/**
 * Load the signed-in user's account and re-render whenever it
 * changes (via Supabase Realtime). Used by the dashboard, deposit,
 * withdraw, and send-money screens so balance updates appear
 * immediately without a manual refresh.
 */
export function useAccount(): State & { reload: () => Promise<void> } {
  const [state, setState] = useState<State>({
    account: null,
    loading: true,
    errorMessage: null,
  });

  const loadAndSubscribe = useCallback(async () => {
    const result = await getMyAccount();
    if (result.errorMessage || !result.account) {
      return {
        account: null,
        errorMessage: result.errorMessage,
        unsubscribe: null as (() => void) | null,
      };
    }
    const unsubscribe = subscribeToMyAccount(result.account.id, (a) => {
      // Only re-render if the balance or status actually changed.
      setState((prev) => {
        if (
          prev.account &&
          prev.account.balance === a.balance &&
          prev.account.status === a.status
        ) {
          return prev;
        }
        return { ...prev, account: a };
      });
    });
    return { account: result.account, errorMessage: null, unsubscribe };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    setState((s) => ({ ...s, loading: true }));
    loadAndSubscribe().then((res) => {
      if (cancelled) {
        res.unsubscribe?.();
        return;
      }
      unsubscribe = res.unsubscribe;
      setState({
        account: res.account,
        loading: false,
        errorMessage: res.account ? null : (res.errorMessage ?? 'Account not found.'),
      });
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [loadAndSubscribe]);

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const result = await getMyAccount();
    setState({
      account: result.account,
      loading: false,
      errorMessage: result.errorMessage,
    });
  }, []);

  return { ...state, reload };
}