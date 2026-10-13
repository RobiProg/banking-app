# SmartBank — Technical Design Document

**Companion to:** Software Requirements Specification v2.1
**Project:** University App Development Project
**Stack:** React Native + Expo (Android primary, iOS-compatible) · Supabase Auth · PostgreSQL + RLS + RPC
**Currency:** Bangladeshi Taka (৳), stored as `NUMERIC(18,2)`
**Status:** Educational simulation — no real money, no external bank/payment networks.

This document describes *how* the requirements in the SRS are implemented. The SRS says *what* the system must do; this says *how* the pieces fit together. Where the two disagree, the SRS wins.

---

## 1. Design goals and principles

1. **The client is never trusted for money or roles.** Every balance change goes through a server-side PostgreSQL function (RPC). The mobile app can read data (filtered by RLS) but can never `UPDATE accounts.balance` or `INSERT` a completed transaction directly.
2. **All-or-nothing writes.** A transfer touches two balances plus a transaction row plus an audit row. These succeed together or roll back together, inside one database transaction.
3. **Correct under concurrency.** Balance reads inside an RPC lock the row (`SELECT … FOR UPDATE`) so two simultaneous transfers can't both spend the same taka.
4. **Idempotent money operations.** A retried request (bad network, double tap) must not post twice.
5. **Minimal data exposure.** Recipient lookup returns only what's needed to confirm a transfer.
6. **Simple but honest.** A single `balance` column is used instead of a full double-entry ledger; the limits of that choice are documented rather than hidden.

---

## 2. System architecture

```
┌──────────────────────────────────────────────┐
│  React Native + Expo app (Android / iOS)      │
│                                               │
│  UI screens ── hooks/services ── supabase-js  │
└───────────────┬───────────────────────────────┘
                │ HTTPS (anon key + user JWT)
                ▼
┌──────────────────────────────────────────────┐
│  Supabase                                     │
│   • Auth (email/password, JWT)                │
│   • PostgREST  → table reads (RLS enforced)   │
│   • RPC        → transfer / withdraw / deposit│
│                  (SECURITY DEFINER functions) │
│   • PostgreSQL → tables, RLS, triggers        │
└──────────────────────────────────────────────┘
```

- **Reads** (dashboard, history, profile) go through PostgREST and are constrained by RLS — the app asks for "my transactions" and the database returns only rows the user may see.
- **Writes that move money** never go through PostgREST. They call an RPC that re-validates everything server-side and performs the atomic update.
- The **service-role key is never shipped in the app** (NFR-SEC-04). Only the anon/public key plus the signed-in user's JWT are present on the device.

---

## 3. Data model

### 3.1 Enums

```sql
create type user_role         as enum ('customer', 'teller', 'admin');
create type account_status    as enum ('active', 'inactive', 'blocked');
create type account_type      as enum ('savings');          -- extensible later
create type txn_type          as enum ('transfer', 'withdrawal', 'deposit');
create type txn_status        as enum ('completed', 'failed');
```

### 3.2 Tables

```sql
-- One row per authenticated user. id == auth.users.id
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null,
  phone       text,
  role        user_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table branches (
  id            uuid primary key default gen_random_uuid(),
  branch_code   text unique not null,
  name          text not null,
  district      text not null,
  address       text,
  routing_code  text,                     -- informational only, not real routing
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table accounts (
  id             uuid primary key default gen_random_uuid(),
  account_number text unique not null,
  user_id        uuid not null references profiles(id),
  branch_id      uuid not null references branches(id),
  account_type   account_type not null default 'savings',
  status         account_status not null default 'active',
  balance        numeric(18,2) not null default 0 check (balance >= 0),
  created_at     timestamptz not null default now()
  -- Initial version: exactly one account per user (enforced below).
);
create unique index one_account_per_user on accounts(user_id);

create table transactions (
  id                   uuid primary key default gen_random_uuid(),
  reference            text unique not null,     -- shown to users
  type                 txn_type not null,
  status               txn_status not null,
  amount               numeric(18,2) not null check (amount > 0),
  sender_account_id    uuid references accounts(id),   -- null for deposit
  receiver_account_id  uuid references accounts(id),   -- null for withdrawal
  branch_id            uuid references branches(id),   -- deposit / where relevant
  description          text,
  initiated_by         uuid not null references profiles(id),
  idempotency_key      text,                            -- see §5
  created_at           timestamptz not null default now()
);
create unique index uniq_idempotency on transactions(idempotency_key)
  where idempotency_key is not null;
create index txn_sender_idx   on transactions(sender_account_id);
create index txn_receiver_idx on transactions(receiver_account_id);

create table notifications (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references profiles(id),
  title                  text not null,
  message                text not null,
  related_transaction_id uuid references transactions(id),
  is_read                boolean not null default false,
  created_at             timestamptz not null default now()
);

create table audit_logs (
  id             uuid primary key default gen_random_uuid(),
  actor_user_id  uuid references profiles(id),
  action         text not null,            -- 'transfer', 'account.block', ...
  target_type    text,                     -- 'account', 'transaction', ...
  target_id      uuid,
  metadata       jsonb,                    -- reason, amounts, before/after
  created_at     timestamptz not null default now()
);
```

