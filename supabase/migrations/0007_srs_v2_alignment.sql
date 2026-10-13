-- ============================================================
-- SmartBank — 0007_srs_v2_alignment.sql
-- Companion to: SRS v2.1 & design.md
--
-- This migration brings the database schema, RLS policies, and
-- money-moving RPCs into complete alignment with SRS v2.1:
--   1. Branches table + realistic Bangladesh branches seed
--   2. Audit logs table (uniform logging for money/admin actions)
--   3. Accounts table upgrades (branch_id, numeric(18,2), unique user index)
--   4. Transactions table upgrades (reference, type, branch_id, initiated_by, idempotency_key)
--   5. Notifications table upgrades (related_transaction_id)
--   6. Profiles role check expansion (customer, teller, admin)
--   7. Full RLS security according to design.md §4
--   8. Money-moving & security RPCs:
--      - gen_reference()
--      - lookup_recipient(p_account_number)
--      - app_transfer(recipient, amount, description, idempotency_key)
--      - app_withdraw(amount, idempotency_key)
--      - app_deposit(target_account, branch_id, amount, note, idempotency_key)
--      - admin_set_account_status(account_id, status, reason)
--      - ensure_user_profile() with branch support
--      - Updated handle_new_user() trigger with branch selection
--   9. Deprecate customer self-deposit (deposit_funds)
--
-- Idempotent & safe to re-run.
-- ============================================================

-- ---------- 1. Role & Status Constraints ----------

-- Ensure profiles.role permits 'teller'
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('customer', 'teller', 'admin'));

-- ---------- 2. Branches Table ----------

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

create index if not exists branches_active_idx on public.branches(is_active);
create index if not exists branches_district_idx on public.branches(district);

-- Seed realistic Bangladesh demo branches (if not already seeded)
insert into public.branches (branch_code, name, district, address, routing_code, is_active)
values
  ('BR-DHK-001', 'Dhaka Motijheel Main Branch', 'Dhaka', '12 Motijheel Commercial Area, Dhaka 1000', 'SMART-001', true),
  ('BR-DHK-002', 'Gulshan Corporate Branch', 'Dhaka', 'Plot 45, Road 11, Gulshan-1, Dhaka 1212', 'SMART-002', true),
  ('BR-CTG-001', 'Agrabad Commercial Branch', 'Chittagong', 'Agrabad C/A, Chittagong 4100', 'SMART-003', true),
  ('BR-SYL-001', 'Zindabazar Branch', 'Sylhet', 'Zindabazar Point, Sylhet 3100', 'SMART-004', true),
  ('BR-RAJ-001', 'Saheb Bazar Branch', 'Rajshahi', 'Saheb Bazar Zero Point, Rajshahi 6000', 'SMART-005', true),
  ('BR-KHU-001', 'KDA Avenue Branch', 'Khulna', 'KDA Commercial Area, Khulna 9100', 'SMART-006', true),
  ('BR-BAR-001', 'Sadat Road Branch', 'Barishal', 'Sadat Road, Barishal 8200', 'SMART-007', true),
  ('BR-BOG-001', 'Bogura City Branch', 'Bogura', 'Satmatha, Bogura 5800', 'SMART-008', true)
on conflict (branch_code) do nothing;

-- ---------- 3. Audit Logs Table ----------

