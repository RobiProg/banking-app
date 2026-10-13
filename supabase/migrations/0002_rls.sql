-- ============================================================
-- SmartBank — 0002_rls.sql
-- Row Level Security policies.
-- Matches plan.md §10.
-- Idempotent: safe to re-run.
-- ============================================================

-- ---------- helper: is_admin() ----------
-- SECURITY DEFINER so it can read profiles.role even from non-admin contexts.
-- Stable: same input → same output, so Postgres can cache per-row.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- profiles ----------
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own_or_admin  on public.profiles;
drop policy if exists profiles_update_own_or_admin  on public.profiles;
drop policy if exists profiles_insert_own           on public.profiles;

-- A user can see their own row; an admin can see every row.
create policy profiles_select_own_or_admin
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

-- A user can update only non-sensitive fields on their own row.
-- RLS still allows the update; the WITH CHECK clause blocks
-- the user from elevating role or changing id/email.
create policy profiles_update_own_or_admin
  on public.profiles for update
  using  (auth.uid() = id or public.is_admin())
  with check (
    (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()))
    or public.is_admin()
  );

-- Authenticated users can insert their own profile row if missing (self-healing fallback).
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- ---------- accounts ----------
alter table public.accounts enable row level security;

drop policy if exists accounts_select_own_or_admin on public.accounts;
drop policy if exists accounts_update_admin         on public.accounts;
drop policy if exists accounts_insert_own           on public.accounts;

create policy accounts_select_own_or_admin
  on public.accounts for select
  using (auth.uid() = user_id or public.is_admin());

-- Only admins may UPDATE accounts (e.g. block a customer). The
-- admin_update_account_status RPC still goes through this policy.
-- Balance updates from clients are therefore impossible.
create policy accounts_update_admin
  on public.accounts for update
  using (public.is_admin())
  with check (public.is_admin());

-- Authenticated users can insert their own savings account row if missing.
create policy accounts_insert_own
  on public.accounts for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ---------- transactions ----------
alter table public.transactions enable row level security;

drop policy if exists transactions_select_own_or_admin on public.transactions;

-- A customer sees transactions where their account is sender OR receiver.
-- An admin sees everything.
create policy transactions_select_own_or_admin
  on public.transactions for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.accounts a
      where a.id in (sender_account_id, receiver_account_id)
        and a.user_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies for clients — financial ops
-- happen through SECURITY DEFINER RPCs only.

-- ---------- notifications ----------
alter table public.notifications enable row level security;

drop policy if exists notifications_select_own           on public.notifications;
drop policy if exists notifications_update_is_read_own     on public.notifications;

create policy notifications_select_own
  on public.notifications for select
  using (auth.uid() = user_id or public.is_admin());

-- Customers may only flip is_read on their own notifications.
-- The WITH CHECK allows the update only when user_id is unchanged
-- (still belongs to auth.uid()) — so a user can't reassign the
-- notification to someone else by sending user_id in the payload.
create policy notifications_update_is_read_own
  on public.notifications for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No INSERT policy for clients — notifications are created by RPCs/triggers.

-- Done.
-- Verification:
--   select schemaname, tablename, rowsecurity
--   from pg_tables where schemaname='public'
--   and tablename in ('profiles','accounts','transactions','notifications');
-- All four should show rowsecurity = true.