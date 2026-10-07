# SmartBank - AI Agent Implementation Plan

## 1. Project Overview

Build **SmartBank**, a basic digital banking mobile application for a university App Development project.

### Core Stack

- **Mobile:** React Native
- **Development:** Expo
- **Backend:** Supabase
- **Database:** PostgreSQL through Supabase
- **Authentication:** Supabase Auth
- **Security:** Supabase Row Level Security (RLS)
- **Server-side financial operations:** PostgreSQL functions / Supabase RPC
- **Version control:** Git

### Project Goal

Create a clean, functional, educational banking simulation with:

- Customer registration and login
- Customer profile
- Bank account
- Balance viewing
- Deposit
- Withdrawal
- Money transfer
- Transaction history
- Notifications
- Admin dashboard
- User/account/transaction management

> This is an educational simulation. It must NOT process real money or connect to a real banking institution.

---

# 2. Scope Rules

## Must Implement

1. Authentication
2. Customer profiles
3. Bank accounts
4. Balance
5. Deposit
6. Withdrawal
7. Send money
8. Transaction history
9. Transaction details
10. Notifications
11. Admin authentication
12. Admin dashboard
13. User management
14. Account management
15. Transaction monitoring
16. Proper database security with RLS
17. Server-side/atomic transaction processing

## Do NOT Implement in the Initial Version

Do not add:

- Loans
- Credit cards
- Virtual cards
- Mobile recharge
- Utility bill payment
- Investments
- Cryptocurrency
- QR payments
- Real payment gateways
- Real bank API integration
- AI fraud detection
- Complex KYC
- Complex biometric authentication
- Chat/support system

These may be listed as future enhancements but should not be implemented unless explicitly requested.

---

# 3. Development Principles

The AI agent must follow these principles:

1. Prefer simple, maintainable code.
2. Do not over-engineer the application.
3. Follow the existing project structure if the repository already contains one.
4. Do not replace working code unnecessarily.
5. Keep components reusable.
6. Keep business logic separate from UI where practical.
7. Never trust client-side validation for financial operations.
8. Never directly modify account balances from untrusted client-side logic.
9. Use Supabase RLS for data access protection.
10. Use PostgreSQL functions/RPC for financial operations.
11. Handle loading, success, empty, and error states.
12. Use clear user-facing error messages.
13. Do not expose Supabase service-role keys in the React Native application.
14. Never hardcode passwords, secrets, API keys, or private credentials.
15. Keep the UI suitable for a university project: clean, modern, and understandable.

---

# 4. Recommended Project Structure

Use a structure similar to:

```text
SmartBank/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   │
│   ├── (customer)/
│   │   ├── index.tsx
│   │   ├── account.tsx
│   │   ├── deposit.tsx
│   │   ├── withdraw.tsx
│   │   ├── send-money.tsx
│   │   ├── transactions.tsx
│   │   ├── transaction-details.tsx
│   │   ├── notifications.tsx
│   │   └── profile.tsx
│   │
│   └── (admin)/
│       ├── index.tsx
│       ├── users.tsx
│       ├── accounts.tsx
│       └── transactions.tsx
│
├── components/
│   ├── common/
│   ├── forms/
│   ├── banking/
│   └── admin/
│
├── lib/
│   ├── supabase.ts
│   └── constants.ts
│
├── services/
│   ├── auth.ts
│   ├── accounts.ts
│   ├── transactions.ts
│   └── notifications.ts
│
├── hooks/
│
├── types/
│
├── utils/
│
├── supabase/
│   ├── migrations/
│   └── seed.sql
│
├── assets/
│
├── .env
├── .gitignore
├── package.json
└── plan.md
```

If the project uses React Navigation instead of Expo Router, adapt the navigation structure while preserving the same logical screens.

---

# 5. Phase 0 - Inspect the Existing Project

Before making changes:

1. Inspect the repository.
2. Identify whether the project uses Expo or bare React Native.
3. Identify the existing navigation solution.
4. Identify installed dependencies.
5. Check whether Supabase is already configured.
6. Check whether TypeScript or JavaScript is being used.
7. Do not convert JavaScript to TypeScript or vice versa unless explicitly requested.
8. Preserve existing working configuration.