create table if not exists public.audit_logs (
  id             uuid primary key default gen_random_uuid(),
  actor_user_id  uuid references public.profiles(id),
  action         text not null,
  target_type    text,
  target_id      uuid,
  metadata       jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists audit_actor_idx on public.audit_logs(actor_user_id, created_at desc);
create index if not exists audit_action_idx on public.audit_logs(action);

-- ---------- 4. Accounts Table Upgrades ----------

-- Add branch_id to accounts
alter table public.accounts
  add column if not exists branch_id uuid references public.branches(id);

-- Backfill existing accounts with default branch (Dhaka Motijheel)
update public.accounts
set branch_id = (select id from public.branches where branch_code = 'BR-DHK-001' limit 1)
where branch_id is null;

-- Ensure numeric(18,2) precision
alter table public.accounts
  alter column balance type numeric(18,2);

-- Enforce exactly one savings account per user (FR-ACC-02, design.md §3.2)
create unique index if not exists one_account_per_user on public.accounts(user_id);
create index if not exists accounts_branch_idx on public.accounts(branch_id);

-- ---------- 5. Reference Generator Helper ----------

create or replace function public.gen_reference()
returns text
language sql
as $$
  select 'TXN-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
$$;

-- ---------- 6. Transactions Table Upgrades ----------

-- Add reference, branch_id, initiated_by, idempotency_key, and type
alter table public.transactions
  add column if not exists reference text,
  add column if not exists type text,
  add column if not exists branch_id uuid references public.branches(id),
  add column if not exists initiated_by uuid references public.profiles(id),
  add column if not exists idempotency_key text;

-- Sync transaction_type to type if present
update public.transactions
set type = transaction_type
where type is null and transaction_type is not null;

-- Backfill missing references for existing records
update public.transactions
set reference = public.gen_reference()
where reference is null;

-- Enforce constraints
alter table public.transactions
  alter column reference set not null,
  alter column amount type numeric(18,2);

alter table public.transactions
  drop constraint if exists transactions_type_check;

alter table public.transactions
  add constraint transactions_type_check
  check (type in ('transfer', 'withdrawal', 'deposit'));

create unique index if not exists uniq_txn_reference on public.transactions(reference);

create unique index if not exists uniq_idempotency on public.transactions(idempotency_key)
  where idempotency_key is not null;

create index if not exists txn_branch_idx on public.transactions(branch_id);
create index if not exists txn_initiated_idx on public.transactions(initiated_by);

-- ---------- 7. Notifications Upgrades ----------

alter table public.notifications
  add column if not exists related_transaction_id uuid references public.transactions(id);

create index if not exists notif_txn_idx on public.notifications(related_transaction_id);

-- ---------- 8. Row Level Security (design.md §4) ----------

alter table public.profiles      enable row level security;
alter table public.branches      enable row level security;
alter table public.accounts      enable row level security;
alter table public.transactions  enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs    enable row level security;

-- Admin check function
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

-- Staff check function (admin or teller)
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'teller')
  );
$$;

-- --- Profiles RLS ---
drop policy if exists profiles_select_all on public.profiles;
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- --- Branches RLS ---
drop policy if exists branch_read on public.branches;
create policy branch_read on public.branches
  for select using (auth.uid() is not null);

drop policy if exists branch_write on public.branches;
create policy branch_write on public.branches
  for all using (public.is_admin())
  with check (public.is_admin());

-- --- Accounts RLS ---
-- Owner reads own account; Admin reads all.
-- NO direct client INSERT or UPDATE policy! Changes happen exclusively via SECURITY DEFINER RPCs.
drop policy if exists accounts_read on public.accounts;
drop policy if exists accounts_select_own on public.accounts;
drop policy if exists accounts_select_admin on public.accounts;
create policy accounts_read on public.accounts
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists accounts_insert_own on public.accounts;
drop policy if exists accounts_update_admin on public.accounts;

-- --- Transactions RLS ---
-- Visible if user is sender or recipient account owner, or admin.
-- NO direct client INSERT policy! Produced strictly by RPCs.
drop policy if exists txn_read on public.transactions;
drop policy if exists transactions_select_parties on public.transactions;
drop policy if exists transactions_select_admin on public.transactions;
create policy txn_read on public.transactions
  for select using (
    public.is_admin()
    or sender_account_id in (select id from public.accounts where user_id = auth.uid())
    or receiver_account_id in (select id from public.accounts where user_id = auth.uid())
  );

drop policy if exists transactions_insert_nobody on public.transactions;

-- --- Notifications RLS ---
drop policy if exists notif_read on public.notifications;
drop policy if exists notifications_select_own on public.notifications;
create policy notif_read on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists notif_update on public.notifications;
drop policy if exists notifications_update_read on public.notifications;
create policy notif_update on public.notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- --- Audit Logs RLS ---
drop policy if exists audit_read on public.audit_logs;
create policy audit_read on public.audit_logs
  for select using (public.is_admin());

-- ---------- 9. Money & Security RPCs ----------

-- 9.1 Helper: Abbreviate name (e.g., 'Md. Robiul Islam' -> 'Md. R***', 'Rahim Uddin' -> 'Rahim U***')
create or replace function public.abbreviate_name(p_name text)
returns text
language plpgsql
immutable
as $$
declare
  v_parts text[];
  v_len   int;
