# SmartBank — Comprehensive Project Implementation Plan (SRS v2.1 Alignment)

**Companion Documents:**
- Software Requirements Specification (SRS) v2.1 (*Realistic Money Flow and Branch-Aware Transfers*)
- SmartBank Technical Design Document (`design.md`)
- Google Stitch Design Prompt Specification (`DESIGN_PROMPT.md`)

---

## 1. Executive Summary & Architectural Overview

SmartBank is an educational digital banking simulation built for a university App Development project. It simulates core retail banking concepts—branch-aware accounts, internal peer-to-peer transfers, simulated ATM/branch withdrawals, teller branch cash deposits, transaction auditing, and administrative management—without connecting to real banking rails, payment gateways, or handling real money.

### Core Stack & System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│             React Native + Expo Client (Mobile)             │
│                                                             │
│   UI Screens ──► Feature Hooks ──► Typed RPC / Services     │
│   (Inter / Outfit UI, Glassmorphism, Tabular Nums for ৳)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS (Public Anon Key + JWT)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Supabase Backend & PostgreSQL               │
│                                                             │
│  • PostgREST : Read-only queries strictly bounded by RLS   │
│  • RPCs      : Server-side SECURITY DEFINER atomic routines │
│                (app_transfer, app_withdraw, app_deposit,    │
│                 lookup_recipient) with SELECT FOR UPDATE    │
│  • Tables    : profiles, branches, accounts, transactions,  │
│                notifications, audit_logs                    │
└─────────────────────────────────────────────────────────────┘
```

- **Client Framework**: React Native + Expo (v57) with Expo Router (file-based navigation).
- **Backend & Database**: Supabase (PostgreSQL 15+, Supabase Auth, Row Level Security, PL/pgSQL RPCs).
- **Security Boundary**: The client is never trusted for financial operations, balances, or role permissions. Balance-changing logic lives entirely in server-side PostgreSQL functions (`SECURITY DEFINER`). The Supabase service-role key is never included in the mobile client.
- **Currency**: Bangladeshi Taka (৳), stored as `NUMERIC(18,2)` (never floating point).

---

## 2. Key Scope & Business Rules (SRS v2.1 & Design Document)

| Rule ID | Rule Summary | Implementation Mechanism |
| :--- | :--- | :--- |
| **BR-01 / FR-DEP-01** | **No Customer Self-Deposit** | Customers cannot type an amount and increase their own balance. Customer deposit UI is removed. |
| **BR-02 / FR-TRF-01** | **Internal Transfers Only** | Customer money movement is strictly peer-to-peer between valid SmartBank accounts. |
| **BR-03 / FR-TRF-02** | **Branch-Aware Recipient Lookup** | Sender enters account number; backend looks up recipient returning *abbreviated name* (e.g. `Md. R***`), masked account number (`••••••4821`), branch name, and district. Full legal name is never exposed (blunting enumeration). |
| **BR-04 / FR-ACC-04** | **Eligibility & Status Control** | Both sender and recipient must have `active` status. Inactive or blocked accounts cannot send, receive, withdraw, or deposit. |
| **BR-05 / FR-TRF-13** | **Strict Amount & Balance Validation** | Amount must be positive, max 2 decimal places (`round(amount, 2) = amount`), within configurable per-transfer limit, and sender balance must be >= amount. |
| **BR-06 / BR-07** | **Zero Transfer Fee** | Sender debited and recipient credited exact equal amounts. |
| **BR-08 / NFR-INT-02** | **Idempotent Operations** | Every money action generates a client UUID `idempotency_key` on confirm sheet open. Replaying an identical key returns the original transaction record without double processing. |
| **BR-10 / FR-DEP-02** | **Staff-Only Branch Deposits** | Simulated cash deposits can only be performed by authorized staff (`teller` or `admin`) recording receiving branch, operator ID, and cash confirmation. |
| **BR-12 / FR-ACC-02** | **Single Account per User** | Each customer owns exactly one Savings account in v2.1. Self-transfers (`recipient = sender`) are rejected with `SELF_TRANSFER`. |
| **FR-WD-05 / FR-WD-06** | **Simulated Withdrawals** | Customer withdrawal is simulated; UI explicitly clarifies no physical cash is dispensed. Atomically debits balance, logs audit record, and triggers notification. |
| **FR-ADM-09 / TC-22** | **Role Provisioning Security** | Public registration defaults to `customer`. Elevated roles (`admin`, `teller`) are seeded in DB or granted by an existing admin via trusted server actions. Client cannot self-promote. |

---

## 3. Gap Analysis: Current Codebase vs. SRS v2.1 & design.md

A comprehensive audit of the active repository reveals the following gaps to be addressed:

```
[!] Current Gap 1: Schema Inconsistencies
    - Missing 'branches' and 'audit_logs' tables.
    - 'accounts' table is missing 'branch_id' foreign key and uses numeric(15,2) instead of numeric(18,2).
    - 'transactions' table uses 'transaction_type' instead of 'type', lacks 'reference', 'idempotency_key', 'branch_id', and 'initiated_by'.
    - 'profiles' lacks 'teller' role enum.
    - 'notifications' lacks 'related_transaction_id' foreign key.

