# Saldo — Project Roadmap & Comprehensive Changelog

This document tracks all delivered development milestones, architectural evolutions, and the strategic roadmap for future versions of Saldo.

---

## Part 1: Comprehensive Changelog

### Phase 4: Navigation Refactor, Keyboard Polish & Profile Settings *(Completed — October 2026)*
- **5-Slot Tab Bar Order:** Refactored `app/(root)/(tabs)/_layout.tsx` to strictly feature `Home`, `Transactions`, `+` (Center Raised Catalyst), `Splits`, and `Assistant`.
- **Profile as Pushed Modal Screen:** Extracted Profile out of the tab bar into `app/(root)/Profile.tsx` (pushed modal with top close button and grouped sections).
- **Home Header Avatar & Push-Down Drawer:**
  - Implemented `HomeHeaderWithDrawer.tsx` with animated spring push-down feature gateway.
  - Added user initials avatar button with minimum 44×44px touch target.
- **Deep Split Integration in Add Transaction:**
  - Added "Split with Group" toggle directly in the tactile keypad expense flow in `AddTransactions.tsx`.
  - Live calculation banner previews per-person equal split amounts and member obligations.
  - Automatically writes `transaction_splits` and synchronizes the Splits ledger when saving an expense.
- **Group Detail Inspection Modal:**
  - Added `GroupDetailModal.tsx` in `Splits.tsx` for deep inspection of group balances, member breakdown, and per-group activity log.
- **Data & Security Actions in Profile:**
  - Working **CSV Transaction Export** via `react-native` `Share.share` for instant local or cloud data backups.
  - Interactive **Categories Inspection Modal** to view all active ledger categories and icons.
  - Two-step destructive **Delete Account** confirmation workflow.
- **Keyboard Polish with `react-native-keyboard-controller`:**
  - Replaced faulty built-in `KeyboardAvoidingView` with `KeyboardAvoidingView` from `react-native-keyboard-controller` in `Assistant.tsx`.
  - Added `tabBarHideOnKeyboard: true` in `_layout.tsx` so virtual keyboards never collide with or squash input bars.
  - Refactored `ChatInputBar.tsx` using shared `TextField` and guaranteed `TouchableOpacity` touch handling.
- **Base Currency Picker Integration:**
  - Integrated `CurrencyPicker` into Profile screen, allowing instant global currency switching (`PKR`, `USD`, `EUR`, `GBP`, `AED`, `INR`, etc.) across all balance cards.
- **UI/UX Pro Max Compliance:** Installed and registered the `ui-ux-pro-max` design intelligence skill in `.agent/skills/` and `AGENTS.md`.

---

### Phase 3: Splits & Shared Expense Engine *(Completed — October 2026)*
- **Resilient Splits Service Layer (`services/splits.ts`):**
  - Full TypeScript contracts for `groups`, `group_members`, `transaction_splits`, and `settlements`.
  - Optimistic in-memory ledger cache ensuring group management and debt settlements work offline.
- **TanStack Query Hooks (`useSplitsData.ts`):**
  - Declarative query caching with `queryKeys.groups` and `queryKeys.splits` in `store/keys.ts`.
  - Instant cache invalidation across account balances and groups upon settlement.
- **Visual Splits Components (`src/features/splits/components/`):**
  - `ObligationHeroCard.tsx`: Net balance summary enforcing the **single gold accent rule (`#C9A24B`)** strictly for open pending debt states.
  - `GroupItemCard.tsx`: Group cards with member counts and initial avatar chips.
  - `SplitItemRow.tsx`: Directional debt items (`owed_to_me` vs `i_owe`) with gold status dots and accessible 44×44px "Settle" buttons.
  - `CreateGroupModal.tsx`: Create groups and add member names with interactive chips.
  - `SettleModal.tsx`: Confirmation modal to record settlements and clear debt obligations.
- **Dedicated Tab Route:** Created `app/(root)/(tabs)/Splits.tsx` with pull-to-refresh and segmented status filters.

---