begin
  if p_name is null or trim(p_name) = '' then
    return 'Customer';
  end if;

  v_parts := regexp_split_to_array(trim(p_name), '\s+');
  v_len   := array_length(v_parts, 1);

  if v_len = 1 then
    return substr(v_parts[1], 1, 1) || '***';
  elsif v_len = 2 then
    return v_parts[1] || ' ' || substr(v_parts[2], 1, 1) || '***';
  else
    return v_parts[1] || ' ' || substr(v_parts[2], 1, 1) || '***';
  end if;
end;
$$;

-- 9.2 Recipient Lookup (Minimal data exposure, FR-TRF-02, NFR-SEC-05, TC-21)
create or replace function public.lookup_recipient(p_account_number text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_acc   public.accounts;
  v_target_prof  public.profiles;
  v_target_br    public.branches;
  v_masked_acc   text;
  v_abbr_name    text;
  v_eligible     boolean;
begin
  if p_account_number is null or length(trim(p_account_number)) = 0 then
    return null;
  end if;

  select * into v_target_acc
  from public.accounts
  where account_number = upper(trim(p_account_number))
  limit 1;

  if not found then
    return null;
  end if;

  select * into v_target_prof
  from public.profiles
  where id = v_target_acc.user_id;

  select * into v_target_br
  from public.branches
  where id = v_target_acc.branch_id;

  -- Mask account number: e.g. "AC1000000001" -> "••••••0001"
  if length(v_target_acc.account_number) > 4 then
    v_masked_acc := repeat('•', length(v_target_acc.account_number) - 4) ||
                    substr(v_target_acc.account_number, length(v_target_acc.account_number) - 3);
  else
    v_masked_acc := '••••' || v_target_acc.account_number;
  end if;

  v_abbr_name := public.abbreviate_name(v_target_prof.full_name);
  v_eligible  := (v_target_acc.status = 'active' and v_target_acc.user_id <> auth.uid());

  return jsonb_build_object(
    'account_number', v_target_acc.account_number,
    'masked_account_number', v_masked_acc,
    'abbreviated_name', v_abbr_name,
    'account_type', v_target_acc.account_type,
    'branch_name', coalesce(v_target_br.name, 'Dhaka Main Branch'),
    'district', coalesce(v_target_br.district, 'Dhaka'),
    'status', v_target_acc.status,
    'eligible', v_eligible
  );
end;
$$;

grant execute on function public.lookup_recipient(text) to authenticated, anon;

-- 9.3 Atomic Internal Transfer (app_transfer - design.md §5.1, TC-03, TC-08, TC-13)
create or replace function public.app_transfer(
  p_recipient_account_number text,
  p_amount                   numeric,
  p_description              text,
  p_idempotency_key          text
) returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender    public.accounts;
  v_recipient public.accounts;
  v_txn       public.transactions;
  v_ref       text;
  v_amount    numeric(18,2);
  v_first_id  uuid;
  v_second_id uuid;
begin
  -- 0. Idempotency check: if we've already processed this key, return that result
  if p_idempotency_key is not null then
    select * into v_txn from public.transactions where idempotency_key = p_idempotency_key;
    if found then
      return v_txn;
    end if;
  end if;

  -- 1. Validate amount (FR-TRF-13, TC-23)
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'invalid_amount'
      using errcode = 'P0001',
            hint    = 'Amount must be positive and have at most 2 decimal places.';
  end if;

  if p_amount > 500000.00 then
    raise exception 'invalid_amount'
      using errcode = 'P0001',
            hint    = 'Amount exceeds maximum per-transaction limit (৳500,000.00).';
  end if;

  v_amount := round(p_amount, 2);

  -- 2. Lookup sender account
  select * into v_sender
  from public.accounts
  where user_id = auth.uid();

  if not found then
    raise exception 'no_account'
      using errcode = 'P0001',
            hint    = 'Sender account not found.';
  end if;

  -- Lookup recipient account
  select * into v_recipient
  from public.accounts
  where account_number = upper(trim(p_recipient_account_number));

  if not found then
    raise exception 'recipient_not_found'
      using errcode = 'P0001',
            hint    = 'No SmartBank account found for that number.';
  end if;

  -- 3. Business rule checks
  if v_recipient.id = v_sender.id then
    raise exception 'self_transfer'
      using errcode = 'P0001',
            hint    = 'You cannot transfer to your own account.';
  end if;

  if v_sender.status <> 'active' then
    raise exception 'account_inactive'
      using errcode = 'P0001',
            hint    = format('Sender account is %s.', v_sender.status);
  end if;

  if v_recipient.status <> 'active' then
    raise exception 'recipient_inactive'
      using errcode = 'P0001',
            hint    = 'Recipient account is not active.';
  end if;

  -- 4. Lock both accounts in consistent UUID order to prevent deadlocks (TC-08)
  if v_sender.id < v_recipient.id then
    perform 1 from public.accounts where id = v_sender.id for update;
    perform 1 from public.accounts where id = v_recipient.id for update;
  else
    perform 1 from public.accounts where id = v_recipient.id for update;
    perform 1 from public.accounts where id = v_sender.id for update;
  end if;

  -- Refresh locked rows
  select * into v_sender from public.accounts where id = v_sender.id;
  select * into v_recipient from public.accounts where id = v_recipient.id;

  if v_sender.balance < v_amount then
    raise exception 'insufficient_balance'
      using errcode = 'P0001',
            hint    = 'You do not have enough balance for this transfer.';
  end if;

  -- 5. Move the money
  update public.accounts
  set balance = balance - v_amount
  where id = v_sender.id;

  update public.accounts
  set balance = balance + v_amount
  where id = v_recipient.id;

  -- 6. Record transaction
  v_ref := public.gen_reference();

  insert into public.transactions (
    reference,
    type,
    transaction_type,
    status,
    amount,
    sender_account_id,
    receiver_account_id,
    branch_id,
    description,
    initiated_by,
    idempotency_key
  ) values (
    v_ref,
    'transfer',
    'transfer',
    'completed',
    v_amount,
    v_sender.id,
    v_recipient.id,
    v_recipient.branch_id,
    p_description,
    auth.uid(),
    p_idempotency_key
  )
  returning * into v_txn;

  -- 7. Audit log
  insert into public.audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  ) values (
    auth.uid(),
    'transfer',
    'transaction',
    v_txn.id,
    jsonb_build_object(
      'amount', v_amount,
      'sender_account', v_sender.account_number,
      'recipient_account', v_recipient.account_number,
      'reference', v_ref
    )
  );

  -- 8. Notifications
  insert into public.notifications (user_id, title, message, related_transaction_id)
  values
    (
      v_recipient.user_id,
      'Money received',
      format('You received ৳%s from %s', to_char(v_amount, 'FM999,999,990.00'), v_sender.account_number),
      v_txn.id
    ),
    (
      v_sender.user_id,
      'Transfer sent',
      format('You sent ৳%s to %s', to_char(v_amount, 'FM999,999,990.00'), v_recipient.account_number),
      v_txn.id
    );

  return v_txn;
