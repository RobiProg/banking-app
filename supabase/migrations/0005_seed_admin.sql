-- ============================================================
-- SmartBank — 0005_seed_admin.sql
-- Promote an existing auth user to admin role.
--
-- IMPORTANT — change the email below to the one you actually
-- registered in the app, then run this script.
--
-- Why we do it this way (instead of creating the auth.users row
-- here): inserting into auth.users directly requires knowing the
-- encrypted_password and other internals; it's safer to register
-- normally via the app, then promote the row.
--
-- NOTE: this file uses plain SQL literals so it runs in the
-- Supabase SQL editor. If you prefer psql, you can replace the
-- literal with \set admin_email '...' and use :'admin_email'.
-- ============================================================

-- CHANGE THIS to your admin's email (must match an auth.users row):
do $$
declare
  admin_email constant text := 'admin@smartbank.test';
  updated_id  uuid;
begin
  update public.profiles
     set role = 'admin'
   where email = admin_email
   returning id into updated_id;

  if updated_id is null then
    raise notice 'No profile found with email %. Sign up via the app first, then re-run.', admin_email;
  else
    raise notice 'Promoted % to admin (profile id %).', admin_email, updated_id;
  end if;
end $$;

-- Sanity check: should return 1 row if the email exists.
select id, full_name, email, role, created_at
from public.profiles
where email = 'admin@smartbank.test';

-- If you ever need to demote:
--   update public.profiles set role = 'customer' where email = 'admin@smartbank.test';

-- ============================================================
-- END-TO-END VERIFICATION QUERIES
-- Run these after all 5 migrations + signing up a customer.
-- ============================================================

-- (1) Tables exist and RLS is on.
-- select tablename, rowsecurity
-- from pg_tables where schemaname='public'
-- and tablename in ('profiles','accounts','transactions','notifications');

-- (2) RPCs exist.
-- select proname from pg_proc
-- where pronamespace='public'::regnamespace
-- and proname in ('get_my_account','deposit_funds','withdraw_funds',
--                 'transfer_money','admin_update_account_status','is_admin')
-- order by 1;

-- (3) Customer row has matching account.
-- select p.email, p.role, a.account_number, a.balance, a.status
-- from public.profiles p
-- left join public.accounts a on a.user_id = p.id
-- order by p.created_at desc;

-- (4) Trigger fired on signup? Run immediately after a new signUp:
-- select id, email, created_at from auth.users order by created_at desc limit 1;
-- select user_id, account_number, balance from public.accounts order by created_at desc limit 1;