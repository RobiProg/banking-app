-- ============================================================
-- SmartBank — 0001_schema.sql
-- Tables: profiles, accounts, transactions, notifications
-- Matches plan.md §8 exactly.
-- Idempotent: safe to re-run.
-- ============================================================

-- ---------- profiles ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text,
  phone       text,
  role        text not null default 'customer'
              check (role in ('customer', 'admin')),
  created_at  timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);

-- ---------- account-number sequence ----------
-- Used by the trigger in 0004 to mint sequential, unique account numbers.
create sequence if not exists public.accounts_account_number_seq
  start 1000000001
  increment 1
  minvalue 1000000001;

-- ---------- accounts ----------
create table if not exists public.accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  account_number  text not null unique
                  default ('AC' || nextval('public.accounts_account_number_seq')::text),
  account_type    text not null default 'savings'
                  check (account_type in ('savings')),
  balance         numeric(15, 2) not null default 0
                  check (balance >= 0),
  status          text not null default 'active'
                  check (status in ('active', 'inactive', 'blocked')),
  created_at      timestamptz not null default now()
);

create unique index if not exists accounts_account_number_idx
  on public.accounts(account_number);

create index if not exists accounts_user_id_idx on public.accounts(user_id);
create index if not exists accounts_status_idx  on public.accounts(status);

-- ---------- transactions ----------
create table if not exists public.transactions (
  id                   uuid primary key default gen_random_uuid(),
  sender_account_id    uuid references public.accounts(id) on delete set null,
  receiver_account_id  uuid references public.accounts(id) on delete set null,
  amount               numeric(15, 2) not null check (amount > 0),
  transaction_type     text not null
                       check (transaction_type in ('deposit', 'withdrawal', 'transfer')),
  description          text,
  status               text not null default 'completed'
                       check (status in ('completed', 'failed')),
  created_at           timestamptz not null default now()
);

create index if not exists transactions_sender_idx
  on public.transactions(sender_account_id, created_at desc);

create index if not exists transactions_receiver_idx
  on public.transactions(receiver_account_id, created_at desc);

create index if not exists transactions_type_idx
  on public.transactions(transaction_type, created_at desc);

-- ---------- notifications ----------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  message     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications(user_id, created_at desc);

-- Done.
-- Verification:
--   select table_name from information_schema.tables
--   where table_schema='public' order by 1;
-- Expected: accounts, notifications, profiles, transactions.