end;
$$;

grant execute on function public.app_transfer(text, numeric, text, text) to authenticated;

-- 9.4 Simulated Withdrawal (app_withdraw - FR-WD-01..06, TC-16, TC-17)
create or replace function public.app_withdraw(
  p_amount          numeric,
  p_idempotency_key text
) returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.accounts;
  v_txn     public.transactions;
  v_ref     text;
  v_amount  numeric(18,2);
begin
  -- Idempotency check
  if p_idempotency_key is not null then
    select * into v_txn from public.transactions where idempotency_key = p_idempotency_key;
    if found then
      return v_txn;
    end if;
  end if;

  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'invalid_amount'
      using errcode = 'P0001',
            hint    = 'Amount must be positive and have at most 2 decimal places.';
  end if;

  v_amount := round(p_amount, 2);

  -- Lock account
  select * into v_account
  from public.accounts
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'no_account'
      using errcode = 'P0001',
            hint    = 'No bank account is linked to your profile.';
  end if;

  if v_account.status <> 'active' then
    raise exception 'account_inactive'
      using errcode = 'P0001',
            hint    = format('Account is %s.', v_account.status);
  end if;

  if v_account.balance < v_amount then
    raise exception 'insufficient_balance'
      using errcode = 'P0001',
            hint    = 'You do not have enough balance for this withdrawal.';
  end if;

  -- Debit balance
  update public.accounts
  set balance = balance - v_amount
  where id = v_account.id;

  v_ref := public.gen_reference();

  insert into public.transactions (
    reference,
    type,
    transaction_type,
    status,
    amount,
    sender_account_id,
    receiver_account_id,
    branch_id,
    description,
    initiated_by,
    idempotency_key
  ) values (
    v_ref,
    'withdrawal',
    'withdrawal',
    'completed',
    v_amount,
    v_account.id,
    null,
    v_account.branch_id,
    'Simulated cash withdrawal',
    auth.uid(),
    p_idempotency_key
  )
  returning * into v_txn;

  -- Audit log
  insert into public.audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  ) values (
    auth.uid(),
    'withdrawal',
    'transaction',
    v_txn.id,
    jsonb_build_object(
      'amount', v_amount,
      'account_number', v_account.account_number,
      'reference', v_ref
    )
  );

  -- Notification
  insert into public.notifications (user_id, title, message, related_transaction_id)
  values (
    auth.uid(),
    'Money Withdrawn',
    format('৳%s withdrawn from your account (Ref: %s).', to_char(v_amount, 'FM999,999,990.00'), v_ref),
    v_txn.id
  );

  return v_txn;