[!] Current Gap 2: Insecure / Deprecated RPC Functions
    - 'deposit_funds' allows customer self-deposit (violates BR-01 / FR-DEP-01).
    - 'transfer_money' lacks idempotency checking, dead-lock prevention row ordering, audit logging, and branch association.
    - Missing 'lookup_recipient' RPC returning minimal disclosure fields (abbreviated name, masked account, branch).
    - Missing 'app_withdraw' and staff 'app_deposit' RPCs.

[!] Current Gap 3: Client UI Inconsistencies
    - Customer QuickActions & navigation contains a "Deposit" button and 'app/(customer)/deposit.tsx' screen.
    - 'send-money.tsx' does not show branch details or abbreviated recipient name preview.
    - 'withdraw.tsx' lacks the required disclaimer stating no physical cash is dispensed.
    - Missing Password Reset flow ('app/(auth)/reset-password.tsx') required by FR-AUTH-04 & TC-19.
    - Admin dashboard lacks Branch Management ('branches.tsx') and Staff Branch Deposit ('deposit.tsx').
```

---

## 4. Database Architecture & Migration Plan

A dedicated migration file `supabase/migrations/0007_srs_v2_alignment.sql` will be created to cleanly upgrade the schema and functions to the SRS v2.1 specification while preserving database integrity.

### 4.1 Schema DDL

```sql
-- 1. ENUMS
do $$ begin
  create type user_role as enum ('customer', 'teller', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_status as enum ('active', 'inactive', 'blocked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type txn_type as enum ('transfer', 'withdrawal', 'deposit');
exception when duplicate_object then null; end $$;

do $$ begin
  create type txn_status as enum ('completed', 'failed');
exception when duplicate_object then null; end $$;

-- 2. BRANCHES TABLE
create table if not exists public.branches (
  id            uuid primary key default gen_random_uuid(),
  branch_code   text unique not null,
  name          text not null,
  district      text not null,
  address       text,
  routing_code  text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- 3. AUDIT LOGS TABLE
create table if not exists public.audit_logs (
  id             uuid primary key default gen_random_uuid(),
  actor_user_id  uuid references public.profiles(id),
  action         text not null,
  target_type    text,
  target_id      uuid,
  metadata       jsonb,
  created_at     timestamptz not null default now()
);

-- 4. ACCOUNTS TABLE ENHANCEMENTS
alter table public.accounts
  add column if not exists branch_id uuid references public.branches(id),
  alter column balance type numeric(18,2);

create unique index if not exists one_account_per_user on public.accounts(user_id);

-- 5. TRANSACTIONS TABLE ENHANCEMENTS
alter table public.transactions
  add column if not exists reference text unique,
  add column if not exists type txn_type not null default 'transfer',
  add column if not exists branch_id uuid references public.branches(id),
  add column if not exists initiated_by uuid references public.profiles(id),
  add column if not exists idempotency_key text,
  alter column amount type numeric(18,2);

create unique index if not exists uniq_idempotency on public.transactions(idempotency_key)
  where idempotency_key is not null;

-- 6. NOTIFICATIONS ENHANCEMENTS
alter table public.notifications
  add column if not exists related_transaction_id uuid references public.transactions(id);
```

### 4.2 Reference Number Generator

```sql
create or replace function public.gen_reference()
returns text language sql as $$
  select 'TXN-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
$$;
```

### 4.3 Server-Side Financial RPCs

1. **`lookup_recipient(p_account_number text)`**:
   - Validates format and account existence.
   - Formats abbreviated name (e.g. `Md. R***`) from recipient profile.
   - Masks account number (e.g. `••••••4821`).
   - Retrieves recipient branch name & district.
   - Verifies recipient account status is `active`.
   - Returns `{ abbreviated_name, masked_account_number, account_type, branch_name, district, eligible }`.
   - Never exposes full legal name or `user_id`.

2. **`app_transfer(p_recipient_account_number text, p_amount numeric, p_description text, p_idempotency_key text)`**:
   - **Step 0 (Idempotency)**: If `p_idempotency_key` exists in `transactions`, return that row immediately.
   - **Step 1 (Amount validation)**: Ensure `p_amount > 0` and `p_amount = round(p_amount, 2)` and `p_amount <= 500000.00` (configurable limit).
   - **Step 2 (Row locking)**: Lock sender and recipient account rows using `SELECT ... FOR UPDATE` in deterministic order (by `id`) to prevent deadlock.
   - **Step 3 (Business rule assertions)**:
     - Verify sender exists and `status = 'active'`.
     - Verify recipient exists and `status = 'active'`.
     - Verify `recipient.id <> sender.id` (`SELF_TRANSFER`).
     - Verify `sender.balance >= p_amount` (`INSUFFICIENT_FUNDS`).
   - **Step 4 (Atomic Ledger Update)**:
     - Decrement sender balance: `balance = balance - p_amount`.
     - Increment recipient balance: `balance = balance + p_amount`.
   - **Step 5 (Audit & Notifications)**:
     - Insert transaction row with `reference = gen_reference()`, `type = 'transfer'`, `status = 'completed'`, `initiated_by = auth.uid()`.
     - Insert audit log row with action `transfer`.
     - Insert notification for recipient (`Money received`) and sender (`Transfer sent`).
     - Return completed transaction.

3. **`app_withdraw(p_amount numeric, p_idempotency_key text)`**:
   - Checks idempotency key.
   - Validates amount (> 0, 2 decimal places, within daily/transaction limit).
   - Locks caller account (`SELECT ... FOR UPDATE`).
   - Verifies active status and sufficient balance.
   - Debits balance: `balance = balance - p_amount`.
   - Inserts transaction with `type = 'withdrawal'`, `sender_account_id = account.id`, `receiver_account_id = null`.
   - Inserts audit log and in-app notification.

4. **`app_deposit(p_target_account_number text, p_branch_id uuid, p_amount numeric, p_reference_note text, p_idempotency_key text)`**:
   - Role check: Caller must have `role in ('teller', 'admin')` (raises `NOT_AUTHORIZED`).
   - Checks idempotency key.
   - Validates target account exists and is `active`.
   - Validates branch exists and is `is_active = true`.
   - Locks target account (`SELECT ... FOR UPDATE`).
   - Credits balance: `balance = balance + p_amount`.
   - Inserts transaction with `type = 'deposit'`, `sender_account_id = null`, `receiver_account_id = target.id`, `branch_id = p_branch_id`.
   - Inserts audit log with actor ID, branch ID, and note.
   - Inserts notification for recipient customer.

5. **Revoke customer self-deposit**:
   - Drop or deprecate `deposit_funds()` function.

### 4.4 Row Level Security (RLS) Matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `profiles` | `id = auth.uid() OR is_admin()` | Internal Trigger Only | `id = auth.uid()` (phone, name only) | Admin Only |
| `branches` | Authenticated users (`is_active = true` or admin) | Admin Only | Admin Only | Admin Only |
| `accounts` | `user_id = auth.uid() OR is_admin()` | **NO CLIENT WRITE** (RPC / Trigger only) | **NO CLIENT WRITE** (RPC only) | Admin Only |
| `transactions` | Involved in txn (`sender` or `receiver`) OR admin | **NO CLIENT WRITE** (RPC only) | **NO CLIENT WRITE** | **NO DELETE** |
| `notifications`| `user_id = auth.uid()` | RPC / System trigger | `user_id = auth.uid()` (`is_read` flip only) | `user_id = auth.uid()` |
| `audit_logs` | Admin Only (`is_admin()`) | **NO CLIENT WRITE** (RPC only) | **NO CLIENT WRITE** | **NO DELETE** |

---

## 5. Implementation Phases & Step-by-Step Roadmap

### Phase 1: Database Migration & Seed Data
- [x] Create `supabase/migrations/0007_srs_v2_alignment.sql` containing:
  - Tables: `branches`, `audit_logs`.
  - Column updates for `accounts`, `transactions`, `notifications`, `profiles`.
  - Stored procedures: `gen_reference()`, `lookup_recipient()`, `app_transfer()`, `app_withdraw()`, `app_deposit()`, `ensure_user_profile()`.
  - Complete RLS policies according to `design.md §4`.
  - Trigger updates ensuring new signups are linked to a default or selected active branch.
- [x] Create/Update demo seed data in `supabase/seed.sql`:
  - 8 realistic Bangladesh district branches (e.g. Dhaka Motijheel Main, Chittagong Agrabad, Sylhet Zindabazar, Rajshahi Saheb Bazar, Khulna KDA, Bogura, Barishal, Comilla).
  - 2 demo customer accounts with starting balances (e.g., Customer A: ৳50,000, Customer B: ৳15,000).
  - 1 demo administrator/teller account (`admin@smartbank.test`).

### Phase 2: TypeScript Types & Core Infrastructure
- [x] Update [types/db.ts](file:///c:/banking-app/types/db.ts):
  - Add `Branch` and `AuditLog` types.
  - Update `UserRole` to `'customer' | 'teller' | 'admin'`.
  - Update `Account` with `branch_id` and optional joined `branch: Branch`.
  - Update `Transaction` with `reference`, `type` (`transfer` | `withdrawal` | `deposit`), `branch_id`, `initiated_by`, `idempotency_key`.
  - Add `RecipientLookupInfo` type (`abbreviated_name`, `masked_account_number`, `branch_name`, `district`, `account_type`, `eligible`).
- [x] Update [utils/format.ts](file:///c:/banking-app/utils/format.ts):
  - Ensure Bangladeshi Taka (৳) formatting helper `formatBDT` formats standard Bengali/international comma groupings (e.g. `৳ 25,000.00`).
  - Add account number masking helper: `maskAccountNumber(acc: string) => string` (`••••••4821`).
  - Add name abbreviation helper: `abbreviateName(name: string) => string` (`Md. R***`).
  - Add strict 2-decimal amount parser and validator `isValidBankingAmount(val: string): { ok: boolean; amount?: number; error?: string }`.
- [x] Update [constants/routes.ts](file:///c:/banking-app/constants/routes.ts):
  - Add route for `resetPassword`, `adminBranches`, `adminDeposit`.
  - Remove customer `deposit` route.

### Phase 3: Service Layer Overhaul
- [x] Update [services/auth.ts](file:///c:/banking-app/services/auth.ts):
  - Add `resetPasswordForEmail(email: string)`.
  - Update `signUp` to optionally accept `branchId` in metadata for branch assignment.
- [x] Update [services/accounts.ts](file:///c:/banking-app/services/accounts.ts):
  - Add `lookupRecipient(accountNumber: string)` calling `lookup_recipient` RPC.
  - Update `getMyAccount()` to join branch details (`branches(name, district, branch_code)`).
- [x] Update [services/transactions.ts](file:///c:/banking-app/services/transactions.ts):
  - Replace `transferMoney` with `appTransfer({ recipientAccountNumber, amount, description, idempotencyKey })` calling `app_transfer` RPC.
  - Replace `withdrawFunds` with `appWithdraw({ amount, idempotencyKey })` calling `app_withdraw` RPC.
  - Remove customer `depositFunds` export.
  - Add friendly error code mapping for all stable Postgres RPC exceptions (`INSUFFICIENT_FUNDS`, `RECIPIENT_NOT_FOUND`, `SELF_TRANSFER`, `INVALID_AMOUNT`, `SENDER_NOT_ACTIVE`, `RECIPIENT_NOT_ACTIVE`, `NOT_AUTHORIZED`).
- [x] Create `services/branches.ts`:
  - `listActiveBranches()`: Fetches active branches for registration and transfer preview.
  - `adminListBranches()`, `adminCreateBranch()`, `adminUpdateBranch()`.
- [x] Update [services/admin.ts](file:///c:/banking-app/services/admin.ts):
  - Add `recordBranchDeposit({ accountNumber, branchId, amount, note, idempotencyKey })` calling `app_deposit`.
  - Add `adminSetAccountStatus(accountId, status, reason)` with audit logging.
  - Add `adminListAuditLogs(limit, offset)`.

### Phase 4: Customer Interface Transformation
- [x] Customer Dashboard ([app/(customer)/(tabs)/index.tsx](file:///c:/banking-app/app/(customer)/(tabs)/index.tsx)):
  - Display user greeting, available balance with hide/reveal toggle.
  - Display account card with **Masked Account Number** and **Assigned Branch / District** (FR-ACC-03, FR-BR-01).
  - Update [components/banking/QuickActions.tsx](file:///c:/banking-app/components/banking/QuickActions.tsx): Replace "Deposit" button with "Withdraw" (simulated), "Send Money", "My Account", and "History".
- [x] Customer Send Money Screen ([app/(customer)/send-money.tsx](file:///c:/banking-app/app/(customer)/send-money.tsx)):
  - **Step 1**: Enter Recipient Account Number -> Real-time backend lookup via `lookup_recipient` -> Renders preview with abbreviated name (`Md. R***`), masked account (`••••••4821`), and branch name/district. Shows immediate error if account not found or inactive.
  - **Step 2**: Enter Amount (2 decimal places limit, balance warning) + Optional Note.
  - **Step 3**: Confirmation Sheet displaying full breakdown, zero transfer fee notice (BR-07), and educational simulation notice. Generates UUID `idempotency_key` upon sheet display.
  - **Step 4**: Submission calling `app_transfer`. Displays success receipt modal with unique reference (`TXN-YYYYMMDD-XXXX`), sender/receiver details, timestamp, and "Done" navigation.
- [x] Customer Simulated Withdrawal ([app/(customer)/withdraw.tsx](file:///c:/banking-app/app/(customer)/withdraw.tsx)):
  - Clear banner: *"Simulated Withdrawal: This is an educational demonstration and does not dispense physical cash."* (FR-WD-05).
  - Validates amount against available balance.
  - Generates UUID `idempotency_key` and calls `app_withdraw`.
  - Displays success screen with generated transaction reference and new balance.
- [x] Decommission Customer Deposit:
  - Remove `app/(customer)/deposit.tsx` or replace with an informational screen directing the customer to an authorized branch teller (FR-DEP-01).
- [x] Transaction History & Details ([app/(customer)/(tabs)/transactions.tsx](file:///c:/banking-app/app/(customer)/(tabs)/transactions.tsx), [app/(customer)/transaction-details.tsx](file:///c:/banking-app/app/(customer)/transaction-details.tsx)):
  - Filter tabs: All, Transfers, Withdrawals, Deposits (FR-TXN-02).
  - Details screen: Unique transaction reference, transaction type pill, amount with +/- indicator, counterparty masked account, counterparty branch name, description, timestamp, and audit integrity indicator.
- [x] Notifications ([app/(customer)/(tabs)/notifications.tsx](file:///c:/banking-app/app/(customer)/(tabs)/notifications.tsx)):
  - Unread badge counter.
  - Live notifications for incoming transfers, sent transfers, withdrawals, and teller deposits.
  - Mark single/all as read.
- [x] Customer Profile ([app/(customer)/(tabs)/profile.tsx](file:///c:/banking-app/app/(customer)/(tabs)/profile.tsx)):
  - View full name, email, phone, role, bank account number, and assigned branch.
  - Edit permitted fields only: Full Name and Phone. Account number, balance, status, and role are non-editable (FR-PROF-02).

### Phase 5: Authentication & Onboarding
- [x] Login Screen ([app/(auth)/login.tsx](file:///c:/banking-app/app/(auth)/login.tsx)):
  - Add "Forgot Password?" link navigating to `reset-password`.
- [x] Password Reset Screen (`app/(auth)/reset-password.tsx`):
  - Email input with validation.
  - Calls `supabase.auth.resetPasswordForEmail`.
  - Displays confirmation instructions (FR-AUTH-04, TC-19).
- [x] Register Screen ([app/(auth)/register.tsx](file:///c:/banking-app/app/(auth)/register.tsx)):
  - Collects Full Name, Phone, Email, Password, Confirm Password.
  - Branch selection dropdown from active branches seeded in `branches` table (FR-BR-01, FR-BR-02).
  - Explicit role restriction: Client can never select or submit an administrative role (FR-ADM-01, TC-22).

### Phase 6: Admin & Teller Portal
- [x] Admin Navigation Layout ([app/(admin)/_layout.tsx](file:///c:/banking-app/app/(admin)/_layout.tsx)):
  - Tabs: Overview, Users, Accounts, Branches, Transactions.
  - Quick action: "Branch Cash Deposit" (Staff Operator Workflow).
- [x] Staff Simulated Branch Deposit Screen (`app/(admin)/deposit.tsx`):
  - Operator workflow (FR-DEP-01..08, TC-11):
    1. Search & select target account (displays recipient name and assigned branch).
    2. Select receiving branch.
    3. Enter deposit amount and reference note.
    4. Operator confirms simulated physical cash was received at counter.
    5. Dispatches `app_deposit` RPC atomically.
    6. Displays confirmation receipt with operator ID and unique reference.
- [x] Branch Management Screen (`app/(admin)/branches.tsx`):
  - Lists all branches with active/inactive status.
  - Modal to create a new branch or toggle branch active status (FR-ADM-06).
- [x] Account Status Management ([app/(admin)/(tabs)/accounts.tsx](file:///c:/banking-app/app/(admin)/(tabs)/accounts.tsx)):
  - Filter accounts by status (`active`, `inactive`, `blocked`).
  - Action modal to change status with required reason input, logging to `audit_logs` (FR-ADM-04, FR-ADM-08, TC-15).
- [x] Transaction Monitoring ([app/(admin)/(tabs)/transactions.tsx](file:///c:/banking-app/app/(admin)/(tabs)/transactions.tsx)):
  - Search by transaction reference (`TXN-...`) or account number.
  - Filter by transaction type (`transfer`, `withdrawal`, `deposit`), status, and date range (FR-ADM-05).

### Phase 7: Test Traceability, Verification & Final Polish
- [x] Verify acceptance criteria mapping TC-01 through TC-23 against codebase implementation.
- [x] TypeScript compile check (`npx tsc --noEmit`) clean across all customer, admin, auth, and common modules.
- [x] Ensure strict alternation of GitHub commits between project teammates (Md Robi & Sheikh-Ahmad-007).
- [x] Align SRS v2.1 business rules (BDT currency ৳, atomic RPCs, recipient abbreviation, simulated withdrawals, staff cash deposits).

---

## 6. Comprehensive Verification & Test Traceability Matrix (TC-01 – TC-23)

Every test case specified in SRS v2.1 §10 maps directly to our implementation and validation steps:

| Test ID | Test Scenario | SRS Expected Result | Verification Method |
| :--- | :--- | :--- | :--- |
| **TC-01** | Valid customer login | Reaches customer dashboard | Expo E2E / manual login with customer test account |
| **TC-02** | Customer reads another's account directly | RLS denies direct select query | SQL test query with customer JWT attempting to select another user's account row |
| **TC-03** | Valid transfer with sufficient funds | Sender debited, recipient credited, transaction & audit created atomically | Run `app_transfer`, verify sender -amount, recipient +amount, txn reference exists |
| **TC-04** | Transfer exceeds available balance | Rejected (`INSUFFICIENT_FUNDS`), balances unchanged | Execute transfer for ৳999,999 on ৳5,000 balance; verify rollback |
| **TC-05** | Recipient account does not exist | Account-not-found error, balances unchanged | Call `lookup_recipient('AC999999')`, verify error and no balance mutation |
| **TC-06** | Recipient account is inactive/blocked | Transfer rejected (`RECIPIENT_NOT_ACTIVE`) | Block recipient account, attempt transfer, verify exception raised |
| **TC-07** | Transfer to own account | Rejected (`SELF_TRANSFER`) | Transfer from Account A to Account A; verify rejected |
| **TC-08** | Concurrent transfer race condition | No partial update or negative balance | Fire two concurrent transfers of ৳10,000 against ৳10,000 balance; exactly one succeeds |
| **TC-09** | Customer direct update on `balance` | RLS / DB permissions reject direct update | Attempt `supabase.from('accounts').update({ balance: 99999 })`; verify 0 rows modified or permission denied |
| **TC-10** | Customer attempts self-deposit | No customer self-deposit feature exists | Customer deposit UI removed; client calling `deposit_funds` fails |
| **TC-11** | Authorized operator simulated branch deposit | Target credited, transaction & audit records consistent | Staff user runs `app_deposit`; verify balance increased and audit log populated |
| **TC-12** | Unauthorized customer attempts deposit | Backend rejects operation (`NOT_AUTHORIZED`) | Customer JWT calls `app_deposit`; verify Postgres raises `NOT_AUTHORIZED` |
| **TC-13** | Network retry / duplicate submission | Reused idempotency key returns original transaction, no double debit | Execute `app_transfer` with identical `p_idempotency_key` twice; verify single transaction row |
| **TC-14** | Customer opens history | Only authorized rows shown with counterparty & status | Query transactions as Customer A; verify Customer B private transactions omitted |
| **TC-15** | Admin changes account status | Requires admin role; writes audit log | Admin toggles account to `blocked`; verify status changed and `audit_logs` record created |
| **TC-16** | Valid simulated withdrawal | Debited atomically; no-cash message shown; notification created | Run `app_withdraw`; verify balance reduced, withdrawal txn created, notification added |
| **TC-17** | Withdrawal exceeds balance | Rejected; balance unchanged | Attempt withdrawal of ৳10,000 on ৳2,000 balance; verify failure |
| **TC-18** | Customer edits profile | Permitted fields saved; role, balance, account number, status untouched | Customer updates phone number; attempt to alter role or balance ignored/rejected |
| **TC-19** | Password reset request | Supabase reset-email flow triggered | Request reset for test email; verify Supabase Auth triggers password reset email |
| **TC-20** | Incoming transfer notification | Recipient sees unread notification; marking read updates state | Send transfer to Customer B; Customer B opens notifications, marks read |
| **TC-21** | Recipient lookup data exposure | Only abbreviated name and masked number returned; full name never exposed | Call `lookup_recipient`; verify returns `Md. R***` and `••••••4821` |
| **TC-22** | Role-elevation attempt | Rejected; roles cannot be set from client | Pass `role: 'admin'` in `auth.signUp`; verify profile role defaults to `customer` |
| **TC-23** | Invalid amount format/limit | Rejected before any balance change | Test amounts: `-50`, `0`, `10.555` (3 decimals), `99999999` (over limit); verify all rejected |

---

## 7. Execution Checklist & File Change Plan

```text
Files to Create:
├── supabase/migrations/0007_srs_v2_alignment.sql   (Complete schema, RLS & RPC alignment)
├── services/branches.ts                            (Branch query & admin branch management)
├── app/(auth)/reset-password.tsx                   (Password reset flow - FR-AUTH-04)
├── app/(admin)/deposit.tsx                         (Admin/teller branch deposit - FR-DEP-02)
└── app/(admin)/branches.tsx                        (Admin branch management - FR-ADM-06)

Files to Update:
├── types/db.ts                                     (Add Branch, AuditLog, update types)
├── utils/format.ts                                 (Masking, BDT currency, strict 2-decimal validator)
├── constants/routes.ts                             (Add new routes, remove customer deposit)
├── services/auth.ts                                (Add resetPassword, branch assignment)
├── services/accounts.ts                            (Add lookupRecipient, join branches)
├── services/transactions.ts                        (Use app_transfer, app_withdraw, remove depositFunds)
├── services/admin.ts                               (Add branch deposit, account status with audit)
├── components/banking/QuickActions.tsx             (Remove deposit tile, add withdraw/send)
├── app/(customer)/(tabs)/index.tsx                 (Display branch & masked account, remove deposit)
├── app/(customer)/send-money.tsx                   (4-step flow with abbreviated name & branch preview)
├── app/(customer)/withdraw.tsx                     (Add simulated disclaimer, idempotency, reference)
├── app/(customer)/deposit.tsx                      (Decommission or redirect to branch notice)
├── app/(customer)/(tabs)/transactions.tsx          (Support filters & reference display)
├── app/(customer)/transaction-details.tsx          (Display counterparty branch & reference)
├── app/(customer)/(tabs)/profile.tsx               (Display branch, lock non-editable fields)
├── app/(auth)/login.tsx                            (Link to reset-password)
├── app/(auth)/register.tsx                         (Add branch picker from active branches)
├── app/(admin)/_layout.tsx                         (Add branches and deposit to navigation)
├── app/(admin)/(tabs)/accounts.tsx                 (Show branch, audit log on status change)
└── app/(admin)/(tabs)/transactions.tsx             (Filter by reference, branch, and type)
```
