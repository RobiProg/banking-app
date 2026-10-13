import { supabase } from '../lib/supabase';
import { mapAuthError } from './auth';
import { mapRpcError } from './transactions';
import type { Account, AccountStatus, Profile, Transaction, TransactionType } from '../types/db';

// ---------- stats ----------

export type AdminStats = {
  totalUsers: number;
  totalAccounts: number;
  activeAccounts: number;
  totalTransactions: number;
};

export async function getAdminStats(): Promise<{ stats: AdminStats | null; errorMessage: string | null }> {
  try {
    const [users, accounts, activeAccounts, txns] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('accounts').select('id', { count: 'exact', head: true }),
      supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('transactions').select('id', { count: 'exact', head: true }),
    ]);

    const firstErr = users.error ?? accounts.error ?? activeAccounts.error ?? txns.error;
    if (firstErr) {
      return { stats: null, errorMessage: mapAuthError(firstErr.message) };
    }

    return {
      stats: {
        totalUsers: users.count ?? 0,
        totalAccounts: accounts.count ?? 0,
        activeAccounts: activeAccounts.count ?? 0,
        totalTransactions: txns.count ?? 0,
      },
      errorMessage: null,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[admin] getAdminStats threw:', err);
    return { stats: null, errorMessage: 'Something went wrong. Please try again.' };
  }
}

// ---------- users ----------

export type AdminUserRow = Profile & {
  account_number: string | null;
  account_status: AccountStatus | null;
  balance?: number | string | null;
};

export async function listUsers(
  query = '',
): Promise<{ users: AdminUserRow[]; errorMessage: string | null }> {
  try {
    let q = supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, created_at, accounts(account_number, status, balance)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (query.trim()) {
      const term = `%${query.trim()}%`;
      q = q.or(`full_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
    }
    const { data, error } = await q;
    if (error) return { users: [], errorMessage: mapAuthError(error.message) };

    type Joined = Profile & {
      accounts: Array<{ account_number: string; status: AccountStatus; balance?: number | string }> | { account_number: string; status: AccountStatus; balance?: number | string } | null;
    };
    const rows: AdminUserRow[] = ((data ?? []) as unknown as Joined[]).map((r) => {
      const acc = Array.isArray(r.accounts) ? r.accounts[0] : r.accounts;
      return {
        id: r.id,
        full_name: r.full_name,
        email: r.email,
        phone: r.phone,
        role: r.role,
        created_at: r.created_at,
        account_number: acc?.account_number ?? null,
        account_status: acc?.status ?? null,
        balance: acc?.balance ?? null,
      };
    });
    return { users: rows, errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[admin] listUsers threw:', err);
    return { users: [], errorMessage: 'Something went wrong. Please try again.' };
  }
}

export async function getUserById(
  id: string,
): Promise<{ user: AdminUserRow | null; errorMessage: string | null }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, created_at, accounts(account_number, status, balance)')
      .eq('id', id)
      .maybeSingle();
    if (error) return { user: null, errorMessage: mapAuthError(error.message) };
    if (!data) return { user: null, errorMessage: 'User not found.' };
    type Joined = Profile & {
      accounts: Array<{ account_number: string; status: AccountStatus; balance?: number | string }> | { account_number: string; status: AccountStatus; balance?: number | string } | null;
    };
    const joined = data as unknown as Joined;
    const acc = Array.isArray(joined.accounts) ? joined.accounts[0] : joined.accounts;
    return {
      user: {
        id: joined.id,
        full_name: joined.full_name,
        email: joined.email,
        phone: joined.phone,
        role: joined.role,
        created_at: joined.created_at,
        account_number: acc?.account_number ?? null,
        account_status: acc?.status ?? null,
        balance: acc?.balance ?? null,
      },
      errorMessage: null,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[admin] getUserById threw:', err);
    return { user: null, errorMessage: 'Something went wrong. Please try again.' };
  }
}

// ---------- accounts ----------

export type AdminAccountRow = Account & {
  full_name: string | null;
  email: string | null;
};

export async function listAccounts(
  query = '',
): Promise<{ accounts: AdminAccountRow[]; errorMessage: string | null }> {
  try {
    let q = supabase
      .from('accounts')
      .select('id, user_id, account_number, account_type, balance, status, created_at, profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (query.trim()) {
      const term = `%${query.trim()}%`;
      q = q.or(`account_number.ilike.${term}`);
    }
    const { data, error } = await q;
    if (error) return { accounts: [], errorMessage: mapAuthError(error.message) };
    type Joined = Account & {
      profiles: Array<{ full_name: string; email: string }> | { full_name: string; email: string } | null;
    };
    const rows: AdminAccountRow[] = ((data ?? []) as unknown as Joined[]).map((r) => {
      const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return {
        ...r,
        full_name: p?.full_name ?? null,
        email: p?.email ?? null,
      };
    });
    return { accounts: rows, errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[admin] listAccounts threw:', err);
    return { accounts: [], errorMessage: 'Something went wrong. Please try again.' };
  }
}

export async function adminUpdateAccountStatus(
  accountId: string,
  status: AccountStatus,
): Promise<{ account: Account | null; errorMessage: string | null }> {
  try {
    const { data, error } = await supabase.rpc('admin_update_account_status', {
      p_account_id: accountId,
      p_status: status,
    });
    if (error) return { account: null, errorMessage: mapRpcError(error.message) };
    return { account: data as Account, errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[admin] adminUpdateAccountStatus threw:', err);
    return { account: null, errorMessage: 'Something went wrong. Please try again.' };
  }
}

// ---------- transactions ----------

export type AdminTxnFilters = {
  type?: TransactionType;
  status?: Transaction['status'];
  search?: string;
};

export async function listAllTransactions(
  filters: AdminTxnFilters = {},
  limit = 200,
): Promise<{ transactions: Transaction[]; errorMessage: string | null }> {
  try {
    let q = supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (filters.type) q = q.eq('transaction_type', filters.type);
    if (filters.status) q = q.eq('status', filters.status);
    // Note: search by account_number requires a join; we keep this simple
    // and let the admin use the transaction id instead.
    if (filters.search && filters.search.trim()) {
      q = q.or(`id.eq.${filters.search.trim()},description.ilike.%${filters.search.trim()}%`);
    }
    const { data, error } = await q;
    if (error) return { transactions: [], errorMessage: mapAuthError(error.message) };
    return { transactions: (data as Transaction[]) ?? [], errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[admin] listAllTransactions threw:', err);
    return { transactions: [], errorMessage: 'Something went wrong. Please try again.' };
  }
}