end;
$$;

grant execute on function public.app_withdraw(numeric, text) to authenticated;

-- 9.5 Staff Simulated Branch Cash Deposit (app_deposit - FR-DEP-01..08, TC-11, TC-12)
create or replace function public.app_deposit(
  p_target_account_number text,
  p_branch_id             uuid,
  p_amount                numeric,
  p_reference_note        text,
  p_idempotency_key       text
) returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role  text;
  v_target_acc   public.accounts;
  v_branch       public.branches;
  v_txn          public.transactions;
  v_ref          text;
  v_amount       numeric(18,2);
begin
  -- 1. Authorization check: Staff only (FR-DEP-02, TC-12)
  select role into v_caller_role from public.profiles where id = auth.uid();
  if v_caller_role not in ('teller', 'admin') then
    raise exception 'not_authorized'
      using errcode = 'P0001',
            hint    = 'Only authorized tellers or administrators may record branch cash deposits.';
  end if;

  -- 2. Idempotency check
  if p_idempotency_key is not null then
    select * into v_txn from public.transactions where idempotency_key = p_idempotency_key;
    if found then
      return v_txn;
    end if;
  end if;

  -- 3. Amount validation
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'invalid_amount'
      using errcode = 'P0001',
            hint    = 'Amount must be positive and have at most 2 decimal places.';
  end if;

  v_amount := round(p_amount, 2);

  -- 4. Branch check
  select * into v_branch from public.branches where id = p_branch_id and is_active = true;
  if not found then
    raise exception 'branch_not_found'
      using errcode = 'P0001',
            hint    = 'Receiving branch is invalid or inactive.';
  end if;

  -- 5. Target account check & lock
  select * into v_target_acc
  from public.accounts
  where account_number = upper(trim(p_target_account_number))
  for update;

  if not found then
    raise exception 'account_not_found'
      using errcode = 'P0001',
            hint    = 'Target account does not exist.';
  end if;

  if v_target_acc.status <> 'active' then
    raise exception 'account_inactive'
      using errcode = 'P0001',
            hint    = 'Target account is not active.';
  end if;

  -- 6. Credit balance
  update public.accounts
  set balance = balance + v_amount
  where id = v_target_acc.id;

  v_ref := public.gen_reference();

  -- 7. Insert deposit transaction
  insert into public.transactions (
    reference,
    type,
    transaction_type,
    status,
    amount,
    sender_account_id,
    receiver_account_id,
    branch_id,
    description,
    initiated_by,
    idempotency_key
  ) values (
    v_ref,
    'deposit',
    'deposit',
    'completed',
    v_amount,
    null,
    v_target_acc.id,
    p_branch_id,
    coalesce(p_reference_note, 'Simulated branch cash deposit'),
    auth.uid(),
    p_idempotency_key
  )
  returning * into v_txn;

  -- 8. Audit log
  insert into public.audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  ) values (
    auth.uid(),
    'deposit',
    'transaction',
    v_txn.id,
    jsonb_build_object(
      'amount', v_amount,
      'target_account', v_target_acc.account_number,
      'branch_name', v_branch.name,
      'reference', v_ref,
      'operator_note', p_reference_note
    )
  );

  -- 9. Notification to customer
  insert into public.notifications (user_id, title, message, related_transaction_id)
  values (
    v_target_acc.user_id,
    'Cash Deposit Received',
    format('৳%s deposited at %s (Ref: %s).', to_char(v_amount, 'FM999,999,990.00'), v_branch.name, v_ref),
    v_txn.id
  );

  return v_txn;
