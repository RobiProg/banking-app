/**
 * Database row types. These mirror the Supabase schema in
 * `supabase/migrations/0001_schema.sql` 1:1.
 *
 * Keep these as the single source of truth for service return types
 * so screens can stay strongly typed without re-importing generated types.
 */

export type UserRole = 'customer' | 'admin';

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
};

export type AccountStatus = 'active' | 'inactive' | 'blocked';
export type AccountType = 'savings';

export type Account = {
  id: string;
  user_id: string;
  account_number: string;
  account_type: AccountType;
  /** Decimal string — Supabase returns NUMERIC as a string. */
  balance: string;
  status: AccountStatus;
  created_at: string;
};

export type TransactionType = 'deposit' | 'withdrawal' | 'transfer';
export type TransactionStatus = 'completed' | 'failed';

export type Transaction = {
  id: string;
  sender_account_id: string | null;
  receiver_account_id: string | null;
  /** Decimal string — Supabase returns NUMERIC as a string. */
  amount: string;
  transaction_type: TransactionType;
  description: string | null;
  status: TransactionStatus;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

/**
 * Direction helper — used by transaction lists/details.
 *  - 'credit' = money came INTO the user's account
 *  - 'debit'  = money went OUT of the user's account
 *  - 'neutral'= neither (shouldn't happen for customer-facing txn)
 */
export type TxnDirection = 'credit' | 'debit' | 'neutral';

export function txnDirection(
  t: Pick<Transaction, 'transaction_type' | 'sender_account_id' | 'receiver_account_id'>,
  myAccountId: string | null | undefined,
): TxnDirection {
  if (!myAccountId) return 'neutral';
  if (t.transaction_type === 'deposit') return 'credit';
  if (t.transaction_type === 'withdrawal') return 'debit';
  if (t.transaction_type === 'transfer') {
    if (t.receiver_account_id === myAccountId) return 'credit';
    if (t.sender_account_id === myAccountId) return 'debit';
  }
  return 'neutral';
}

/**
 * Parse a NUMERIC-string balance into a number for client-side math
 * (e.g. showing "max ৳X,XXX" hint on the withdraw screen). We never
 * round-trip back to a string for display — use `formatBDT` for that.
 */
export function parseAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}