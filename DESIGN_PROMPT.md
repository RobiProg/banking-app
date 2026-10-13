# SmartBank — Google Stitch Design Prompt Specification
> Generated for **SmartBank** mobile banking app (Expo / React Native, Supabase backend).
> Brand primary: `#0A6BD3` · Corporate / professional style · Mobile-first (iOS + Android, 375×812 reference).

---

## 📖 Quick Start

This file contains structured, copy-paste-ready prompts for an AI UI design generator (Google Stitch, Figma AI, Galileo AI, Uizard, v0, etc.). Each section follows this template:

```
## SCREEN: <Screen Name>
**Route**: <matches /app/* file>
**Prompt**:
> <Natural-language description of the entire screen, ready to paste>
**Components**: <bullet list>
**States**: <default / loading / empty / error>
```

**How to use**:
1. Pick a screen section below.
2. Copy everything between the **Prompt** markers.
3. Paste into your AI design tool.
4. Iterate on the result.

For best results, also paste the **Global Design System** block from §0 first so the tool understands your brand.

---

## §0. Global Design System (paste once per session)

```
Design system for SmartBank — a corporate, professional mobile banking app.

VIEWPORT
- Mobile-first: 375 × 812 pt (iPhone reference), 1× density
- Support both iOS (rounded, SF-style) and Android (Material, slightly more rectangular) idioms
- Safe-area top 44 pt, bottom 34 pt (home indicator)
- Portrait only

COLOR TOKENS
- Primary: #0A6BD3 (corporate blue, trust + stability)
- Primary Dark: #0856A8
- Primary Light / Tint: #E6F0FB
- Background: #FFFFFF
- Surface: #F5F7FA (cards, sheets, secondary panels)
- Border / Divider: #E2E6EB
- Text Primary: #0B1B2B
- Text Secondary: #6B7280
- Text on Primary: #FFFFFF
- Success: #2E7D32 · Success Background: #E6F4EA
- Warning: #ED6C02
- Error: #D32F2F · Error Background: #FDECEC

TYPOGRAPHY
- Font family: Inter (UI), with tabular-nums for all monetary values
- Display / Balance: 32–40 pt, weight 700, tight tracking
- H1 (screen title): 24 pt, weight 700
- H2 (section): 18 pt, weight 600
- Body: 15 pt, weight 400, line-height 1.45
- Caption / Meta: 13 pt, weight 400, color Text Secondary
- Button label: 15 pt, weight 600, uppercase tracking +0.5

SPACING
- 4 pt grid: 4, 8, 12, 16, 20, 24, 32, 40
- Screen horizontal padding: 20 pt
- Card padding: 16 pt
- Vertical rhythm between sections: 24 pt

ELEVATION
- Subtle, never playful. 1–2 dp shadows, 8–12 pt blur, black 8–12% alpha
- Avoid neon glows, colored shadows, or skeuomorphic textures

ICONOGRAPHY
- Outlined 24 pt icons, 1.5 px stroke, rounded line caps
- Filled variant for active nav state
- Avoid emoji as UI icons

COMPONENT STYLES
- Buttons: 48 pt tall, 12 pt radius, Primary fill for primary action, outlined for secondary
- Cards: 16 pt radius, 1 pt border #E2E6EB, optional shadow
- Inputs: 52 pt tall, 12 pt radius, 1 pt border, focus ring 2 pt Primary at 30% alpha
- Chips / Pills: 24 pt tall, fully rounded
- Avatars: 40 pt default, 32 pt in lists, 64 pt on profile
- Bottom sheet: 20 pt top radius, 16 pt horizontal padding

VOICE & TONE
- Confident, calm, factual. No marketing fluff.
- Numbers always formatted with thousands separators (1,234.50)
- Currency shown as ISO code prefix on first occurrence (USD 1,234.50), symbol after on subsequent use
- Use clear, short labels: "Send money", not "Initiate outbound transfer"

ACCESSIBILITY
- WCAG AA contrast minimum
- Min 44 × 44 pt tap targets
- Visible focus states for keyboard / external input

MOTION (for prototyping)
- 200 ms ease-out for state changes
- 300 ms spring for sheets and modals
- Never animate balance changes — instant updates
```

---

# PART A — CORE BANKING ESSENTIALS

---

## §1. SCREEN: Splash / Launch

**Route**: `/` (handled by `app/index.tsx`)

