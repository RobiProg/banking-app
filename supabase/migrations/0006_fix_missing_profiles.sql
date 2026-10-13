-- ============================================================
-- SmartBank — 0006_fix_missing_profiles.sql
-- Fix for "Almost there / Your profile is being set up" error.
--
-- Why this is needed:
-- 1. Backfills any existing auth.users who were created before
--    0004_triggers.sql ran, so they immediately receive a profile
--    and a savings account.
-- 2. Provides ensure_user_profile() RPC so that if any user ever
--    logs in with a missing profile row, the app can auto-create
--    it on the fly.
-- 3. Provides lookup_account(p_account_number) RPC so that customers
--    can validate recipient account numbers in "Send Money" without
--    getting blocked by Row-Level Security (RLS).
-- 4. Adds INSERT RLS policies for authenticated users on profiles
--    and accounts.
--
-- Idempotent: safe to run multiple times in Supabase SQL editor.
-- ============================================================

-- ---------- 1. Backfill missing profiles for existing auth.users ----------
insert into public.profiles (id, full_name, email, phone, role)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(coalesce(u.email, 'User'), '@', 1)),
  u.email,
  coalesce(u.raw_user_meta_data->>'phone', null),
  'customer'
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
)
on conflict (id) do nothing;

-- ---------- 2. Backfill missing savings accounts for existing profiles ----------
insert into public.accounts (user_id, account_type, balance, status)
select
  p.id,
  'savings',
  0,
  'active'
from public.profiles p
where not exists (
  select 1 from public.accounts a where a.user_id = p.id
);

-- ---------- 3. Self-healing RPC: ensure_user_profile() ----------
create or replace function public.ensure_user_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id  uuid;
  v_email    text;
  v_metadata jsonb;
  v_profile  public.profiles;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated'
      using errcode = 'P0001',
            hint    = 'User must be signed in to ensure profile.';
  end if;

  select email, raw_user_meta_data
    into v_email, v_metadata
    from auth.users
   where id = v_user_id;

  -- Insert profile if missing
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    v_user_id,
    coalesce(v_metadata->>'full_name', split_part(coalesce(v_email, 'Customer'), '@', 1)),
    v_email,
    coalesce(v_metadata->>'phone', null),
    'customer'
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email)
  returning * into v_profile;

  -- Insert savings account if missing
  if not exists (select 1 from public.accounts where user_id = v_user_id) then
    insert into public.accounts (user_id, account_type, balance, status)
    values (v_user_id, 'savings', 0, 'active');
  end if;

  return v_profile;
end;
$$;

grant execute on function public.ensure_user_profile() to authenticated, anon;

-- ---------- 4. Recipient lookup RPC for Send Money: lookup_account ----------
create or replace function public.lookup_account(p_account_number text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_acc public.accounts;
begin
  if p_account_number is null or length(trim(p_account_number)) = 0 then
    return null;
  end if;

  select * into v_acc
  from public.accounts
  where account_number = trim(p_account_number)
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'account_number', v_acc.account_number,
    'status', v_acc.status
  );
end;
$$;

grant execute on function public.lookup_account(text) to authenticated, anon;

-- ---------- 5. RLS INSERT policies for self-provisioning fallback ----------
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists accounts_insert_own on public.accounts;
create policy accounts_insert_own
  on public.accounts for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ---------- 6. Ensure trigger handles on conflict cleanly ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insert profile (defaults role=customer).
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'Customer'), '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', null),
    'customer'
  )
  on conflict (id) do nothing;

  -- Insert savings account if missing.
  if not exists (select 1 from public.accounts where user_id = new.id) then
    insert into public.accounts (user_id, account_type, balance, status)
    values (new.id, 'savings', 0, 'active');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Done!