end;
$$;

grant execute on function public.app_deposit(text, uuid, numeric, text, text) to authenticated;

-- 9.6 Admin Status Control with Audit Logging (TC-15)
create or replace function public.admin_set_account_status(
  p_account_id uuid,
  p_status     text,
  p_reason     text
) returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_acc      public.accounts;
  v_prev     text;
begin
  if not public.is_admin() then
    raise exception 'not_authorized'
      using errcode = 'P0001',
            hint    = 'Only administrators can update account status.';
  end if;

  if p_status not in ('active', 'inactive', 'blocked') then
    raise exception 'invalid_status'
      using errcode = 'P0001',
            hint    = 'Status must be active, inactive, or blocked.';
  end if;

  select * into v_acc from public.accounts where id = p_account_id for update;
  if not found then
    raise exception 'account_not_found'
      using errcode = 'P0001';
  end if;

  v_prev := v_acc.status;

  update public.accounts
  set status = p_status
  where id = p_account_id
  returning * into v_acc;

  insert into public.audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  ) values (
    auth.uid(),
    'account.status_change',
    'account',
    p_account_id,
    jsonb_build_object(
      'previous_status', v_prev,
      'new_status', p_status,
      'reason', coalesce(p_reason, 'Admin status update')
    )
  );

  return v_acc;
end;
$$;

grant execute on function public.admin_set_account_status(uuid, text, text) to authenticated;

-- 9.7 Deprecate Customer Self-Deposit (BR-01, FR-DEP-01, TC-10)
create or replace function public.deposit_funds(p_amount numeric)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'customer_deposit_disabled'
    using errcode = 'P0001',
          hint    = 'Customer self-deposit is not permitted. Deposits must be conducted through an authorized branch teller.';
end;
$$;

-- 9.8 Updated ensure_user_profile() with branch support
create or replace function public.ensure_user_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id    uuid;
  v_email      text;
  v_metadata   jsonb;
  v_profile    public.profiles;
  v_branch_id  uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated'
      using errcode = 'P0001';
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

  -- Determine branch
  if v_metadata->>'branch_id' is not null then
    select id into v_branch_id from public.branches where id = (v_metadata->>'branch_id')::uuid and is_active = true;
  end if;

  if v_branch_id is null then
    select id into v_branch_id from public.branches where branch_code = 'BR-DHK-001' limit 1;
  end if;

  -- Insert savings account if missing
  if not exists (select 1 from public.accounts where user_id = v_user_id) then
    insert into public.accounts (user_id, branch_id, account_type, balance, status)
    values (v_user_id, v_branch_id, 'savings', 0, 'active');
  end if;

  return v_profile;
end;
$$;

grant execute on function public.ensure_user_profile() to authenticated, anon;

-- 9.9 Updated handle_new_user() Trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  -- Insert profile (defaults to customer role, FR-ADM-01, TC-22)
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'Customer'), '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', null),
    'customer'
  )
  on conflict (id) do nothing;

  -- Lookup requested branch or fallback to Dhaka Main
  if new.raw_user_meta_data->>'branch_id' is not null then
    select id into v_branch_id
    from public.branches
    where id = (new.raw_user_meta_data->>'branch_id')::uuid and is_active = true;
  end if;

  if v_branch_id is null then
    select id into v_branch_id
    from public.branches
    where branch_code = 'BR-DHK-001'
    limit 1;
  end if;

  -- Insert savings account linked to branch
  if not exists (select 1 from public.accounts where user_id = new.id) then
    insert into public.accounts (user_id, branch_id, account_type, balance, status)
    values (new.id, v_branch_id, 'savings', 0, 'active');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Done!
-- Verification:
--   select count(*) from public.branches;  -- Expect 8
--   select column_name from information_schema.columns where table_name='accounts' and column_name='branch_id';
