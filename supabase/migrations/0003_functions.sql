-- ============================================================
-- SmartBank — 0003_functions.sql
-- Atomic financial RPCs and admin helpers.
-- Matches plan.md §8.3 and §15.
-- Idempotent: safe to re-run.
-- ============================================================

-- ---------- get_my_account ----------
-- Returns the calling user's account. Raises 'no_account' if missing.
create or replace function public.get_my_account()
returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.accounts;
begin
  select * into v_account
  from public.accounts
  where user_id = auth.uid()
  limit 1;

  if not found then
    raise exception 'no_account'
      using errcode = 'P0001',
            hint    = 'No bank account is linked to your profile yet.';
  end if;

  return v_account;
end;
$$;

-- ---------- deposit_funds ----------
create or replace function public.deposit_funds(p_amount numeric)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.accounts;
  v_tx      public.transactions;
  v_amount  numeric(15, 2);
begin
  -- Input validation.
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount'
      using errcode = 'P0001',
            hint    = 'Amount must be greater than zero.';
  end if;

  v_amount := round(p_amount, 2);

  -- Lock the row so concurrent RPCs can't race.
  select * into v_account
  from public.accounts
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'no_account'
      using errcode = 'P0001';
  end if;

  if v_account.status <> 'active' then
    raise exception 'account_inactive'
      using errcode = 'P0001',
            hint    = format('Account status is %s.', v_account.status);
  end if;

  -- Update balance.
  update public.accounts
  set balance = balance + v_amount
  where id = v_account.id;

  -- Insert transaction.
  insert into public.transactions
    (sender_account_id, receiver_account_id, amount, transaction_type, description, status)
  values
    (null, v_account.id, v_amount, 'deposit', 'Self deposit', 'completed')
  returning * into v_tx;

  -- Insert notification.
  insert into public.notifications (user_id, title, message)
  values (
    auth.uid(),
    'Money Deposited',
    format('৳%s has been added to your account.', v_amount::text)
  );

  return v_tx;
end;
$$;

-- ---------- withdraw_funds ----------
create or replace function public.withdraw_funds(p_amount numeric)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.accounts;
  v_tx      public.transactions;
  v_amount  numeric(15, 2);
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount'
      using errcode = 'P0001',
            hint    = 'Amount must be greater than zero.';
  end if;

  v_amount := round(p_amount, 2);

  select * into v_account
  from public.accounts
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'no_account'
      using errcode = 'P0001';
  end if;

  if v_account.status <> 'active' then
    raise exception 'account_inactive'
      using errcode = 'P0001';
  end if;

  if v_account.balance < v_amount then
    raise exception 'insufficient_balance'
      using errcode = 'P0001',
            hint    = 'You do not have enough balance for this withdrawal.';
  end if;

  update public.accounts
  set balance = balance - v_amount
  where id = v_account.id;

  insert into public.transactions
    (sender_account_id, receiver_account_id, amount, transaction_type, description, status)
  values
    (v_account.id, null, v_amount, 'withdrawal', 'Self withdrawal', 'completed')
  returning * into v_tx;

  insert into public.notifications (user_id, title, message)
  values (
    auth.uid(),
    'Money Withdrawn',
    format('৳%s has been withdrawn from your account.', v_amount::text)
  );

  return v_tx;
end;
$$;