After inspection, document any important existing decisions before implementation.

---

# 6. Phase 1 - Project Setup

## Tasks

- Configure React Native/Expo project.
- Install/configure Supabase client.
- Create environment configuration.
- Create Supabase client module.
- Add `.env` to `.gitignore`.
- Verify the app can connect to Supabase.

### Environment

Use public Supabase client configuration appropriate for a mobile client.

Never place the Supabase service-role key in the mobile application.

### Acceptance Criteria

- App starts successfully.
- Supabase client initializes without errors.
- No secret credentials are committed to Git.

---

# 7. Phase 2 - Supabase Authentication

Use Supabase Auth.

## Customer Authentication

Implement:

- Register
- Login
- Logout
- Session persistence
- Authentication state handling

Registration fields:

```text
Full Name
Email
Phone
Password
Confirm Password
```

## Requirements

- Validate required fields.
- Validate email.
- Validate password confirmation.
- Handle duplicate email.
- Handle invalid login.
- Show loading state.
- Show meaningful errors.

## Acceptance Criteria

A new user can:

```text
Register
   ↓
Authenticate
   ↓
Create profile
   ↓
Create bank account
   ↓
Open customer dashboard
```

---

# 8. Phase 3 - Database Schema

Create PostgreSQL tables in Supabase.

## 8.1 profiles

Fields:

```text
id UUID PRIMARY KEY
full_name TEXT NOT NULL
email TEXT
phone TEXT
role TEXT NOT NULL DEFAULT 'customer'
created_at TIMESTAMPTZ DEFAULT now()
```

Recommended role values:

```text
customer
admin
```

The `id` should reference the authenticated Supabase user.

---

## 8.2 accounts

Fields:

```text
id UUID PRIMARY KEY
user_id UUID NOT NULL
account_number TEXT UNIQUE NOT NULL
account_type TEXT NOT NULL DEFAULT 'savings'
balance NUMERIC(15,2) NOT NULL DEFAULT 0
status TEXT NOT NULL DEFAULT 'active'
created_at TIMESTAMPTZ DEFAULT now()
```

Recommended account statuses:

```text
active
inactive
blocked
```

Important:

- Balance must never become negative.
- Account number must be unique.
- Monetary values must use an appropriate numeric/decimal database type.
- Do not use floating-point values for money calculations.

---

## 8.3 transactions

Fields:

```text
id UUID PRIMARY KEY
sender_account_id UUID NULL
receiver_account_id UUID NULL
amount NUMERIC(15,2) NOT NULL
transaction_type TEXT NOT NULL
description TEXT NULL
status TEXT NOT NULL
created_at TIMESTAMPTZ DEFAULT now()
```

Transaction types:

```text
deposit
withdrawal
transfer
```

Transaction statuses:

```text
completed
failed
```

Optional future status:

```text
pending
```

---

## 8.4 notifications

Fields:

```text
id UUID PRIMARY KEY
user_id UUID NOT NULL
title TEXT NOT NULL
message TEXT NOT NULL
is_read BOOLEAN NOT NULL DEFAULT false
created_at TIMESTAMPTZ DEFAULT now()
```

---

# 9. Phase 4 - Database Relationships

Implement relationships:

```text
auth.users
    │
    └── profiles
            │
            └── accounts
                    │
                    └── transactions
```

Notifications:

```text
profiles
    │
    └── notifications
```

A customer may have one account in the initial version.

Do not add unnecessary account types or complex banking relationships.

---

# 10. Phase 5 - Row Level Security

RLS is mandatory.

## Profiles

Customer:

- Can view own profile.
- Can update own permitted profile fields.

Admin:

- Can view customer profiles.
- Can perform permitted administrative actions.

## Accounts

Customer:

- Can view only their own account.

Admin:

- Can view accounts.

Customers must not be able to directly update:

```text
balance
status
user_id
```