**Prompt**:
> Mobile screen, 375 × 812, portrait. White background. Centered logo lockup of "SmartBank" — wordmark in Inter 700, 28 pt, color Text Primary (#0B1B2B), with a small 32 × 32 shield-checkmark icon in Primary (#0A6BD3) to the left of the wordmark. Beneath, a 6 pt-tall loading indicator (linear, Primary, full width capped at 48 pt, indeterminate animation). Safe-area respected. No other elements.

**Components**: Logo lockup · Indeterminate loader
**States**: Loading (default)

---

## §2. SCREEN: Login

**Route**: `/(auth)/login`

**Prompt**:
> Mobile banking login screen, 375 × 812. White background. Top safe area respected. Status bar dark icons.
>
> Top section (y: 80):
> - H1 "Welcome back" 24 pt bold, Text Primary.
> - Subtitle "Sign in to your SmartBank account" 15 pt regular, Text Secondary, margin-top 8.
>
> Form section (y: 200):
> - Email input — full width, 52 pt tall, 12 pt radius, 1 pt border #E2E6EB, placeholder "Email address", inline mail icon (outlined, 20 pt) on the left.
> - 16 pt vertical gap.
> - Password input — same style, placeholder "Password", lock icon on left, eye-toggle icon on right.
> - 8 pt gap.
> - Right-aligned text link "Forgot password?" 13 pt, color Primary.
>
> Actions:
> - Primary button "Sign in" full width, 48 pt tall, Primary fill, white label "Sign in", 12 pt radius.
> - 24 pt gap.
> - Divider with center label "or" — 1 pt line #E2E6EB left and right, "or" 13 pt Text Secondary.
> - 24 pt gap.
> - Secondary outlined button full width "Continue with biometrics" with face-id icon.
>
> Bottom (y: 760): Row, centered — body text "New to SmartBank?" 14 pt Text Secondary, link "Create account" 14 pt Primary, weight 600, margin-left 6.

**Components**: H1 · Subtitle · Email input · Password input with toggle · Forgot link · Primary CTA · Divider · Biometric button · Footer link row
**States**: Default · Loading (button spinner) · Error (red border + helper text under field)

---

## §3. SCREEN: Register / Sign Up

**Route**: `/(auth)/register`

**Prompt**:
> Mobile banking registration screen, 375 × 812. White background. Top bar with left chevron-back icon.
>
> Header:
> - H1 "Create your account" 24 pt bold.
> - Subtitle "It takes about 3 minutes" 15 pt, Text Secondary.
>
> Progress indicator below header: 4-segment horizontal bar, first segment filled Primary, others outlined. Labels underneath: "Details", "Verify", "Set up", "Done". Current step "Details" weight 600, others Text Secondary.
>
> Form fields (stacked, 16 pt gap):
> 1. Full name (with person icon)
> 2. Email (with mail icon)
> 3. Phone number with country-code picker (flag icon + chevron-down)
> 4. Password (with lock + eye icons, password-strength meter below — 4 segments, colors gray → red → orange → green as it strengthens)
> 5. Confirm password (with lock + eye icons)
>
> Checkbox row: "I agree to the Terms of Service and Privacy Policy" 14 pt, Text Secondary, with the two phrases as underlined Primary links.
>
> Primary button "Continue" full width.
>
> Footer: "Already have an account? Sign in" centered, with "Sign in" as Primary link.

**Components**: Top bar with back · Progress stepper · 5 form inputs · Password strength meter · Checkbox + inline links · Primary CTA · Footer link
**States**: Default · Field validation error · Submit loading

---

## §4. SCREEN: KYC / Identity Verification

**Route**: `(auth)/verify` *(to add)*

**Prompt**:
> Mobile banking KYC verification screen, 375 × 812. White background.
>
> Header: back chevron, H1 "Verify your identity", subtitle "Required by regulation to keep your account safe."
>
> Stepper: 3 dots horizontal, second dot Primary and 24 pt wide, others gray.
>
> Method selector: card-style list with 3 options, each 64 pt tall, 16 pt radius, 1 pt border, 16 pt horizontal padding:
> - National ID card — with id-card icon, "Recommended"
> - Passport — with passport icon
> - Driver's licence — with car icon
> Selected card has Primary border 2 pt + light Primary background.
>
> Upload area (below): dashed 1 pt border #E2E6EB, 12 pt radius, 160 pt tall, centered icon (camera 32 pt, Primary), label "Tap to upload front side" 14 pt, helper "JPG or PNG up to 10 MB" 13 pt Text Secondary.
>
> After upload: thumbnail preview of the document, with small "Retake" text button top-right of thumbnail.
>
> Primary button "Continue" — disabled state shown (40% opacity) until both sides uploaded.
>
> Helper footer: lock icon + text "Your data is encrypted end-to-end" 12 pt Text Secondary, centered.

**Components**: Top bar · Method selector cards · Upload dropzone · Thumbnail preview · Disabled CTA · Trust footer
**States**: Default · Image selected · Error (wrong format) · Submitting

---

## §5. SCREEN: Home / Dashboard

**Route**: `/(app)/index` (or `/(app)/home`)

**Prompt**:
> Mobile banking home dashboard, 375 × 812. White background.
>
> Top bar (y: 44 safe-area + 16 padding):
> - Left: avatar 40 pt circle with placeholder initial "MR", 1 pt border.
> - Center (hidden on this layout, used in tabs): greeting "Good morning, Maria" 18 pt weight 600.
> - Right: icon button (notification bell with red 8 pt dot for unread), then icon button (QR scan).
>
> Balance hero card (y: 120): full width minus 40 pt horizontal margin, 180 pt tall, 20 pt radius, Primary gradient from #0A6BD3 to #0856A8.
> - Top-left small label "Total balance" 13 pt white at 80% opacity.
> - Center-left large balance "USD 24,580.50" 36 pt white weight 700, tabular-nums.
> - Bottom-left small change indicator "▲ 1.2% this month" 12 pt, white at 80% opacity, with up arrow.
> - Top-right eye icon (toggle visibility) white at 80%.
> - Bottom-right pill button "Manage accounts" — white text on semi-transparent white background (12 pt alpha 20%), 32 pt tall, 16 pt radius.
>
> Quick actions row (y: 320): 4 equal-width items, each a circular 56 pt button in Primary Light background with a Primary icon inside, label 12 pt below:
> 1. Send (paper-plane icon)
> 2. Receive (arrow-down icon)
> 3. Pay (qr-code icon)
> 4. Cards (card icon)
>
> Section header (y: 420): "My accounts" 18 pt weight 600, right-aligned "See all" 14 pt Primary.
>
> Accounts list (y: 456): vertical card list, 16 pt gap.
> - Account row: white card, 16 pt radius, 1 pt border, 72 pt tall, padding 16 pt horizontal.
>   - Left: small 40 pt square with rounded corner, bank-icon tinted, colored per account type (Checking = Primary Light bg, Savings = success-bg, Card = warning-bg).
>   - Middle: account name "Primary Checking" 15 pt weight 600, mask "•••• 4521" 13 pt Text Secondary.
>   - Right: balance "USD 12,480.00" 15 pt weight 600 tabular-nums, right-aligned.
>
> Section header: "Recent transactions" 18 pt weight 600, "See all" right-aligned.
>
> Transactions preview (last 5): condensed row list — icon avatar 40 pt, title + meta, amount right-aligned with green color for credit, red for debit.

**Components**: Top bar · Balance hero card · Quick actions grid · Accounts list · Transactions preview
**States**: Default · Hidden balance (masked) · Loading shimmer · Empty accounts

---

## §6. SCREEN: Accounts List

**Route**: `/(app)/accounts`

**Prompt**:
> Mobile accounts list screen, 375 × 812. White background.
>
> Top bar: H1 "Accounts", right-aligned icon button (plus icon to add new account).
>
> Tab bar: horizontal scrollable pills — "All", "Checking", "Savings", "Cards", "Loans", "Investments". Selected pill Primary fill, white text 13 pt weight 600. Unselected pill: surface bg #F5F7FA, Text Primary 13 pt.
>
> Total balance summary card at top (under tabs): surface background, 80 pt tall, label "Combined balance" 13 pt Text Secondary, amount "USD 38,420.75" 28 pt weight 700 tabular-nums, helper "across 4 accounts" 12 pt Text Secondary.
>
> Account list: full-width cards stacked, 16 pt horizontal margin, 12 pt gap.
> - Each card 88 pt tall, 16 pt radius, white, 1 pt border.
> - Left: 48 pt square tinted by account type with icon (Checking bank icon, Savings piggy-bank, Card credit-card, etc.).
> - Middle column: account name 15 pt weight 600, account number mask 13 pt Text Secondary.
> - Right column: balance 16 pt weight 600 tabular-nums, currency sub-label 12 pt Text Secondary.
> - Chevron-right icon far right, 20 pt, Text Secondary.
>
> Floating action button bottom-right: 56 pt circle, Primary, white plus icon, 24 pt from edge, elevated shadow.

**Components**: Top bar · Filter pill tabs · Summary card · Account card list · FAB
**States**: Default · Empty (illustration + "Open your first account" CTA) · Loading skeleton

---

## §7. SCREEN: Account Details

**Route**: `/(app)/accounts/[id]`

**Prompt**:
> Mobile account detail screen, 375 × 812. White background.
>
> Top bar: chevron-back, title "Account details", right-side overflow (3 dots) icon.
>
> Hero card (full width 40 pt margins, 200 pt tall, Primary gradient): avatar-like 56 pt square tinted white-at-20% with bank icon inside white.
> - Account name "Primary Checking" 22 pt white weight 600.
> - Account number "•••• •••• 4521" 14 pt white at 80%.
> - Big balance "USD 12,480.00" 32 pt white weight 700 tabular-nums.
> - Eye-toggle and share icons top-right white at 80%.
>
> Action row: 4 horizontal action buttons in a surface card below hero, 16 pt gap.
> Each: small Primary icon (32 pt), label 13 pt weight 500 below. Actions: "Send", "Receive", "Statement", "Details".
>
> Section: "Account information" — labeled rows with right-aligned values:
> - Account holder: Maria Rossi
> - IBAN: IT60 X054 2811 1010 0000 0123456
> - BIC: SMARTIT21
> - Opened: 14 March 2023
> - Interest rate: 0.10% p.a.
> Each row 56 pt tall, divider 1 pt #E2E6EB between.
>
> Section: "This month" — small analytics block:
> - Row with income / expense / net: 3 columns, label 12 pt Text Secondary, value 18 pt weight 600 (income green, expense red, net Text Primary).
> - Mini bar chart below: 30-day stacked bars showing income/expense, axis labels "Sep 8" → "Oct 8".
>
> Section: "Recent transactions" — 5 most recent rows, "See all" link.
>
> Bottom CTA: full-width secondary button "Close account" — outlined error color #D32F2F.

**Components**: Hero gradient card · Action grid · Info rows · Mini analytics · Transactions list · Destructive action
**States**: Default · Loading · Error (account unavailable)

---

## §8. SCREEN: Cards Management (List)

**Route**: `/(app)/cards`

**Prompt**:
> Mobile cards list screen, 375 × 812. White background.
>
> Top bar: H1 "Cards", right plus icon.
>
> Carousel of physical cards: horizontal scroll, snap-to-card, each card 320 × 190 pt, 16 pt radius, gradient fills (Primary for primary card, dark navy #0B1B2B for secondary, success gradient for prepaid).
> - Card art shows: chip (gold square), network logo (Visa/Mastercard) bottom-right, masked PAN "•••• •••• •••• 4521", cardholder "MARIA ROSSI", valid thru "08/29".
> - Below card art on the screen, a label row: card nickname "Primary Visa" 15 pt weight 600 + status pill "Active" green background.
>
> List of all cards below carousel: compact rows showing last 4 digits, type chip (Debit/Credit/Virtual), status pill.
>
> Primary CTA bottom: "Order new card" full width.

**Components**: Top bar · Card carousel · Status pill · Card list rows · CTA
**States**: Default · Empty · Card frozen (overlay lock icon + "Frozen" pill)

---

## §9. SCREEN: Card Details

**Route**: `/(app)/cards/[id]`

**Prompt**:
> Mobile card detail screen, 375 × 812. White background.
>
> Top bar: back chevron, title "Card details", overflow menu.
>
> Hero card: 320 × 200 pt centered, Primary gradient, full card art (chip + network + PAN + name + expiry). Tap to flip → reveals CVV back side.
>
> Action row below: 5 quick toggles with icons and labels — "Freeze", "Limits", "PIN", "Online", "Replace". Each a 56 pt square tile, 12 pt radius, surface background, Primary icon, label 12 pt below.
>
> Section "Card information" info rows: PAN, Cardholder, Valid thru, Issued, Network, Type (Debit).
>
> Section "Spending this month" — progress bar with cap: "USD 1,240.00 of USD 5,000.00" label above, blue filled portion, helper text "24.8% used" 12 pt.
>
> Section "Recent transactions" — 5 most recent.
>
> Destructive zone: "Report lost or stolen" outlined error button.

**Components**: Hero card with flip · Quick action tiles · Info rows · Spending progress · Transactions · Destructive CTA
**States**: Frozen · Active · Pending activation

---

## §10. SCREEN: Transactions List

**Route**: `/(app)/transactions`

**Prompt**:
> Mobile transactions list screen, 375 × 812. White background.
>
> Top bar: H1 "Transactions", right-side icon buttons (filter, search).
>
> Filter chip row (horizontal scroll): "All", "Income", "Expenses", "Pending", "Failed", "This month", custom.
>
> Grouped by date with sticky date headers (y-positioned inline):
> - "Today" / "Yesterday" / "Monday, 6 October" / etc.
> - Each date group has transactions below.
>
> Transaction row design (compact, 64 pt tall):
> - Left: 40 pt circle avatar tinted by category (Groceries = green, Transport = blue, Entertainment = purple, Income = success-light).
> - Middle: merchant/name 15 pt weight 500, category meta 13 pt Text Secondary.
> - Right: amount 15 pt weight 600 tabular-nums, green for income / red for debit / amber for pending.
>
> Tap row → opens transaction detail bottom sheet (peek 240 pt, full on drag).
>
> Empty state (when no transactions): centered illustration 200 × 200 pt (line-art wallet), H2 "No transactions yet", helper "Your activity will appear here", primary CTA "Make a transfer".

**Components**: Top bar · Search & filter · Filter chips · Date-grouped list · Empty state
**States**: Default · Empty · Search active · Filtered

---

## §11. SCREEN: Transaction Details

**Route**: `/(app)/transactions/[id]`

**Prompt**:
> Mobile transaction detail screen, 375 × 812. White background.
>
> Top bar: chevron-down (closes bottom sheet) or back arrow, title "Transaction", overflow menu (share, report).
>
> Status header section (centered):
> - 56 pt icon in tinted circle (success-light for completed, warning-bg for pending, error-light for failed).
> - Amount "USD 145.00" 32 pt weight 700, tabular-nums, color reflects status (Text Primary for completed, Warning for pending, Error for failed).
> - Status pill below: "Completed" / "Pending" / "Failed".
> - Merchant + date "Whole Foods · 7 October 2026, 14:32" 14 pt Text Secondary.
>
> Info card (rounded surface, 16 pt radius): labeled rows with right-aligned values:
> - Type: Card payment
> - Category: Groceries
> - From: Primary Checking •••• 4521
> - Reference: WF-29401
> - Fee: USD 0.00
> - Exchange rate: —
> - Authorization code: 884231
>
> Receipt section: small "Download receipt" link button (download icon + label, 14 pt Primary).
>
> Actions row: two equal buttons — secondary "Repeat" (icon: refresh), primary "Report issue" (icon: flag).
>
> Helper footer text: "Need help? Contact support" with link, 12 pt Text Secondary.

**Components**: Top bar · Status hero · Info rows · Receipt action · Action buttons · Support link
**States**: Completed · Pending · Failed · Disputed

---

## §12. SCREEN: Send / Transfer Money

**Route**: `/(app)/transfer`

**Prompt**:
> Mobile money transfer screen, 375 × 812. White background. Three-step flow shown as top progress dots (3 steps, current = 1).
>
> Step 1 — Recipient:
> Top bar: close (X) icon, title "Send money", step indicator "1 of 3".
>
> Section: H2 "Choose recipient", 18 pt weight 600.
>
> Tabs: "Contacts" / "Beneficiaries" / "New".
>
> Recent row (avatar + name + bank), tap-to-select.
>
> "Search by name, email, or account" input at top of list.
>
> Selected recipient card appears as a confirmation chip at top: avatar 32 pt, name, bank, close X to remove.
>
> Primary CTA "Continue" — disabled until recipient selected.
>
> Step 2 — Amount: (described for design)
> Top bar back chevron, step 2 of 3.
> From-account selector (chip).
> Big amount input — huge 48 pt numeric keypad area at bottom, currency picker (USD ▾) top-right of amount, amount label "0.00 USD" 40 pt weight 600 tabular-nums.
> Note input optional ("What's this for?").
> Fee preview row: "Fee USD 0.00" / "Total USD 0.00".
> Primary CTA "Review".
>
> Step 3 — Review & confirm:
> Summary card surface, rows: Recipient, Amount, Fee, Total, Date (instant), Note.
> Below: small lock icon + "Authorise with Face ID" line.
> Primary CTA "Send USD X.XX".

**Components**: Stepper · Recipient search & list · Selected chip · Amount keypad · Summary card · Biometric authorize CTA
**States**: Step 1 / 2 / 3 · Insufficient funds error · Loading · Success confirmation

---

## §13. SCREEN: Transfer Success

**Route**: `/(app)/transfer/success`

**Prompt**:
> Mobile transfer success confirmation screen, 375 × 812. White background.
>
> Centered hero:
> - 96 pt success circle (Primary Light background, Primary check icon 48 pt).
> - H1 "Transfer complete" 24 pt weight 700, margin-top 24.
> - Amount "USD 250.00" 32 pt weight 700 tabular-nums.
> - Recipient "to Anna Bianchi" 14 pt Text Secondary.
> - Reference "TX-948271" 13 pt Text Secondary.
> - Date "8 October 2026, 09:14" 13 pt Text Secondary.
>
> Two equal buttons side by side at bottom:
> - Secondary outlined "Share receipt"
> - Primary "Done" → returns to home.

**Components**: Success hero · Confirmation summary · Share & done actions
**States**: Success · Failed (with retry button)

---

## §14. SCREEN: Profile / Settings Home

**Route**: `/(app)/profile`

**Prompt**:
> Mobile profile & settings home, 375 × 812. White background.
>
> Top bar: H1 "Profile".
>
> Profile header (centered, 120 pt tall section): 80 pt avatar circle with initials "MR", below name "Maria Rossi" 18 pt weight 600, email "maria.rossi@email.com" 13 pt Text Secondary, pill "Verified ✓" green background 12 pt.
>
> Sections of menu rows (each row 56 pt tall, label + chevron-right):
> - **Account**: Personal info, Security & login, Addresses, Tax information
> - **Banking**: Linked accounts, Statements, Limits, Tax documents
> - **Preferences**: Notifications, Language, Currency, Appearance (Light/Dark toggle)
> - **Support**: Help center, Contact us, Report a problem
> - **Legal**: Terms of service, Privacy policy, Licences
>
> Section labels 13 pt weight 600 Text Secondary, padding 16 pt top, 8 pt bottom.
> Each row: left icon 24 pt in tinted square 32 pt, label 15 pt, right chevron.
>
> Bottom: red text button "Sign out".

**Components**: Top bar · Profile header with avatar · Grouped menu list · Sign out
**States**: Default · Verification pending (pill = amber)

---

## §15. SCREEN: Notifications

**Route**: `/(app)/notifications`

**Prompt**:
> Mobile notifications inbox screen, 375 × 812. White background.
>
> Top bar: H1 "Notifications", right icon button (mark-all-read).
>
> Tab row: "All", "Alerts", "Transactions", "Offers".
>
> List grouped by date: "Today", "Yesterday", "Earlier".
> Each notification row 72 pt tall:
> - Left 40 pt tinted icon circle by type (shield for security, card for transaction, gift for offer, info for general).
> - Middle: title 15 pt weight 600, body 13 pt Text Secondary truncated to 2 lines.
> - Right: timestamp "2h" 12 pt Text Secondary, unread 8 pt Primary dot.
>
> Swipe-left action reveals "Mark read" / "Delete" buttons.

**Components**: Top bar · Tabs · Notification rows · Unread dot · Swipe actions
**States**: Default · Empty (illustration "All caught up") · All read

---

# PART B — ADVANCED FEATURES

---

## §16. SCREEN: Bill Payments

**Route**: `/(app)/bills`

**Prompt**:
> Mobile bill payments screen, 375 × 812. White background.
>
> Top bar: H1 "Bill payments", plus icon.
>
> Tabs: "Pay bills" / "Scheduled".
>
> Featured biller carousel (horizontal scroll, snap): large 280 × 140 pt rounded cards per biller (Netflix, Spotify, Internet provider, Electric utility, Water, Insurance). Each card: brand-color top band, white center with logo placeholder, biller name, next due date and amount.
>
> Search input "Search billers".
>
> Category list with icons and right-side "Pay" chevron: Utilities, Telecom, Insurance, Subscriptions, Rent, Other.
>
> Empty state for "Scheduled" tab: illustration of calendar, "No scheduled payments", helper "Set up auto-pay for your bills".

**Components**: Top bar · Tabs · Biller carousel · Search · Category list · Empty state
**States**: Default · Empty scheduled · Loading

---

## §17. SCREEN: Savings Goals

**Route**: `/(app)/savings`

**Prompt**:
> Mobile savings goals screen, 375 × 812. White background.
>
> Top bar: H1 "Savings goals", plus icon (create new goal).
>
> Total summary card: Primary gradient, 140 pt tall. Label "Total saved" 13 pt white 80%, balance "USD 8,240.00" 32 pt weight 700 white, helper "across 5 goals" 12 pt white 80%, target "Goal: USD 12,000.00" 12 pt white 80% + thin progress bar.
>
> Goals list: cards 100 pt tall, 16 pt radius, 1 pt border.
> - Left: 56 pt colored circle with goal icon (Travel = plane, Home = house, Emergency = shield, Car = car).
> - Middle: goal name 15 pt weight 600, progress bar 8 pt tall (filled portion in Primary), meta "USD 2,400 of USD 5,000" 12 pt Text Secondary, percent "48%" right of bar.
> - Right: chevron-right.
>
> Empty state: piggy-bank illustration, "Create your first goal", helper "Save towards what matters", CTA.

**Components**: Top bar · Summary card · Goal cards with progress · Empty state
**States**: Default · Empty · Goal completed (confetti green)

---

## §18. SCREEN: Add Savings Goal

**Route**: `/(app)/savings/new`

**Prompt**:
> Mobile add savings goal screen, 375 × 812. White background.
>
> Top bar: close X, title "New goal", right text button "Save".
>
> Form:
> - Goal icon picker (6 options, 56 pt circles, primary-light bg default, primary bg when selected): Travel, Home, Emergency, Car, Education, Other (custom).
> - Goal name input.
> - Target amount input with currency picker.
> - Target date picker (chip "By 31 December 2027" with calendar icon).
> - Auto-save rule (toggle): "Round up purchases" / "Save weekly USD 50" / "Custom".
> - Color tag picker (6 swatches).
>
> Bottom: Primary CTA "Create goal".

**Components**: Top bar · Icon picker · Inputs · Date picker · Auto-save rules · Color picker · CTA
**States**: Default · Form invalid

---

## §19. SCREEN: Investments / Portfolio

**Route**: `/(app)/investments`

**Prompt**:
> Mobile investments screen, 375 × 812. White background.
>
> Top bar: H1 "Investments", right filter icon.
>
> Portfolio summary card (Primary Light background, 160 pt tall):
> - Label "Portfolio value" 13 pt Text Secondary.
> - Amount "USD 14,820.45" 32 pt weight 700 tabular-nums.
> - Change pill: "▲ USD 240.20 (1.65%) today" 12 pt green background green text.
> - Mini line chart below (240 × 60 pt), gradient fill from Primary 30% to transparent.
>
> Segmented tabs: "Holdings" / "Activity" / "Discover".
>
> Holdings rows (56 pt tall): ticker icon left (40 pt rounded square with ticker letters), ticker + name middle, shares + value right, mini sparkline far-right.
>
> Discover grid: 2-column cards for featured products (ETFs, Bonds, Stocks), each card 160 × 180 pt with title, risk pill (Low/Med/High colored), 1Y return %.
>
> FAB: Primary plus icon "Buy".

**Components**: Top bar · Summary card with chart · Segmented tabs · Holdings list · Discover grid · FAB
**States**: Default · Empty (illustration + "Start investing") · Market closed (banner)

---

## §20. SCREEN: Loans

**Route**: `/(app)/loans`

**Prompt**:
> Mobile loans screen, 375 × 812. White background.
>
> Top bar: H1 "Loans", right info icon.
>
> Active loan hero card (Primary gradient, 200 pt tall):
> - Label "Active loan" 13 pt white 80%.
> - Type "Personal loan" 22 pt white weight 600.
> - Remaining "USD 4,200.00" 32 pt weight 700 white.
> - Helper "of USD 10,000.00" 12 pt white 80%.
> - Progress bar at bottom (white-on-translucent fill) showing repayment progress.
> - Next payment row: "Next USD 320.00 due 15 October" 12 pt white 80%.
>
> Section: "Repayment schedule" — list of upcoming payments, each row showing date, amount, status pill (Paid green / Upcoming gray).
>
> Section: "Loan details" info rows: Original amount, Interest rate, Start date, End date, Total interest.
>
> Primary CTA: "Make extra payment".

**Components**: Top bar · Hero card · Repayment schedule · Info rows · CTA
**States**: Default · No active loans (illustration + "Apply for a loan" CTA)

---

## §21. SCREEN: Crypto

**Route**: `/(app)/crypto`

**Prompt**:
> Mobile crypto screen, 375 × 812. White background.
>
> Top bar: H1 "Crypto", right refresh icon.
>
> Disclaimer pill at top: amber-bg, "Crypto is volatile — value can go down as well as up" 12 pt, with info icon.
>
> Portfolio summary card (Primary Light background):
> - Label "Crypto balance" 13 pt Text Secondary.
> - Amount "USD 1,840.20" 32 pt weight 700.
> - Change row: "▲ USD 64.20 (3.6%) 24h" green text 13 pt.
>
> Tabs: "Assets" / "Activity" / "Discover".
>
> Assets list (rows 64 pt tall):
> - Left: 32 pt rounded coin icon (colored by coin — BTC orange, ETH purple, USDC blue, etc.) with ticker badge.
> - Middle: coin name "Bitcoin" 15 pt weight 600, balance "0.024 BTC" 13 pt Text Secondary.
> - Right: value "USD 1,240.00" 15 pt weight 600, change "▲ 2.4%" 12 pt green.
>
> Each row taps to asset detail.
>
> Bottom bar with two buttons: secondary "Sell", primary "Buy".

**Components**: Top bar · Disclaimer · Summary card · Tabs · Asset list · Buy/Sell bar
**States**: Default · Loading · Empty

---

## §22. SCREEN: Budgets & Analytics

**Route**: `/(app)/analytics`

**Prompt**:
> Mobile budgets & analytics screen, 375 × 812. White background.
>
> Top bar: H1 "Insights", right month picker (chip "October 2026 ▾").
>
> Hero card: surface background, 160 pt tall.
> - Label "Total spent this month" 13 pt Text Secondary.
> - Amount "USD 2,140.50" 32 pt weight 700.
> - Budget bar: "USD 2,140.50 of USD 3,000.00" 12 pt, progress bar 8 pt with green fill (under budget) or red (over).
> - Comparison row: "Down 8% vs last month" with arrow.
>
> Section: "Spending by category" — donut chart 200 × 200 pt centered with legend below. Categories: Groceries, Dining, Transport, Entertainment, Bills, Other — each row showing color dot, name, percentage, amount.
>
> Section: "Top merchants" — list of top 5 merchants with amount and frequency.
>
> Section: "Budgets" — small cards per category with progress bars and remaining amounts.

**Components**: Top bar · Month picker · Hero summary · Donut chart · Category list · Merchant list · Budget cards
**States**: Default · Over budget (red) · No data

---

## §23. SCREEN: Statements

**Route**: `/(app)/statements`

**Prompt**:
> Mobile statements screen, 375 × 812. White background.
>
> Top bar: H1 "Statements", filter icon.
>
> Filter pills: "All accounts" / per-account chips.
>
> Year selector: 2026 / 2025 / 2024 (horizontal scroll).
>
> List grouped by month with month totals:
> - Month header: "October 2026" 16 pt weight 600, total right.
> - Statement rows: account nickname + statement type + "PDF · 320 KB" + download icon. Each 64 pt tall.
>
> Empty: illustration + "Statements appear at month end".

**Components**: Top bar · Filters · Year selector · Month-grouped list
**States**: Default · Empty · Downloading

---

## §24. SCREEN: Beneficiaries

**Route**: `/(app)/beneficiaries`

**Prompt**:
> Mobile beneficiaries screen, 375 × 812. White background.
>
> Top bar: H1 "Beneficiaries", plus icon.
>
> Search input "Search beneficiaries".
>
> Filter pills: "All" / "Personal" / "Business".
>
> List rows 64 pt tall: avatar (40 pt circle with initials, color-tinted by saved color tag), middle column name 15 pt weight 600 + account mask 13 pt Text Secondary, right chevron-right.
>
> Empty state: illustration of people + "Save frequent recipients for one-tap transfers".

**Components**: Top bar · Search · Filters · Beneficiary list · Empty state
**States**: Default · Empty

---

## §25. SCREEN: Currency Exchange

**Route**: `/(app)/exchange`

**Prompt**:
> Mobile currency exchange screen, 375 × 812. White background.
>
> Top bar: close X, title "Exchange", step indicator.
>
> From card: white surface, 16 pt radius, 1 pt border.
> - Top label "You pay" 13 pt Text Secondary.
> - Amount input "0.00" 36 pt weight 600 tabular-nums.
> - Currency selector chip: flag + "USD ▾".
>
> Swap icon button (32 pt circle Primary, swap-vertical icon) centered between cards.
>
> To card: same style, "You receive", disabled preview amount, "EUR ▾".
>
> Rate info row: "1 USD = 0.9243 EUR" 13 pt Text Secondary, "Last updated: 1 min ago" 12 pt.
>
> Fee row: "Fee USD 0.00" 12 pt Text Secondary, expandable.
>
> Date selector: "Today" / "Schedule".
>
> Primary CTA "Exchange USD X.XX".
>
> Confirmation sheet on success: hero check, converted amount, rate, "Done".

**Components**: From card · Swap button · To card · Rate info · Fee disclosure · Date · CTA · Success sheet
**States**: Default · Insufficient funds · Success · Failure

---

## §26. SCREEN: QR Pay

**Route**: `/(app)/qr`

**Prompt**:
> Mobile QR payment screen, 375 × 812. Dark background (#0B1B2B) full screen.
>
> Top bar: close X (white), right-side "Torch" and "Gallery" icon buttons (white).
>
> Camera viewport (full screen minus safe areas): simulated camera grid lines, corner brackets in white, semi-transparent scan area rectangle 240 × 240 pt with 16 pt radius outline.
>
> Centered overlay text inside scan area: "Align QR code within frame" 14 pt white.
>
> Below scan area (still on dark bg): two action chips — "My QR code" and "Scan from gallery" — white outlined, 16 pt radius.
>
> Bottom helper text: "Hold steady for automatic scan" 12 pt white 60%.
>
> After successful scan: slides up a confirmation sheet with merchant, amount (editable), confirm CTA.

**Components**: Camera viewport · Corner brackets · Action chips · Helper text · Confirmation sheet
**States**: Scanning · Detected · Error (QR invalid)

---

# PART C — SUPPORT & SYSTEM SCREENS

---

## §27. SCREEN: Biometric Setup

**Route**: `(auth)/security/biometrics`

**Prompt**:
> Mobile biometric setup screen, 375 × 812. White background.
>
> Top bar: back chevron, H1 "Secure your account".
>
> Centered illustration: 120 pt circle Primary Light background with face-id icon 64 pt Primary.
>
> H1 "Enable Face ID" 22 pt weight 700 centered.
> Subtitle "Use Face ID to sign in and confirm payments quickly and securely." 15 pt Text Secondary centered, max-width 280 pt.
>
> Bullet list 32 pt tall:
> - ✓ Unlock the app in one glance
> - ✓ Confirm transfers up to USD 500 without password
> - ✓ Encrypted and stored only on your device
>
> Primary CTA "Enable Face ID" full width.
> Secondary text button "Maybe later".

**Components**: Top bar · Illustration · Headline + body · Bullet list · CTA · Skip
**States**: Default · Permission prompt · Enabled success

---

## §28. SCREEN: PIN Setup

**Route**: `(auth)/security/pin`

**Prompt**:
> Mobile PIN setup screen, 375 × 812. White background.
>
> Top bar: back, H1 "Set transaction PIN".
>
> Centered 6-dot PIN entry visualizer (12 pt circles, 16 pt gap): empty / filled Primary.
>
> Numeric keypad: 4 rows × 3 columns grid, 280 pt wide centered. Each key 64 × 64 pt with label 24 pt weight 500. Bottom row: empty / 0 / backspace icon.
>
> Helper text: "Enter a 6-digit PIN" 14 pt Text Secondary.
>
> After entry, second screen to confirm PIN with same keypad.
>
> Error: dots turn red, "PINs don't match" helper below.

**Components**: Top bar · PIN dots · Numeric keypad · Helper text
**States**: Empty · Partial · Full · Mismatch error · Success

---

## §29. SCREEN: Help Center

**Route**: `/(app)/help`

**Prompt**:
> Mobile help center screen, 375 × 812. White background.
>
> Top bar: H1 "Help center", search icon.
>
> Search input "Search articles".
>
> Category grid (2 columns): Cards 160 × 140 pt rounded surface with icon 32 pt Primary, title 15 pt weight 600, article count 12 pt Text Secondary. Categories: Getting started, Cards, Transfers, Security, Loans, Investments.
>
> Popular articles list: rows with chevron-right, 56 pt tall, icon + title + "2 min read" meta.
>
> Bottom contact card: surface background, "Still need help?" 16 pt, "Our team is here 24/7" 13 pt Text Secondary, two buttons: outlined "Email" + Primary "Live chat".

**Components**: Top bar · Search · Category grid · Article list · Contact card
**States**: Default · Search results

---

## §30. SCREEN: Limits

**Route**: `/(app)/limits`

**Prompt**:
> Mobile spending limits screen, 375 × 812. White background.
>
> Top bar: back chevron, H1 "Spending limits".
>
> Info card: surface background, helper text "Adjust your daily and monthly limits to keep your account secure." 14 pt.
>
> Limit rows (cards 100 pt tall, 16 pt radius):
> - Label "ATM withdrawal" 15 pt weight 600.
> - Sub-label "Daily limit" 13 pt Text Secondary.
> - Progress bar (used / limit) with USD amounts shown.
> - Right: edit icon button.
>
> Limit types: ATM withdrawal, Card payment, Online payment, International transfer, Contactless.
>
> Tap → modal with slider input 0 — max, real-time USD preview.

**Components**: Top bar · Info card · Limit cards with progress · Edit modal with slider
**States**: Default · Editing · Limit reached warning

---

## §31. SCREEN: Empty States Library

Use these design recipes for any empty state in the app:

**Prompt template**:
> Mobile empty state, centered, 375 × 812. White background.
>
> Centered:
> - Line-art illustration 200 × 200 pt (style: thin 1.5 pt stroke #6B7280, minimal, geometric — wallet / inbox / people / target / chart).
> - H2 "<Title>" 20 pt weight 700 Text Primary, margin-top 24.
> - Helper "<one-line explanation>" 14 pt Text Secondary, margin-top 8, max-width 280 pt centered.
> - Primary CTA "<Action verb>" margin-top 24, auto-width centered.
> - Secondary text link "<alt action>" below, 14 pt Primary.
>
> Vertical safe-area respected.

**Components**: Illustration · H2 · Helper · CTA · Secondary link
**Examples used by**: Transactions, Beneficiaries, Notifications, Investments, Goals, Loans, etc.

---

## §32. SCREEN: Error & System States

**Prompt template — Generic error**:
> Mobile full-screen error state, 375 × 812. White background.
>
> Top bar with X close icon.
>
> Centered 72 × 72 pt circle error-light background with alert-triangle icon 36 pt error color.
>
> H1 "Something went wrong" 22 pt weight 700.
> Subtitle "We couldn't complete your request. Please try again." 14 pt Text Secondary.
>
> Error code small text "ERR_2048" 12 pt Text Secondary.
>
> Two buttons: outlined "Go back" + Primary "Try again".

**Prompt template — No internet**:
> Same as generic error, but with cloud-off icon, title "You're offline", subtitle "Check your connection and try again."

**Prompt template — Maintenance**:
> Same as generic error, but with wrench icon, title "Scheduled maintenance", subtitle "We'll be back at 10:00 UTC. Sorry for the inconvenience."

---

## §33. SCREEN: Onboarding Carousel (3 slides, pre-login)

**Route**: `/(auth)/onboarding`

**Prompt — Slide 1**:
> Mobile onboarding slide, 375 × 812. White background, safe area.
>
> Top right skip text link "Skip" 14 pt Primary.
>
> Centered hero illustration 280 × 240 pt: minimal line-art of phone with bank card, Primary stroke 2 pt.
>
> Title "Bank on the go" 28 pt weight 700 centered.
> Body "Manage your money, cards and savings — all from one secure app." 16 pt Text Secondary centered, max-width 300 pt.
>
> Bottom: 3-dot page indicator (first dot Primary, others gray), full-width Primary CTA "Next".

**Prompt — Slide 2**: Illustration of shield with checkmark. Title "Bank-grade security". Body "Biometric login, instant card freeze and real-time alerts keep you in control."

**Prompt — Slide 3**: Illustration of paper-plane and QR code. Title "Send in seconds". Body "Transfer to anyone, anywhere — by contact, IBAN or QR."

After slide 3: CTA changes to "Get started", which routes to login.

---

## §34. Tab Bar (persistent)

**Route**: Persistent in `/(app)/_layout`

**Prompt**:
> Bottom tab bar (persistent across authenticated screens), 375 wide, 84 pt tall (with safe-area). White background, top 1 pt border #E2E6EB.
>
> 5 tabs, equally distributed:
> 1. **Home** — house icon (24 pt, outlined default, filled when active)
> 2. **Cards** — card icon
> 3. **Pay** — centered elevated Primary circular button 56 × 56 pt with white scan/qr icon (raised 16 pt above bar)
> 4. **Insights** — chart icon
> 5. **Profile** — person icon
>
> Each tab: icon centered, label 11 pt below. Active state: Primary color, weight 600. Inactive: Text Secondary. Center Pay tab has subtle shadow.

**Components**: Tab bar · 5 tabs · Center FAB-style action
**States**: Active tab highlighted · Unread badge support

---

# 📎 Appendix A — Iconography Reference

Use **Lucide** (line, 1.5 px stroke, rounded caps) for consistency. Common icons used in this app:
`home`, `credit-card`, `send`, `download`, `upload`, `arrow-down-left`, `arrow-up-right`, `qr-code`, `scan-line`, `shield-check`, `bell`, `search`, `filter`, `chevron-right`, `chevron-left`, `chevron-down`, `x`, `plus`, `more-horizontal`, `settings`, `user`, `log-out`, `eye`, `eye-off`, `lock`, `mail`, `phone`, `camera`, `image`, `calendar`, `wallet`, `piggy-bank`, `plane`, `house`, `car`, `graduation-cap`, `alert-triangle`, `refresh-cw`, `flag`, `repeat`, `share-2`, `trending-up`, `trending-down`, `check`.

---

# 📎 Appendix B — Per-Screen State Checklist

For every screen above, design at minimum these 4 states:

| State | Trigger | Visual treatment |
|---|---|---|
| **Default** | Normal data | As described above |
| **Loading** | Initial fetch / refresh | Skeleton shimmer (surface bg, no content shapes) |
| **Empty** | No data | Illustration + helper + CTA (§31) |
| **Error** | Network/server error | Full-screen error card (§32) |

---

# 📎 Appendix C — Paste-Ready Mini-Prompts

If the AI tool prefers shorter prompts, here are 4 condensed versions that cover the whole app:

**Mini 1 — Onboarding & Auth**: "Design 4 mobile screens (375×812) for SmartBank banking app, corporate style, white background, blue #0A6BD3 primary. Splash with centered logo. Onboarding 3-slide carousel with line-art illustrations. Login with email + password inputs, biometric option. Register with progress stepper, 5 fields, password strength meter."

**Mini 2 — Core Home**: "Design 4 mobile screens: Home dashboard with balance hero card gradient, 4 quick actions, accounts list, recent transactions. Accounts list with pill filters, summary card, account cards. Account detail with hero card, action grid, mini analytics chart. Cards management with horizontal card carousel and list."

**Mini 3 — Money Movement**: "Design 4 mobile screens: Send money 3-step flow (recipient → amount keypad → review). Transfer success screen with green checkmark. Transaction list grouped by date. Transaction detail with status hero and info rows."

**Mini 4 — Advanced Features**: "Design 6 mobile screens: Savings goals with progress bars per goal. Investments with portfolio summary, line chart, holdings list. Bill payments with biller carousel. Crypto with disclaimer pill and asset rows. Currency exchange with from/to cards and swap button. Insights with donut chart and category breakdown."

---

✅ **All prompts are ready to paste directly into Google Stitch (or any AI UI design tool).**

Total screens designed: **34** (5 auth · 10 core · 10 advanced · 9 system/tab) + reusable states & components.