-- ---------- transfer_money ----------
-- Atomic debit/credit of two accounts. Uses SELECT ... FOR UPDATE
-- on both rows in a deterministic order (by id) to avoid deadlocks.
create or replace function public.transfer_money(
  p_recipient_account_number text,
  p_amount                   numeric,
  p_description              text default null
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender    public.accounts;
  v_recipient public.accounts;
  v_tx        public.transactions;
  v_amount    numeric(15, 2);
  v_first_id  uuid;
  v_second_id uuid;
begin
  -- Validate amount.
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount'
      using errcode = 'P0001',
            hint    = 'Amount must be greater than zero.';
  end if;

  if p_recipient_account_number is null or length(trim(p_recipient_account_number)) = 0 then
    raise exception 'recipient_not_found'
      using errcode = 'P0001',
            hint    = 'Please provide a recipient account number.';
  end if;

  v_amount := round(p_amount, 2);

  -- Sender.
  select * into v_sender
  from public.accounts
  where user_id = auth.uid();

  if not found then
    raise exception 'no_account'
      using errcode = 'P0001';
  end if;

  -- Recipient.
  select * into v_recipient
  from public.accounts
  where account_number = trim(p_recipient_account_number);

  if not found then
    raise exception 'recipient_not_found'
      using errcode = 'P0001',
            hint    = 'No account exists with that account number.';
  end if;

  if v_recipient.id = v_sender.id then
    raise exception 'self_transfer'
      using errcode = 'P0001',
            hint    = 'You cannot transfer money to your own account.';
  end if;

  if v_sender.status <> 'active' then
    raise exception 'account_inactive'
      using errcode = 'P0001',
            hint    = 'Your account is not active.';
  end if;

  if v_recipient.status <> 'active' then
    raise exception 'recipient_inactive'
      using errcode = 'P0001',
            hint    = 'The recipient account is not active.';
  end if;

  if v_sender.balance < v_amount then
    raise exception 'insufficient_balance'
      using errcode = 'P0001',
            hint    = 'You do not have enough balance for this transfer.';
  end if;

  -- Lock both rows in a deterministic order to prevent deadlocks.
  if v_sender.id < v_recipient.id then
    v_first_id  := v_sender.id;
    v_second_id := v_recipient.id;
  else
    v_first_id  := v_recipient.id;
    v_second_id := v_sender.id;
  end if;

  perform 1 from public.accounts where id = v_first_id  for update;
  perform 1 from public.accounts where id = v_second_id for update;

  -- Re-check balance after lock.
  select balance into v_sender.balance
  from public.accounts where id = v_sender.id;

  if v_sender.balance < v_amount then
    raise exception 'insufficient_balance'
      using errcode = 'P0001';
  end if;

  -- Apply.
  update public.accounts set balance = balance - v_amount where id = v_sender.id;
  update public.accounts set balance = balance + v_amount where id = v_recipient.id;

  -- Record transaction.
  insert into public.transactions
    (sender_account_id, receiver_account_id, amount, transaction_type, description, status)
  values
    (v_sender.id, v_recipient.id, v_amount, 'transfer',
     coalesce(nullif(trim(p_description), ''), 'Money transfer'),
     'completed')
  returning * into v_tx;

  -- Notifications for both parties.
  insert into public.notifications (user_id, title, message)
  values (
    v_sender.user_id,
    'Money Sent',
    format('৳%s was sent to account %s.', v_amount::text, v_recipient.account_number)
  );

  insert into public.notifications (user_id, title, message)
  values (
    v_recipient.user_id,
    'Money Received',
    format('You received ৳%s from account %s.', v_amount::text, v_sender.account_number)
  );

  return v_tx;
end;
$$;

-- ---------- admin_update_account_status ----------
create or replace function public.admin_update_account_status(
  p_account_id uuid,
  p_status     text
)
returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.accounts;
begin
  if not public.is_admin() then
    raise exception 'not_authorized'
      using errcode = 'P0001',
            hint    = 'Only admins can change account status.';
  end if;

  if p_status not in ('active', 'inactive', 'blocked') then
    raise exception 'invalid_status'
      using errcode = 'P0001',
            hint    = 'Status must be active, inactive, or blocked.';
  end if;

  update public.accounts
  set status = p_status
  where id = p_account_id
  returning * into v_account;

  if not found then
    raise exception 'account_not_found'
      using errcode = 'P0001';
  end if;

  return v_account;
end;
$$;

-- ---------- lookup_account ----------
-- Public lookup of account status by account number (no sensitive data).
-- Needed by customers for Send Money recipient validation.
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

-- ---------- ensure_user_profile ----------
-- Self-healing RPC: provisions missing profile and account for the signed-in user.
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

-- Grant execute on all RPCs to the anon role so authenticated users
-- (which are essentially anon + JWT) can call them. The functions
-- themselves enforce auth.uid() and is_admin() checks.
grant execute on function public.get_my_account()                                  to anon, authenticated;
grant execute on function public.deposit_funds(numeric)                             to anon, authenticated;
grant execute on function public.withdraw_funds(numeric)                            to anon, authenticated;
grant execute on function public.transfer_money(text, numeric, text)                to anon, authenticated;
grant execute on function public.admin_update_account_status(uuid, text)            to anon, authenticated;
grant execute on function public.is_admin()                                          to anon, authenticated;
grant execute on function public.lookup_account(text)                               to anon, authenticated;
grant execute on function public.ensure_user_profile()                              to anon, authenticated;

-- Done.
-- Verification:
--   select proname from pg_proc where pronamespace='public'::regnamespace
--   and proname in ('get_my_account','deposit_funds','withdraw_funds',
--                  'transfer_money','admin_update_account_status','is_admin',
--                  'lookup_account','ensure_user_profile')
--   order by 1;
-- All eight should appear.