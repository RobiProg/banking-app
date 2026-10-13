-- ============================================================
-- SmartBank — Seed Data (seed.sql)
-- Companion to: SRS v2.1 & design.md §10 / §11
--
-- This script seeds demo branches, demo balances, and initial
-- states for educational and test demonstration.
--
-- Note: User authentication accounts must be registered through
-- Supabase Auth (or the mobile app signup screen) first, after which
-- this script can be used to set starting demo balances and roles.
-- ============================================================

-- ---------- 1. Seed Demo Branches (8 Bangladesh Districts) ----------
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
on conflict (branch_code) do update set
  name = excluded.name,
  district = excluded.district,
  address = excluded.address,
  is_active = excluded.is_active;

-- ---------- 2. Demo User Helpers (Customizable) ----------
-- To grant admin or teller role to a user after signing up:
--
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE email = 'admin@smartbank.test';
--
-- UPDATE public.profiles
-- SET role = 'teller'
-- WHERE email = 'teller@smartbank.test';

-- To set initial demo balances for test customer accounts:
--
-- UPDATE public.accounts
-- SET balance = 50000.00
-- WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'customer1@smartbank.test');
--
-- UPDATE public.accounts
-- SET balance = 15000.00
-- WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'customer2@smartbank.test');

-- Verification query:
-- SELECT
--   p.full_name,
--   p.email,
--   p.role,
--   a.account_number,
--   a.balance,
--   a.status as account_status,
--   b.name as branch_name,
--   b.district
-- FROM public.profiles p
-- JOIN public.accounts a ON a.user_id = p.id
-- LEFT JOIN public.branches b ON b.id = a.branch_id
-- ORDER BY p.created_at DESC;