**Why `type` semantics map to nullable columns:**

| Transaction type | sender_account_id | receiver_account_id |
|---|---|---|
| transfer   | sender   | recipient |
| withdrawal | account  | null |
| deposit    | null     | account |

### 3.3 Money representation (design decision)

The initial version keeps an authoritative `balance` column on `accounts` and treats each `transactions` row as a *record of what happened*, not as the source of truth for the balance. This is the simple, project-appropriate choice.

**Known limitation (documented, not a bug):** withdrawals and deposits are single-sided — the money leaves or enters the system without a matching cash/vault counter-account, so the set of rows does not sum to zero the way a double-entry ledger would. A production system would replace `accounts.balance` with a derived balance over balanced `ledger_entries` (every event posting equal debit and credit legs) plus periodic reconciliation. That is explicitly out of scope here.

---

## 4. Row Level Security

RLS is the second line of defence for reads. Money logic lives in RPCs, but RLS guarantees that even a crafted direct query can't leak another user's data.

```sql
alter table profiles      enable row level security;
alter table accounts      enable row level security;
alter table transactions  enable row level security;
alter table notifications enable row level security;
alter table audit_logs    enable row level security;
alter table branches      enable row level security;

-- helper: is the current user an admin?
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- profiles: see/update own row; admins see all
create policy profiles_self_read on profiles
  for select using (id = auth.uid() or is_admin());
create policy profiles_self_update on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());         -- app must still not send role/balance

-- accounts: owner reads own; admin reads all; NO direct update/insert for anyone
create policy accounts_read on accounts
  for select using (user_id = auth.uid() or is_admin());

-- transactions: visible if you own either side, or admin
create policy txn_read on transactions
  for select using (
    is_admin()
    or sender_account_id   in (select id from accounts where user_id = auth.uid())
    or receiver_account_id in (select id from accounts where user_id = auth.uid())
  );

-- notifications: own only
create policy notif_read on notifications
  for select using (user_id = auth.uid());
create policy notif_update on notifications
  for update using (user_id = auth.uid());  -- used only to flip is_read

-- branches: readable to all signed-in users; writes admin-only
create policy branch_read on branches for select using (auth.uid() is not null);
create policy branch_write on branches for all using (is_admin()) with check (is_admin());

-- audit_logs: admin read only
create policy audit_read on audit_logs for select using (is_admin());
```

**Deliberately absent:** there is no `INSERT`/`UPDATE` policy for `accounts`, and no `INSERT` policy for `transactions`. With RLS on and no permissive policy, those operations are denied to normal clients — they can only happen inside `SECURITY DEFINER` RPCs (§5). This is what makes FR-TRF-10 / BR-01 enforceable rather than aspirational.

Profile update is allowed but the app must send only editable fields; to be safe, `role`, `balance`, `account_number`, and `status` live on separate tables or are protected by a trigger that rejects client-originated changes.

---

## 5. Money-moving RPCs

All three are `SECURITY DEFINER`, validate inputs server-side, run in a single implicit transaction, and lock any row whose balance they change.

### 5.1 Transfer

