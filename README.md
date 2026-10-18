# Saldo — Sovereign Personal Finance & Shared Ledger

<div align="center">

[![Expo SDK 57](https://img.shields.io/badge/Expo-SDK%2057-000000?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native 0.86](https://img.shields.io/badge/React%20Native-0.86-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict%205.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NativeWind v4](https://img.shields.io/badge/NativeWind-v4%20(Tailwind)-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://nativewind.dev/)
[![Clerk Auth](https://img.shields.io/badge/Auth-Clerk%20JWT-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)](https://clerk.com/)
[![Supabase Postgres](https://img.shields.io/badge/Database-Supabase%20Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![EAS Update](https://img.shields.io/badge/OTA%20Updates-EAS%20Update-blueviolet?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/eas)

<br />

**Stealth-luxury aesthetics. Pure double-entry mathematical integrity. Autonomous AI intelligence. Zero-friction casual split debts.**

*Engineered for individuals who reject generic financial templates and demand uncompromising craftsmanship in their personal ledger.*

[Key Features](#-key-features) • [Instant OTA Updates](#-over-the-air-ota-updates--deployment) • [Architecture](#-core-architecture--ledger-mechanics) • [Quick Start](#-quick-start) • [Design System](#-design-system--stealth-luxury)

</div>

---

## 💎 Why Saldo?

Most modern personal finance apps fall into two flawed extremes:
1. **The Ad-Riddled Corporate Dashboard:** Bloated with credit card ads, intrusive notifications, and candy-neon purple gradients that treat your finances like a mobile game.
2. **The Over-Engineered Split App:** Multiplayer spreadsheets that force your friends to create accounts just to record who paid for lunch.

**Saldo redefines mobile wealth tracking:**
- **Solo-First Authority:** You own and control your entire financial universe. Friends and contacts are lightweight named records on your device—no account creation required for them.
- **Institutional Mathematical Integrity:** Your balance is never an editable integer in a database table. It is mathematically derived from an append-only, immutable double-entry ledger.
- **Stealth Luxury Scandinavian Aesthetic:** Monochromatic depth, tactile spring micro-interactions, editorial typography (`IBM Plex Sans` & `Roboto`), and intentional color discipline where our warm gold accent is reserved **strictly for outstanding debt obligations**.

---

## ⚡ Key Features

### 🏦 Studio Vault & Multi-Account Switching
- **Dynamic Liquidity Overview:** Switch between individual accounts (*Cash Wallet*, *Checking Account*, *Savings Vault*, *Crypto*) or consolidate your net worth in a single tap.
- **Privacy Mode (Eye Masking):** Instant one-touch toggle masks account numbers and balances as `••••••` for public confidentiality.
- **Dynamic Font Scaling:** Large numeric displays automatically scale down with `adjustsFontSizeToFit` to ensure multi-million balances never wrap or truncate.
- **Inflow / Outflow Telemetry:** Monthly cashflow metrics calculate net burn velocity, savings rate, and remaining daily allowance in real time.

### 🤖 Autonomous AI Financial Intelligence ("Saldo AI")
- **Hybrid Cognitive Architecture:** Powered by Google Gemini Function Calling with automatic sub-second offline local NLP fallback.
- **Natural Language Expense Capture:** *"Paid 4,200 PKR for groceries at Carrefour with Bank account"* logs the transaction, resolves accounts and categories, and updates your ledger in seconds.
- **Full Ledger Read Telemetry:** Ask natural questions: *"How much did I spend on dining out this week?"*, *"Who owes me money right now?"*, or *"Am I on pace with my entertainment budget?"*.
- **Safeguarded Mutations:** Destructive operations (like transaction reversals or deletions) require explicit interactive in-chat confirmation before executing.

### 🤝 Casual Splits, Shared Bills & 1-on-1 Loans
- **Person-Centric Unit of Debt:** Aggregates shared expenses across all groups and 1-on-1 splits by individual contact (*"Hamza owes you ₨ 3,400 total"*).
- **Two Flexible Settlement Modes:**
  - **On-Ledger (Account Impact):** Deducts or credits your actual bank/cash balance and writes an immutable double-entry ledger transaction.
  - **Off-Ledger (Mark as Settled):** Resolves obligations for physical cash handovers, barter, or external bank apps without altering your recorded app balance.
- **Asset Swap Loan Engine:** Lending money is recorded as an asset swap (receivable), not an expense outflow; receiving loan repayment is not recorded as artificial income.
- **Partial Repayments:** Quick 50% / 100% settlement chips or custom amounts with live progress bars measuring outstanding remaining debt.
- **Overdue Hierarchy:** Active debts remain clean and subtle; overdue debts glow with our signature obligation gold token (`#C9A24B`).

### ⌨️ Tactile Add-Transaction Keypad
- **Sub-Second Center Catalyst:** The center `+` tab opens a lightning-fast 3×4 tactile keypad in < 300ms without interstitial loading spinners.
- **Inline Math Evaluation:** Perform on-the-fly math (`450 + 120 * 2`) directly in the amount display.
- **Multimodal Receipt OCR Scanner:** Take a photo or upload an invoice—Gemini Vision automatically extracts the merchant, total, date, and suggested category.
- **"Split on the Fly":** Toggle "Split with Group" or a specific person directly while entering an expense.

### 🎯 Proactive Budgeting & Leakage Prevention
- **Safe Daily Spend Pace:** Computes your real-time daily burn limit:
  $$\text{Daily Allowance} = \frac{\text{Remaining Category Budget}}{\text{Days Left in Month}}$$
- **Unbudgeted Leakage Detection:** Automatically tracks miscellaneous expenses outside your defined budgets to eliminate financial blindspots.
- **Category Threshold Indicators:** Hairline progress tracks category consumption with subtle yellow alerts at 80% and red at 100%.

### 👤 Profile & Universal Financial Controls
- **Global Currency Switcher:** 50+ global fiat and crypto denominations (`PKR`, `USD`, `EUR`, `GBP`, `AED`, `SAR`, `CAD`, etc.).
- **Monthly Cycle Rollover:** Choose between starting each month at zero (zero-based budgeting) or carrying forward surplus balances.
- **Instant CSV Export:** Exports your complete sanitized ledger history to CSV and opens the native OS share sheet.
- **One-Tap Over-the-Air Updates:** Built-in update checker triggers live background downloads and instant reloads.

---

## 🚀 Over-The-Air (OTA) Updates & Deployment

Saldo is configured out-of-the-box for **EAS Update**. You can push bug fixes, UI improvements, and new features directly to user devices in seconds without rebuilding APKs or waiting for app store reviews.

### 1. Link Your EAS Project
```bash
# Log in to your Expo account
bun x eas login

# Configure project ID and EAS update endpoint
bun x eas update:configure
```

### 2. Build the Standalone Preview APK
```bash
# Generates an updateable standalone Android APK
bun run build:preview
```

### 3. Push Instant OTA Updates (No Re-Install Required)
```bash
# Push an update to all testers on the preview channel
bun run update:preview -- --message "Redesigned split debt cards"

# Push an update directly to production users
bun run update:prod -- --message "Performance improvements & bug fixes"
```

---

## 🏛️ Core Architecture & Ledger Mechanics

Saldo follows strict enterprise financial engineering principles:

```
┌─────────────────────────────────────────────────────────────┐
│                    SALDO MOBILE CLIENT                      │
│        (Expo SDK 57 • React Native 0.86 • React 19)         │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
       TanStack Query v5                 Zustand v5
   (Server Cache & Sync)           (UI State & Preferences)
               │                               │
               ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       SERVICES LAYER                        │
│   • Minor-Unit Integer Math (Cents/Paise Precision)         │
│   • Double-Entry Balance Engine (Append-Only Delta)         │
│   • Gemini Tool-Calling Loop & Local NLP Fallback           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                Authenticated Clerk JWT Token
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  SUPABASE POSTGRES BACKEND                  │
│   • Row-Level Security (RLS) Scoped to Clerk JWT sub        │
│   • Immutable balance_entries Table (No UPDATE/DELETE)      │
│   • Database Triggers for Atomic Ledger Reversals           │
└─────────────────────────────────────────────────────────────┘
```

1. **Integer Minor-Unit Precision:** Floating-point rounding errors (`0.1 + 0.2 = 0.30000000000000004`) are strictly banned. All monetary math is computed in integer cents/paise and formatted upon presentation.
2. **Immutable Append-Only Audit Trail:** Accounts do not store mutable balances. Account balances are computed from the `accounts_with_balances` PostgreSQL view that aggregates immutable debit/credit entries in `balance_entries`.
3. **Loud Failures:** Supabase RLS and database constraint errors throw immediately and visibly; failed network writes are never disguised as temporary local successes.

---

## 🎨 Design System: "Stealth Luxury"

All surfaces, typography, and borders are mapped through universal CSS variables in `app/global.css` and `tailwind.config.js`:

| Semantic Token | Light Mode | Dark Mode | Usage |
| :--- | :---: | :---: | :--- |
| `bg-canvas` | `#F7F7F5` | `#0A0A0B` | Edge-to-edge screen background |
| `bg-surface` | `#FFFFFF` | `#141416` | Cards, bottom sheets, modals |
| `bg-surface-muted` | `#F4F4F5` | `#1F1F23` | Chips, inputs, secondary badges |
| `border-surface-border` | `#E4E4E7` | `#27272A` | Hairline dividers and container boundaries |
| `text-ink` | `#0A0A0B` | `#F5F5F3` | Primary headlines and high-contrast numerals |
| `text-ink-muted` | `#52525B` | `#9C9C9F` | Secondary descriptions and metadata labels |
| `bg-primary` | `#22C55E` | `#22C55E` | Primary action buttons and positive indicators |
| `bg-gold` / `text-gold` | `#C9A24B` | `#C9A24B` | **Exclusively reserved for open debt obligations** |

---

## 🛠️ Tech Stack

- **Core:** [Expo SDK 57](https://expo.dev/) • [React Native 0.86](https://reactnative.dev/) • [React 19.2](https://react.dev/)
- **Navigation:** [Expo Router v57](https://docs.expo.dev/router/introduction/) (File-based navigation with animated stack transitions)
- **Styling:** [NativeWind v4](https://www.nativewind.dev/) (Tailwind CSS v3 compiler for native primitives)
- **State & Caching:** [TanStack Query v5](https://tanstack.com/query/latest) • [Zustand v5](https://zustand-demo.pmnd.rs/)
- **Auth & Security:** [Clerk Expo SDK](https://clerk.com/docs/references/expo/overview) with SecureStore token persistence
- **Database & Backend:** [Supabase](https://supabase.com/) (Postgres relational backend with strict RLS policies)
- **AI Engine:** Google Gemini API (Structured Function Calling & Receipt OCR Vision)
- **Keyboard Handling:** [react-native-keyboard-controller](https://kirillzyusko.github.io/react-native-keyboard-controller/) (UI-thread native avoidance)
- **Animations:** [React Native Reanimated v4](https://docs.swmansion.com/react-native-reanimated/) • React Native Gesture Handler

---

## 🏁 Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/httpsharis/saldo.git
cd saldo

# Install dependencies using Bun (recommended)
bun install
```

### 2. Environment Variables Setup
Create a `.env` file in the root directory:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your-supabase-publishable-key

# Clerk Authentication
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key

# (Optional) Google Gemini API Key for AI Assistant & Vision OCR
# Generate a free key starting with AIzaSy... at https://aistudio.google.com/apikey
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSyYourGeminiApiKey
```

> **Note:** If `EXPO_PUBLIC_GEMINI_API_KEY` is omitted, Saldo automatically activates its deterministic local NLP parser without crashing or lagging.

### 3. Run Development Server
```bash
# Start local Metro bundler
bun run start

# Launch directly on Android device/emulator
bun run android

# Launch directly on iOS simulator (macOS only)
bun run ios
```

### 4. Run Verification Tests & Type Checks
```bash
# Run all unit and ledger security tests
bun test

# Run strict TypeScript compiler verification
bun x tsc --noEmit
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
