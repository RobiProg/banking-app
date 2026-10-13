import { useCallback, useEffect, useState } from 'react';
import { listTransactions, subscribeToMyTransactions } from '../services/transactions';
import type { Transaction, TransactionType } from '../types/db';

type State = {
  transactions: Transaction[];
  loading: boolean;
  errorMessage: string | null;
  filter: TransactionType | 'all';
};

/**
 * Load transactions scoped to the signed-in user's account and
 * subscribe to new ones via Supabase Realtime. Used by the customer
 * dashboard's recent-transactions preview and the transactions tab.
 */
export function useTransactions(opts?: {
  initialFilter?: TransactionType | 'all';
  limit?: number;
  /** When provided, only live updates for THIS account are surfaced. */
  myAccountId?: string | null;
  autoLoad?: boolean;
}): State & { setFilter: (f: TransactionType | 'all') => void; reload: () => Promise<void> } {
  const [filter, setFilter] = useState<TransactionType | 'all'>(opts?.initialFilter ?? 'all');
  const [state, setState] = useState<State>({
    transactions: [],
    loading: opts?.autoLoad !== false,
    errorMessage: null,
    filter,
  });

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const res = await listTransactions({
      type: filter === 'all' ? undefined : filter,
      limit: opts?.limit,
    });
    setState({
      transactions: res.transactions,
      loading: false,
      errorMessage: res.errorMessage,
      filter,
    });
  }, [filter, opts?.limit]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    reload();

    if (opts?.myAccountId) {
      unsubscribe = subscribeToMyTransactions(opts.myAccountId, () => {
        if (cancelled) return;
        reload();
      });
    }

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, opts?.myAccountId]);

  return { ...state, setFilter, reload };
}