from the client.

## Transactions

Customer:

- Can view transactions involving their own account.

Admin:

- Can view all transactions.

Customers should not be allowed to insert arbitrary financial transaction records directly.

## Notifications

Customer:

- Can view own notifications.
- Can mark own notifications as read.

Admin:

- Can access notifications where necessary.

---

# 11. Phase 6 - Account Creation

After successful registration:

1. Create profile.
2. Generate a unique account number.
3. Create savings account.
4. Set initial balance to zero.
5. Set status to active.
6. Redirect user to dashboard.

Account number generation must happen safely and must guarantee uniqueness.

Example format:

```text
1000000001
1000000002
1000000003
```

Do not generate account numbers using only a random client-side value without uniqueness validation.

---

# 12. Phase 7 - Customer Dashboard

Create the main customer home screen.

Display:

```text
Hello, [Name]

Available Balance
৳45,500.00

Savings Account
****4521

[Send Money]
[Deposit]
[Withdraw]

Recent Transactions
```

Dashboard should show:

- Customer name
- Current balance
- Masked account number
- Quick actions
- Recent transactions

Do not expose unnecessary sensitive information.

---

# 13. Phase 8 - Deposit

Deposit is a simulated banking operation.

Flow:

```text
Deposit Screen
     ↓
Enter amount
     ↓
Validate amount
     ↓
Call secure database operation
     ↓
Increase balance
     ↓
Create transaction
     ↓
Create notification
     ↓
Show success
```

Validation:

- Amount must be numeric.
- Amount must be greater than zero.
- Account must be active.
- Reject invalid amounts.

The balance update and transaction insertion should happen atomically.

---

# 14. Phase 9 - Withdrawal

Flow:

```text
Withdraw Screen
      ↓
Enter amount
      ↓
Validate amount
      ↓
Check account status
      ↓
Check balance
      ↓
Secure database operation
      ↓
Deduct balance
      ↓
Create transaction
      ↓
Create notification
      ↓
Show success
```

Rules:

- Amount > 0.
- Account must be active.
- Amount <= available balance.
- Balance must never become negative.

The balance update and transaction insertion must be atomic.

---

# 15. Phase 10 - Money Transfer

This is the most important financial operation.

Flow:

```text
Sender
  ↓
Enter recipient account number
  ↓
Enter amount
  ↓
Validate
  ↓
Find recipient
  ↓
Check sender account
  ↓
Check balance
  ↓
Database RPC/function
  ├── Deduct sender
  ├── Add receiver
  ├── Create transaction
  └── Create notifications
  ↓
Success
```

Validation:

- Recipient account must exist.
- Sender account must exist.
- Sender account must be active.
- Recipient account must be active.
- Amount must be greater than zero.
- Sender must have sufficient balance.
- Sender cannot transfer to their own account.

## Critical Security Requirement

Do NOT perform this as separate client-side operations:

```text
update sender
update receiver
insert transaction
```

Instead, use a PostgreSQL function/RPC so the operation is atomic.

If any step fails:

```text
ROLLBACK
```

The transfer must not partially complete.

---

# 16. Phase 11 - Transaction History

Create a transaction history screen.

Display:

```text
All
Deposit
Withdrawal
Transfer
```

Each row should show:

- Transaction type
- Amount
- Date/time
- Status
- Direction where applicable

Example:

```text
+ ৳5,000
Deposit
Today

- ৳2,000
Transfer
Today

- ৳1,000
Withdrawal
Yesterday
```

Add transaction details screen.

---

# 17. Phase 12 - Notifications

Generate notifications for:

### Deposit

```text
Money Deposited
৳5,000 has been added to your account.
```

### Withdrawal

```text
Money Withdrawn
৳1,000 has been withdrawn from your account.
```

### Transfer Sent

```text
Money Sent
৳2,000 was sent successfully.
```

### Transfer Received

```text
Money Received
You received ৳2,000.
```

Notification requirements:

- Store notification in database.
- Display unread indicator.
- Allow marking as read.

---

# 18. Phase 13 - Profile

