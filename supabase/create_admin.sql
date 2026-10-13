-- ============================================================
-- SmartBank — Create / Update Admin Account
--
-- Credentials created by this script:
--   Email:    admin@smartbank.com
--   Password: admin1234
--   Role:     admin
-- ============================================================

create extension if not exists pgcrypto;

do $$
declare
  v_admin_email text := 'admin@smartbank.com';
  v_password    text := 'admin1234';
  v_user_id     uuid;
  v_branch_id   uuid;
begin
  -- Retrieve a valid active branch (if exists)
  select id into v_branch_id from public.branches where is_active = true limit 1;

  -- 1. Check if user already exists in auth.users
  select id into v_user_id from auth.users where email = v_admin_email;

  if v_user_id is null then
    -- Generate new UUID for the admin user
    v_user_id := gen_random_uuid();
    
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_admin_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"System Administrator","phone":"01711000000"}'::jsonb,
      now(),
      now()
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      v_user_id,
      v_user_id,
      format('{"sub":"%s","email":"%s"}', v_user_id, v_admin_email)::jsonb,
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    ) on conflict do nothing;
  else
    -- Update existing user password and confirm email
    update auth.users
    set encrypted_password = crypt(v_password, gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
    where id = v_user_id;
  end if;

  -- 2. Upsert profile with role = 'admin'
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    v_user_id,
    'System Administrator',
    v_admin_email,
    '01711000000',
    'admin'
  )
  on conflict (id) do update
  set role = 'admin',
      full_name = 'System Administrator';

  -- 3. Ensure savings account exists with starting operational balance
  if not exists (select 1 from public.accounts where user_id = v_user_id) then
    insert into public.accounts (user_id, branch_id, account_type, balance, status)
    values (v_user_id, v_branch_id, 'savings', 100000.00, 'active');
  else
    update public.accounts
    set status = 'active'
    where user_id = v_user_id;
  end if;

  raise notice 'Successfully configured admin account: % with password: %', v_admin_email, v_password;
end $$;

-- Verify the admin account was created
select p.id, p.full_name, p.email, p.role, a.account_number, a.balance, a.status
from public.profiles p
left join public.accounts a on a.user_id = p.id
where p.email = 'admin@smartbank.com';