### Phase 2: Autonomous AI Financial Assistant *(Completed — October 2026)*
- **Hybrid AI Engine (`services/ai/`):**
  - Configured Google Gemini Function Calling (`gemini-2.5-flash`) with structured tool declarations.
  - Implemented resilient local deterministic NLP fallback engine executing in $< 1\text{s}$ with 0 network latency.
- **Tool Actions:**
  - Read: `get_financial_summary`, `query_transactions`, `check_budgets`.
  - Write: `log_transaction` parsing natural language phrases (*"spent 500 on coffee"*).
  - Delete: `delete_transaction` generating in-chat confirmation safety cards before mutating database.
- **Component Primitives Reusability:**
  - Enhanced `TextField.tsx` with `rightElement` and `leftElement` slots.
  - Refactored Assistant components (`ChatMessageItem`, `ToolActionCard`, `ChatInputBar`, `PromptSuggestionsTray`) to reuse shared `TextField`, `Surface`, and `Text` primitives.

---

### Phase 1: Banking Core & Ledger Mathematics *(Completed — September 2026)*
- **Append-Only Double-Entry Ledger:**
  - Designed `balance_entries` architecture where balances are mathematically computed rather than stored as editable numbers.
  - Support for `expense`, `income`, `transfer`, and `balance_adjustment` transaction types.
- **Studio Vault Balance Card:**
  - Real-time aggregated net worth display with currency formatting.
  - Inflow and outflow micro-pills showing monthly cashflow.
- **Multi-Account Switching (`AccountSwitcherModal.tsx`):**
  - Switch active view between individual accounts (`Cash Wallet`, `Standard Bank`) and aggregated vault totals.
- **Tactile Keypad Entry (`AddTransactions.tsx`):**
  - 3×4 numerical keypad with inline math calculation (`+`, `-`, `×`, `÷`).
  - One-tap preset increments (`+100`, `+500`, `+1,000`, `+5,000`).
  - Category and funding account pickers.
- **Transaction Analytics (`Transactions.tsx`):**
  - Filter chips (`All`, `Income`, `Expense`, `Transfer`), date sectioning, and cashflow bar charts via `react-native-gifted-charts`.

---

### Phase 0: Foundations & Architecture *(Completed — August 2026)*
- **Core Stack:** Configured Expo SDK 57, React Native 0.86, TypeScript strict mode (`tsc --noEmit`), and NativeWind v4 (Tailwind v3).
- **Authentication & Security:** Implemented Clerk Expo SDK with SecureStore token persistence and Supabase JWT Row-Level Security (RLS).
- **Design System Tokens:** Established monochrome "Stealth Luxury" dark-mode-first tokens, reserving `#C9A24B` strictly for debt obligations.
- **Universal Prompt & Store:** Zustand-powered `promptStore.ts` for unified confirmation modals across iOS and Android.

---

## Part 2: Strategic Future Roadmap

```mermaid
gantt
    title Saldo Development Roadmap
    dateFormat  YYYY-MM
    section Completed
    Phase 0 Foundations            :done, p0, 2026-08, 2026-09
    Phase 1 Banking Core & Ledger  :done, p1, 2026-09, 2026-09
    Phase 2 Autonomous AI Agent    :done, p2, 2026-09, 2026-10
    Phase 3 Splits & Shared Debt   :done, p3, 2026-10, 2026-10
    Phase 4 Navigation & UX Polish :done, p4, 2026-10, 2026-10
### Phase 5: Informal Loans, Direct Person Debt & Partial Settlements *(Completed — October 2026)*
- **Direct 1-on-1 Casual Loans (`DirectLoanModal.tsx`):**
  - Record loans directly with any person (*"I lent Ali 5,000"* or *"Cousin lent me 20,000"*) without needing to create a group first.
- **Ledger Integrity (Loans $\neq$ Expenses):**
  - Money lent (`type: 'lend'`) and borrowed (`type: 'borrow'`) update liquid account balances via double-entry `balance_entries` without corrupting monthly spending outflow or income metrics.
- **Partial Repayment Settlement Flow (`SettleModal.tsx`):**
  - Upgraded settlement dialog to accept partial repayments (*e.g. "He paid back ₨ 2,000 of ₨ 5,000"*), with remaining balance staying open and quick percentage presets (`Half`, `Full`).
- **"The Person is the Unit" (`PersonDebtCard.tsx`):**
  - Aggregated view showing net balance per person (*"Hamza owes you ₨ 3,400 total"*), expandable into individual splits and loan items.
- **Refined Gold Token Rule (Open vs. Overdue):**
  - Prevented the "gold wall" anti-pattern: normal open debts render in subtle stealth slate, while **overdue debts (`due_date < today`) receive the high-priority `#C9A24B` Gold badge**.
