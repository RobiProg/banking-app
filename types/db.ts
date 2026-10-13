/**
 * Database row types. These mirror the Supabase schema in
 * `supabase/migrations/0007_srs_v2_alignment.sql` 1:1.
 *
 * Keep these as the single source of truth for service return types
 * so screens can stay strongly typed without re-importing generated types.
 */

export type UserRole = 'customer' | 'teller' | 'admin';

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
};

export type Branch = {
  id: string;
  branch_code: string;
  name: string;
  district: string;
  address: string | null;
  routing_code: string | null;
  is_active: boolean;
  created_at: string;
};

export type AccountStatus = 'active' | 'inactive' | 'blocked';
export type AccountType = 'savings';

export type Account = {
  id: string;
  user_id: string;
  branch_id?: string | null;
  branch?: Branch | null;
  account_number: string;
  account_type: AccountType;
  /** Decimal string — Supabase returns NUMERIC(18,2) as a string. */
  balance: string;
  status: AccountStatus;
  created_at: string;
};

export type TransactionType = 'deposit' | 'withdrawal' | 'transfer';
export type TransactionStatus = 'completed' | 'failed';

export type Transaction = {
  id: string;
  reference: string;
  sender_account_id: string | null;
  receiver_account_id: string | null;
  /** Decimal string — Supabase returns NUMERIC(18,2) as a string. */
  amount: string;
  type: TransactionType;
  transaction_type: TransactionType; // dual-field for backward compatibility
  branch_id: string | null;
  description: string | null;
  status: TransactionStatus;
  initiated_by?: string | null;
  idempotency_key?: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  related_transaction_id?: string | null;
  is_read: boolean;
  created_at: string;
};

export type AuditLog = {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type RecipientLookupInfo = {
  account_number: string;
  masked_account_number: string;
  abbreviated_name: string;
  account_type: AccountType;
  branch_name: string;
  district: string;
  status: AccountStatus;
  eligible: boolean;
};

/**
 * Direction helper — used by transaction lists/details.
 *  - 'credit' = money came INTO the user's account
 *  - 'debit'  = money went OUT of the user's account
 *  - 'neutral'= neither (shouldn't happen for customer-facing txn)
 */
export type TxnDirection = 'credit' | 'debit' | 'neutral';

export function txnDirection(
  t: Pick<Transaction, 'sender_account_id' | 'receiver_account_id'> & {
    type?: TransactionType;
    transaction_type?: TransactionType;
  },
  myAccountId: string | null | undefined,
): TxnDirection {
  if (!myAccountId) return 'neutral';
  const effectiveType = t.type ?? t.transaction_type;
  if (effectiveType === 'deposit') return 'credit';
  if (effectiveType === 'withdrawal') return 'debit';
  if (effectiveType === 'transfer') {
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