Profile screen should show:

```text
Profile Picture (optional)
Full Name
Email
Phone
Account Number
Account Type
Account Status
```

Allow editing only appropriate fields.

Do not allow customers to change:

```text
role
balance
account_number
account status
```

---

# 19. Phase 14 - Admin

Create admin role support.

Admin dashboard:

```text
Admin Dashboard

Total Users
Total Accounts
Active Accounts
Total Transactions
```

Keep statistics simple.

---

# 20. Phase 15 - Admin User Management

Admin can:

- View users.
- Search users.
- View user details.
- View user account.
- Block/unblock users where appropriate.

Do not allow an admin to edit sensitive financial records arbitrarily.

---

# 21. Phase 16 - Admin Account Management

Admin can:

- View all accounts.
- Search account number.
- View account status.
- Activate account.
- Deactivate/block account.

Important:

Admin actions affecting account status should be protected by RLS/secure backend logic.

---

# 22. Phase 17 - Admin Transaction Monitoring

Admin can:

- View all transactions.
- Search by transaction ID.
- Search account number.
- Filter by transaction type.
- Filter by status.
- View transaction details.

Completed transaction records should be treated as historical records and should not be casually edited.

---

# 23. Phase 18 - Navigation

Customer navigation should be simple.

Recommended:

```text
Home
Transactions
Notifications
Profile
```

Quick actions from Home:

```text
Send Money
Deposit
Withdraw
```

Admin navigation:

```text
Dashboard
Users
Accounts
Transactions
```

Authentication flow:

```text
Splash
  ↓
Check Session
  ├── Not Logged In → Login
  │                    ↓
  │                  Register
  │
  └── Logged In → Check Role
                    ├── Customer → Customer App
                    └── Admin → Admin App
```

---

# 24. Phase 19 - UI/UX Requirements

Use a consistent design.

Requirements:

- Clean banking-style interface.
- Clear typography.
- Consistent spacing.
- Consistent buttons.
- Clear success/error states.
- Loading indicators.
- Empty states.
- Confirmation dialogs for financial operations.
- Responsive layouts for common Android screen sizes.

Avoid unnecessary animations.

The UI should prioritize clarity over decoration.

---

# 25. Phase 20 - Validation and Error Handling

Every important operation needs:

## Loading State

Example:

```text
Processing...
```

## Success State

Example:

```text
Transfer Successful
Transaction ID: TXN123456
```

## Error State

Examples:

```text
Invalid amount.
```

```text
Insufficient balance.
```

```text
Recipient account not found.
```

```text
Your account is inactive.
```

```text
Something went wrong. Please try again.
```

Never expose raw database errors to users.

---

# 26. Phase 21 - Testing

Test authentication:

- Valid registration
- Duplicate email
- Invalid email
- Wrong password
- Logout
- Session persistence

Test deposit:

- Valid amount
- Zero amount
- Negative amount
- Inactive account
- Balance update
- Transaction creation

Test withdrawal:

- Valid amount
- Zero amount
- Negative amount
- Insufficient balance
- Balance update
- Transaction creation

Test transfer:

- Valid recipient
- Invalid recipient
- Same account
- Insufficient balance
- Inactive sender
- Inactive receiver
- Successful transfer
- Failed transfer
- Atomic rollback

Test security:

- Customer cannot view another customer's account.
- Customer cannot modify balance directly.
- Customer cannot modify role.
- Customer cannot access admin screens.
- Customer cannot create arbitrary completed transactions.
- Admin-only functionality is protected.

---

# 27. Phase 22 - Final Testing Checklist

Before considering the project complete:

### Authentication

- [ ] Registration works.
- [ ] Login works.
- [ ] Logout works.
- [ ] Session persists.
- [ ] Invalid credentials are handled.

### Customer

- [ ] Dashboard works.
- [ ] Profile works.
- [ ] Account information works.
- [ ] Balance displays correctly.
- [ ] Deposit works.
- [ ] Withdrawal works.
- [ ] Transfer works.
- [ ] Transaction history works.
- [ ] Transaction details work.
- [ ] Notifications work.