- **Quick Capture Overhaul:**
  - Added "Lend / Borrow" to the center `+` modal in `app/(root)/(tabs)/_layout.tsx`, de-emphasizing peripheral voice/OCR items.
- **Scope Boundary:**
  - Formal bank loans, EMIs, and interest amortization are explicitly excluded from scope to preserve core ledger integrity.

---

## Part 2: Strategic Future Roadmap

```mermaid
gantt
    title Saldo Development Roadmap
    dateFormat  YYYY-MM
    section Completed
    Phase 0 Foundations            :done, p0, 2026-08, 2026-09
    Phase 1 Banking Core & Ledger  :done, p1, 2026-09, 2026-09
    Phase 2 Autonomous AI Agent    :done, p2, 2026-09, 2026-10
    Phase 3 Splits & Shared Debt   :done, p3, 2026-10, 2026-10
    Phase 4 Navigation & UX Polish :done, p4, 2026-10, 2026-10
    Phase 5 Informal Loans & Debt  :done, p5, 2026-10, 2026-10
    section Upcoming
    Phase 6 Subscriptions & Bills  :active, p6, 2026-10, 2026-11
    Phase 7 Export & Offline V2    :p7, 2026-11, 2026-12
    Phase 8 Native OS Widgets      :p8, 2026-12, 2027-01
```

---

### Phase 6: Subscriptions & Recurring Bills *(Target: Q4 2026)*
- **Recurring Commitment Tracker (`subscriptions` Table):**
  - Manage fixed recurring services (Netflix, Spotify, Gym, Rent, Cloud servers).
  - Total monthly recurring commitment banner in Profile.
  - Renewal calendar reminders using `expo-notifications`.
- **Category Customizer:**
  - Dedicated management modal under Profile $\rightarrow$ Categories.
  - Create custom categories with custom emoji icons; delete user-created categories.

---

### Phase 7: Data Export, Backup & Offline Sync V2 *(Target: Q1 2027)*
- **CSV & JSON Ledger Export:**
  - Export complete transaction history and balance audit logs to CSV or JSON format via `expo-sharing`.
- **Postgres Realtime Sync Engine:**
  - Supabase Realtime WebSocket listeners for automatic background updates when records change.
- **Conflict-Free Local Storage (WatermelonDB / SQLite):**
  - Migrate in-memory local caches to embedded SQLite for instant cold app launches even in airplane mode.

---

### Phase 8: AI Vision Receipt OCR & Advanced Analytics *(Target: Q1 2027)*
- **Receipt Camera Scanner:**
  - Use device camera via `expo-camera` to capture paper receipts and restaurant bills.
  - Multimodal Gemini Vision parsing automatically extracts merchant name, date, subtotal, tax, and line items.
- **Spending Velocity Metrics:**
  - Burn rate calculations showing projected month-end balance based on daily spending velocity.

---

### Phase 9: Native OS Widgets & Apple Watch Support *(Target: Q2 2027)*
- **iOS & Android Home Screen Widgets:**
  - Live liquid balance and daily remaining budget widgets powered by Expo Config Plugins.
- **Lock Screen Complications:**
  - Quick glance at remaining daily allowance.
- **Haptic Feedback Optimization:**
  - Subtle tactile haptic ticks on keypad button taps using `expo-haptics`.

