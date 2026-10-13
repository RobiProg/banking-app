# SmartBank — Supabase setup

This folder holds the SQL migrations that create the SmartBank database, RLS policies, atomic financial RPCs, signup trigger, and seed admin.

## How to run

1. Open your Supabase project dashboard: **https://supabase.com/dashboard**.
2. In the left sidebar, click **SQL Editor → New query**.
3. Paste the contents of `migrations/0001_schema.sql` and click **Run**.
4. Repeat for each file **in numerical order**:
   - `0001_schema.sql` — tables
   - `0002_rls.sql` — row-level security policies
   - `0003_functions.sql` — atomic RPCs (`deposit_funds`, `withdraw_funds`, `transfer_money`, `admin_update_account_status`, `is_admin`)
   - `0004_triggers.sql` — auto-create profile + savings account on signup
   - `0005_seed_admin.sql` — promote an existing user to admin
   - `0006_fix_missing_profiles.sql` — fixes "Almost there" error, backfills existing users without profiles/accounts
   - `0007_srs_v2_alignment.sql` — **SRS v2.1 alignment**: branches, audit_logs, NUMERIC(18,2), atomic RPCs (`app_transfer`, `app_withdraw`, `app_deposit`, `lookup_recipient`), and RLS hardening.
5. Optionally run `seed.sql` to populate demo balances and branch adjustments.
6. After running the migrations, register your admin user **first** by signing up in the app with the email you'll use as admin. Then open `0005_seed_admin.sql` (or `seed.sql`), change `admin_email` to that address, and run it.
7. Use the verification queries inside `0007_srs_v2_alignment.sql` to confirm everything is wired up correctly.

## What is created

| Object | Purpose |
|---|---|
| `public.profiles` | One row per user; carries `role` (customer/admin) and editable name/phone. |
| `public.accounts` | One savings account per user. Balance is `numeric(15,2)`, never negative. |
| `public.transactions` | Audit log. Created only by RPCs. |
| `public.notifications` | In-app notifications. Created by RPCs and marked read by the customer. |
| `accounts_account_number_seq` | PostgreSQL sequence; the trigger mints account numbers like `AC1000000001`. |
| `public.is_admin()` | SECURITY DEFINER helper used in every RLS policy. |
| `public.deposit_funds(p_amount)` | Atomic deposit; returns the new transaction row. |
| `public.withdraw_funds(p_amount)` | Atomic withdrawal with balance check. |
| `public.transfer_money(recipient_account_number, amount, description)` | Atomic two-account transfer using `SELECT ... FOR UPDATE` deadlock prevention. |
| `public.admin_update_account_status(account_id, status)` | Admin-only status change. |
| `on_auth_user_created` trigger | On every signup, automatically creates a profile (role=customer) and a savings account with a fresh account number. |

## RPC error codes (used by the client `mapRpcError`)

When a financial RPC raises an exception, it always uses one of these stable `errcode = 'P0001'` exceptions with one of these `hint` strings. The React Native client matches on the exception's `message` (the bare code) and the `hint` text:

| Code | Hint | Client message |
|---|---|---|
| `invalid_amount` | Amount must be greater than zero. | "Please enter a valid amount." |
| `no_account` | No bank account is linked to your profile yet. | "No bank account found. Please contact support." |
| `account_inactive` | Account status is X. | "Your account is inactive." |
| `recipient_not_found` | No account exists with that account number. | "Recipient account not found." |
| `recipient_inactive` | The recipient account is not active. | "Recipient account is inactive." |
| `self_transfer` | You cannot transfer money to your own account. | "You cannot transfer to your own account." |
| `insufficient_balance` | You do not have enough balance… | "Insufficient balance." |
| `not_authorized` | Only admins can… | "You are not authorized to perform this action." |
| `invalid_status` | Status must be active/inactive/blocked. | "Invalid status." |
| `account_not_found` | — | "Account not found." |

Anything else falls back to: "Something went wrong. Please try again."

## Security guarantees

- **No client balance writes**: RLS on `public.accounts` blocks UPDATE for non-admins. All balance changes go through `SECURITY DEFINER` RPCs.
- **No client transaction inserts**: RLS on `public.transactions` blocks INSERT for clients. Transactions are produced only by RPCs.
- **No client profile/notification inserts**: rows are created by the trigger or RPCs.
- **Atomic transfers**: `transfer_money` locks both account rows in a deterministic order, validates balance again after the lock, then commits. Partial state is impossible.
- **Customer isolation**: every SELECT policy includes `auth.uid() = user_id` (or the equivalent account-owner check for transactions). One customer cannot read another's data.
- **No service-role key in the app**: the app uses only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.