```sql
create or replace function app_transfer(
  p_recipient_account_number text,
  p_amount                    numeric,
  p_description               text,
  p_idempotency_key           text
) returns transactions
language plpgsql security definer set search_path = public as $$
declare
  v_sender    accounts;
  v_recipient accounts;
  v_txn       transactions;
begin
  -- 0. idempotency: if we've already processed this key, return that result
  select * into v_txn from transactions where idempotency_key = p_idempotency_key;
  if found then return v_txn; end if;

  -- 1. validate amount (FR-TRF-13)
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'INVALID_AMOUNT';
  end if;

  -- 2. lock sender (the caller's own account) and recipient, in a stable order
  select * into v_sender
    from accounts where user_id = auth.uid() for update;
  if not found then raise exception 'NO_SENDER_ACCOUNT'; end if;

  select * into v_recipient
    from accounts where account_number = p_recipient_account_number for update;
  if not found then raise exception 'RECIPIENT_NOT_FOUND'; end if;

  -- 3. business rules
  if v_recipient.id = v_sender.id then raise exception 'SELF_TRANSFER'; end if;
  if v_sender.status   <> 'active' then raise exception 'SENDER_NOT_ACTIVE'; end if;
  if v_recipient.status<> 'active' then raise exception 'RECIPIENT_NOT_ACTIVE'; end if;
  if v_sender.balance < p_amount   then raise exception 'INSUFFICIENT_FUNDS'; end if;

  -- 4. move the money
  update accounts set balance = balance - p_amount where id = v_sender.id;
  update accounts set balance = balance + p_amount where id = v_recipient.id;

  -- 5. record it
  insert into transactions(reference, type, status, amount,
         sender_account_id, receiver_account_id, description,
         initiated_by, idempotency_key)
  values (gen_reference(), 'transfer', 'completed', p_amount,
          v_sender.id, v_recipient.id, p_description,
          auth.uid(), p_idempotency_key)
  returning * into v_txn;

  insert into audit_logs(actor_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'transfer', 'transaction', v_txn.id,
          jsonb_build_object('amount', p_amount,
                             'from', v_sender.id, 'to', v_recipient.id));

  insert into notifications(user_id, title, message, related_transaction_id)
  values (v_recipient.user_id, 'Money received',
          format('You received ৳%s', p_amount), v_txn.id),
         (v_sender.user_id, 'Transfer sent',
          format('You sent ৳%s', p_amount), v_txn.id);

  return v_txn;
end $$;
```

Key points:
- Everything after the idempotency check is one transaction; any `raise exception` rolls the whole thing back (FR-TRF-07, NFR-REL-01).
- `FOR UPDATE` serialises concurrent transfers on the same account (NFR-INT-01, TC-08).
- Locking sender-then-recipient in a consistent order avoids deadlocks under cross-transfers. For production, lock the two rows ordered by `id`.
- The unique index on `idempotency_key` is the backstop: even in a race, a second insert with the same key fails and the retry returns the original row (NFR-INT-02, TC-13).

### 5.2 Withdrawal (optional module)

Same shape, one account: validate amount → `FOR UPDATE` the caller's account → check status and balance → debit → insert `withdrawal` transaction + audit + notification. No physical cash is dispensed; the UI states this (FR-WD-05).

### 5.3 Deposit (optional module, staff only)

First line of the function checks the caller's role:

```sql
if (select role from profiles where id = auth.uid()) not in ('teller','admin') then
  raise exception 'NOT_AUTHORIZED';
end if;
```

Then lock the target account, validate branch and amount, credit, and insert a `deposit` transaction + audit + notification. Customers have no path to this RPC that passes the role check (FR-DEP-01/02, TC-12).

### 5.4 Recipient lookup

A read-only RPC `lookup_recipient(account_number)` returns only `{ abbreviated_name, masked_account_number, account_type, branch_name, district, eligible }`. It never returns the full legal name or `user_id` (FR-TRF-02, NFR-SEC-05), and is rate-limited per user to blunt enumeration.

- `abbreviated_name`: e.g. `"Md. R***"` — enough to confirm, not enough to harvest.
- `masked_account_number`: e.g. `"••••••4821"`.

---

## 6. Client architecture

### 6.1 Folder layout

```
src/
  app/                 # expo-router screens (file-based routing)
    (auth)/            # login, register, reset
    (customer)/        # dashboard, send, history, notifications, profile
    (admin)/           # dashboard, users, accounts, branches, deposit
  components/          # reusable UI (Money, StatusBadge, ConfirmSheet…)
  features/
    transfer/          # useTransfer hook + validation + types
    account/
    transactions/
    notifications/
    admin/
  lib/
    supabase.ts        # client (anon key only)
    money.ts           # format/parse ৳, 2-dp validation
    rpc.ts             # typed wrappers around app_transfer etc.
  providers/           # AuthProvider, QueryProvider
  theme/               # colors, spacing, typography
```

### 6.2 Layering (NFR-MAINT-01)