### Admin

- [ ] Admin login works.
- [ ] Admin dashboard works.
- [ ] User list works.
- [ ] Account list works.
- [ ] Transaction list works.
- [ ] Account status management works.

### Security

- [ ] RLS is enabled.
- [ ] Customer data isolation works.
- [ ] Admin authorization works.
- [ ] Service-role key is not exposed.
- [ ] Client cannot directly modify balances.
- [ ] Financial operations use secure database-side logic.

### UI

- [ ] Loading states work.
- [ ] Empty states work.
- [ ] Error states work.
- [ ] Success states work.
- [ ] Navigation works.
- [ ] No obvious UI crashes.

---

# 28. Git Strategy

Use Git throughout development.

Recommended branches:

```text
main
develop
feature/auth
feature/accounts
feature/transactions
feature/admin
```

Commit examples:

```text
feat: add Supabase authentication
feat: create account schema
feat: add customer dashboard
feat: implement deposit operation
feat: implement withdrawal operation
feat: implement secure money transfer
feat: add transaction history
feat: add notifications
feat: add admin dashboard
fix: handle insufficient balance
fix: protect account balance with RLS
```

Do not commit:

```text
.env
secrets
service-role keys
passwords
private credentials
```

---

# 29. Definition of Done

The project is considered complete when:

1. A customer can register.
2. A customer can log in.
3. A customer receives a bank account.
4. A customer can view balance.
5. A customer can deposit simulated money.
6. A customer can withdraw simulated money.
7. A customer can transfer money to another account.
8. Transfers are atomic and secure.
9. Every financial operation creates a transaction record.
10. Customers can view their transaction history.
11. Customers receive notifications.
12. Customers can manage their profile.
13. Admin can log in.
14. Admin can view users.
15. Admin can manage account status.
16. Admin can monitor transactions.
17. RLS protects user data.
18. Customers cannot directly manipulate balances.
19. Application handles errors and loading states.
20. The application works reliably on the target Android environment.

---

# 30. AI Agent Working Rules

When implementing this plan, the AI agent should:

1. Work phase-by-phase.
2. Complete and test one phase before moving to the next.
3. Inspect existing files before creating new files.
4. Reuse existing components where appropriate.
5. Avoid unnecessary dependencies.
6. Explain significant architectural decisions.
7. After each major phase, verify that the project still builds.
8. Fix errors before continuing.
9. Never bypass RLS for convenience.
10. Never expose privileged Supabase credentials.
11. Never implement financial balance changes purely in client-side JavaScript.
12. Keep financial database operations atomic.
13. Keep the initial scope limited to the features defined in this plan.
14. Do not add future-enhancement features unless explicitly requested.
15. Before finalizing, run through the complete Definition of Done checklist.

---

# 31. Recommended Implementation Order

Follow this exact high-level sequence:

```text
1. Inspect existing project
        ↓
2. Configure React Native / Expo
        ↓
3. Configure Supabase
        ↓
4. Create database schema
        ↓
5. Create RLS policies
        ↓
6. Implement authentication
        ↓
7. Implement profile
        ↓
8. Implement account creation
        ↓
9. Implement customer dashboard
        ↓
10. Implement deposit
        ↓
11. Implement withdrawal
        ↓
12. Implement secure money transfer
        ↓
13. Implement transaction history
        ↓
14. Implement notifications
        ↓
15. Implement admin authentication
        ↓
16. Implement admin dashboard
        ↓
17. Implement user/account management
        ↓
18. Implement transaction monitoring
        ↓
19. Improve UI/UX
        ↓
20. Security testing
        ↓
21. Functional testing
        ↓
22. Final cleanup
```

# 32. Important Final Instruction

The AI agent must treat this file as the implementation scope for SmartBank.

If a requested feature is outside this plan, do not silently add it. Ask for confirmation or clearly identify it as a scope change.

The primary objective is to deliver a **simple, secure, functional, and presentable university banking application**, not a production banking platform.