```
Screen (UI)  →  feature hook (useTransfer)  →  rpc wrapper  →  supabase-js
```

- **UI** never calls supabase directly; it calls a hook.
- **Hooks** own loading/error state and call typed RPC wrappers.
- **RPC wrappers** are the only place that knows function names and argument shapes.
- **Validation** is duplicated intentionally: client-side for fast feedback, server-side as the authority. The client validation can be wrong; the server's cannot be bypassed.

### 6.3 State & data fetching

- Auth/session: `AuthProvider` over Supabase auth state.
- Server data: TanStack Query (or SWR) for caching dashboard/history/notifications, with invalidation after a successful transfer.
- No secrets in app state; no service-role key anywhere on the device.

### 6.4 Idempotency on the client

Each money action generates a UUID `idempotency_key` **once** when the user opens the confirm screen, and reuses it on every retry of that same action. This is what lets a network-timeout retry be safe (§5.1 step 0).

---

## 7. Screen map

**Customer:** Login · Register · Reset · Dashboard (balance, masked acct, branch, recent txns, Send Money) · Send Money (enter acct → recipient preview → amount+note → confirm → result) · Account details · Transaction history · Transaction detail · Notifications · Profile · Edit profile · Withdrawal (if enabled).

**Admin/Teller:** Admin login · Dashboard · Users · User detail · Accounts · Account detail + status control · Branches · Branch edit · Transaction monitoring · Transaction detail · Deposit entry (if enabled).

---

## 8. Error handling

RPCs raise short, stable codes (`INSUFFICIENT_FUNDS`, `RECIPIENT_NOT_FOUND`, `SELF_TRANSFER`, `INVALID_AMOUNT`, `SENDER_NOT_ACTIVE`, `RECIPIENT_NOT_ACTIVE`, `NOT_AUTHORIZED`). The client maps each to a plain-language message (NFR-USE-01):

| Code | User message |
|---|---|
| `RECIPIENT_NOT_FOUND` | "No SmartBank account found for that number." |
| `INSUFFICIENT_FUNDS` | "You don't have enough balance for this transfer." |
| `SELF_TRANSFER` | "You can't transfer to your own account." |
| `INVALID_AMOUNT` | "Enter a valid amount (up to two decimals)." |
| network/timeout | "Couldn't reach the server. We'll retry safely." |

Status is never conveyed by colour alone — an icon/label accompanies it (NFR-USE-02).

---

## 9. Security summary

- Service-role key absent from the app; anon key + user JWT only.
- RLS on every table; `accounts`/`transactions` have **no** client write policy.
- Money and role changes happen only inside `SECURITY DEFINER` RPCs that re-check permission server-side (NFR-SEC-02/03).
- Admin/teller roles are seeded directly or granted by an existing admin via a trusted action — never from the client (FR-ADM-09).
- Recipient lookup is minimal-disclosure and rate-limited (NFR-SEC-05).
- Privileged and money actions write `audit_logs`.
- Not production-grade banking: no KYC, ledger reconciliation, regulatory reporting, or formal security review.

---

## 10. Testing strategy

- **Unit:** money formatting/parsing, amount validation (including 3-decimal, zero, negative, over-limit → reject).
- **RLS tests:** sign in as customer A, confirm B's account/transactions are invisible; confirm direct `update accounts` is denied (TC-02, TC-09).
- **RPC tests (SQL):** valid transfer, insufficient funds, inactive accounts, self-transfer, invalid amount; deposit by customer → `NOT_AUTHORIZED` (TC-03–07, TC-12, TC-23).
- **Concurrency:** fire two transfers from the same account in parallel against a balance that covers only one → exactly one succeeds, no negative balance (TC-08).
- **Idempotency:** replay the same `idempotency_key` → single transaction, returned twice (TC-13).
- **E2E (Expo):** login → send money happy path; notification appears and marks read (TC-01, TC-20).

Traceability is maintained in SRS §10 — every FR maps to at least one test case.

---

## 11. Build order

Auth/env → tables → RLS (+ tests) → recipient lookup → transfer RPC (+ concurrency/idempotency tests) → history/notifications → profile/account/admin → optional withdrawal → optional deposit → full test pass. (Mirrors SRS §12.)

---

## 12. Out of scope

Real money, external banks/gateways, interbank rails (BEFTN/NPSB/RTGS), MFS, loans/cards/investments/crypto, utility/recharge/QR, customer self top-up, transfer fees, full double-entry ledger, production KYC/regulatory controls.
