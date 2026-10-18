# Saldo: Neo-Banking Design System & UI Specification

**Version:** 1.0.0  
**Theme:** Light Mode Neo-Banking ("Editorial FinTech")  
**Target:** React Native / Expo with NativeWind (Tailwind CSS)

---

## 1. Executive Aesthetic Philosophy

The Saldo visual identity rejects generic "AI slop" (standard 3-card grids, repetitive purple-indigo gradient heroes, low-contrast gray-on-gray typography, and stock rounded templates). Instead, it adopts a **high-precision, tactile neo-banking design language** inspired by next-generation financial applications (such as Wise, Cash App, and Revolut Ultra), specifically calibrated for personal expense tracking.

### Core Visual Tenets

1. **Crisp Light Canvas:** A soft off-white background (`#F8F9FB`) provides subtle warmth and contrast against pure white cards (`#FFFFFF`), avoiding eye fatigue while maintaining a hyper-clean look.
2. **Kinetic Electric Accent:** A high-visibility **Electric Lime (`#D4F938`)** acts as the singular brand catalyst. It is reserved strictly for high-intent actions (e.g., the primary "Send" button, active filter states, notification counters, and key interactive badges).
3. **High-Contrast Slate Typography:** Pitch-black is replaced with deep, rich **Slate Ink (`#0F172A`)** to deliver exceptional legibility and editorial prestige across tabular numbers and headers.
4. **Tactile Micro-Interactions:** Large, thumb-friendly tap surfaces (minimum 48×48 pt) with subtle spring scale feedback (`scale-95` on press), crisp hairline borders (`1px`), and card-in-card visual grouping.

---

## 2. Color Palette & Token Definitions

### A. Primary Brand & Interactive Catalyst

| Token Name | Hex Code | RGB | HSL | Usage / Psychological Role |
| :--- | :--- | :--- | :--- | :--- |
| `color-primary` (Electric Lime) | `#D4F938` | `rgb(212, 249, 56)` | `hsl(72, 94%, 60%)` | High-energy forward action: Primary CTA buttons, tab bar scan centerpiece, active filter chips, notification counters. |
| `color-primary-subtle` | `#D4F9381A` | `rgba(212, 249, 56, 0.10)` | - | Background tint for selected accounts, active pill borders, and subtle focus states. |
| `color-primary-muted` | `#D4F9384D` | `rgba(212, 249, 56, 0.30)` | - | Input chip active outline and highlighted tag chips. |

### B. Canvas & Surface Hierarchy

| Token Name | Hex Code | Purpose & Application |
| :--- | :--- | :--- |
| `surface-canvas` | `#F8F9FB` | Default screen background canvas. Provides 2% contrast against white cards so cards float naturally without heavy drop shadows. |
| `surface-card` | `#FFFFFF` | Primary surface for elevated cards, bottom sheets, transaction rows, and keypad buttons. |
| `surface-track` | `#ECEFF3` | Muted background for segmented control tracks (Expense/Income/Transfer) and search field backgrounds. |
| `surface-promo` | `#E2E8F0` (40% opacity) | Soft, low-saturation backdrop for secondary promotional or insight modules. |
| `surface-badge-purple` | `#EDE9FE` | Micro savings insight pill backdrop. |

### C. Typography & Text Hierarchy

| Token Name | Hex Code | Font Weight | Usage |
| :--- | :--- | :--- | :--- |
| `text-primary` | `#0F172A` | Bold / Extrabold | Large hero balances, section headings, merchant titles, and keypad digits. |
| `text-secondary` | `#64748B` | Medium / Semibold | Subtitles, helper text, inactive filter labels, modal headings. |
| `text-tertiary` | `#94A3B8` | Regular / Medium | Timestamps, date section headers ("TODAY"), search placeholders, and inactive tab icons. |
| `text-accent` | `#6366F1` | Semibold | Savings insight micro-pill text. |
| `text-inverse` | `#FFFFFF` | Bold | Text inside dark avatars and active dark pill states. |

### D. Semantic Categories & Ledger Colors

| Category / Flow | Accent Color | Surface Tint | Meaning / Context |
| :--- | :--- | :--- | :--- |
| **Income / Inflow** | `#0F766E` (Deep Teal) | `#0F766E15` | Deposits, salary, peer payments received. |
| **Retail & Shopping** | `#2563EB` (Cobalt) | `#2563EB15` | Online shopping, electronics, merchant payments. |
| **Food & Dining** | `#E11D48` (Ruby) | `#E11D4815` | Restaurants, Food Panda, grocery delivery. |
| **Transit & Ride** | `#000000` (Pitch Black) | `#00000010` | Uber, public transit, transport splits. |
| **Transfer / Adjustment** | `#64748B` (Slate) | `#64748B15` | Internal account transfers, cash ledger adjustments. |

### E. Borders & Hairlines

| Token Name | Hex / Class | Description |
| :--- | :--- | :--- |
| `border-subtle` | `#F1F5F9` (`border-gray-100`) | Standard 1px structural separator between list rows and cards. |
| `border-medium` | `#E2E8F0` (`border-gray-200/80`) | Outline for interactive elements, search inputs, and modal edges. |
| `border-active` | `#D4F938` | Highlight stroke for active selected card or account option. |

---

## 3. Screen-by-Screen Architecture & Anatomy

### 1. Docked Bottom Navigation (`app/(root)/(tabs)/_layout.tsx`)

```
+-------------------------------------------------------------+
|  [Home]      [Statistic]      [  (+)  ]     [AI Card]     [Profile] |
|   (icon)        (icon)         (Lime)         (icon)       (icon)   |
+-------------------------------------------------------------+
```

- **Geometry**: Docked bottom bar with white background (`#FFFFFF`) and hairline border-top (`#F1F5F9`). Height automatically respects safe-area insets (`58pt + insets.bottom`).
- **Tab Items**:
  - `Home`: Routes to main dashboard. Icon is active `#0F172A`, inactive `#94A3B8`.
  - `Transactions` ("Statistic"): Routes to historical ledger & search.
  - `AddTransactions` (Centerpiece): Elevated 48×48 pt rounded square (`rounded-2xl`) in full `#D4F938` with soft ambient glow (`shadow-[#D4F938]/40`).
  - `Assistant` ("AI Card"): Routes to financial advice & automated parsing.
  - `Profile`: Routes to account settings.

---

#### 2. Home Dashboard (`app/(root)/(tabs)/index.tsx`)
```
+-------------------------------------------------------------+
|  [Avatar] Haris 👋                           (Settings) (Bell)
|  Welcome back,                                              |
|                                                             |
|                   [ 💳 Main Checking **** 3425 v ]           |
|                                                             |
|                       TOTAL NET BALANCE                     |
|                        Rs 86,290.49                         |
|             [ +14.8% this month ]  [ 🟢 Live Ledger ]       |
|                                                             |
|  +---------------------------------------------------------+|
|  |  (Pie) Monthly Budget              [ 🗓️ 10 days left ]   ||
|  |  Spent: Rs 22,450                              37%      ||
|  |  [==========================--------------------------]||
|  |  Remaining Safe Spend                 Daily Allowance    ||
|  |  Rs 37,550                            Rs 3,755/day       ||
|  +---------------------------------------------------------+|
|                                                             |
|  QUICK ENTRY & ACTIONS                                      |
|  +------------+ +------------+ +------------+ +------------+|
|  |   (Scan)   | |   (Voice)  | |  (Manual)  | |   (+ Exp)  ||
|  |    Scan    | |    Voice   | |   Manual   | |  + Expense ||
|  |   Receipt  | |    AI Log  | |   Keypad   | |   (Lime)   ||
|  +------------+ +------------+ +------------+ +------------+|
|                                                             |
|  Recent Transactions                             See All >  |
|  +---------------------------------------------------------+|
|  | (MB) Mikel Borle         10:30 AM           +Rs 3,500.00 ||
|  |                                                  Income  ||
|  | -------------------------------------------------------- ||
|  | (Ub) Uber Ride           08:25 AM             -Rs 850.00 ||
|  |                                                 Expense  ||
|  +---------------------------------------------------------+|
+-------------------------------------------------------------+
```
- **1. Profile & Settings Header**:
  - Left: Clerk user profile photo or stylized initials circle with personalized greeting ("Welcome back, [Name] 👋").
  - Right: Tactile Settings button and Notification bell with Electric Lime status pill.
- **2. Account Dropdown Selector**:
  - Interactive pill (`bg-white border-gray-200/70 shadow-xs`) with card chip, account identifier, and chevron.
  - Tapping opens an account switcher bottom sheet displaying all accounts with real-time balances in `Rs`.
- **3. Majestic Hero Balance & Budget Card**:
  - Generous visual real estate with `text-[44px] font-black text-[#0F172A]` displaying net worth in `Rs`.
  - Micro growth pill (`+14.8% this month`) and `Live Ledger` indicator.
  - **Monthly Budget Card**: Elevated card calculating total budget vs spent, visual progress bar, **days remaining** in the current billing cycle, and **safe daily spending allowance** (`Rs X,XXX/day`).
- **4. Quick Entry & Action Features (Scan, Voice, Manual, Send)**:
  - 4-column tactile module:
    - **Scan**: Receipt & invoice camera parsing.
    - **Voice**: AI Voice transcription & expense logging.
    - **Manual**: Direct tactile 3x4 keypad entry.
    - **Send**: Highlighted in Electric Lime (`#D4F938`) for rapid outflow tracking.
- **5. Recent Transactions Feed**:
  - Clean transaction feed in `Rs` currency with merchant avatars, timestamps, and action tags.

---

### 3. Tactile Keypad / Add Transaction Screen (`app/(root)/(tabs)/AddTransactions.tsx`)

```
+-------------------------------------------------------------+
|  ( <- )                     Add Expense               (Edit) |
|                                                              |
|                 [ Expense | Income | Transfer ]              |
|                                                              |
|                         [ **** 3425 v ]                     |
|                                                              |
|                          Enter amount                        |
|                           Rs 6,342.00                        |
|                   [ Category v ]  [ "Note" ]                 |
|                                                              |
|             [ Rs 100 ]  [ Rs 500 ]  [ Rs 1,000 ]             |
|                                                              |
|                   1           2           3                  |
|                   4           5           6                  |
|                   7           8           9                  |
|                   .           0           [x]                |
|                                                              |
|  +---------------------------------------------------------+ |
|  |                     Save Expense                        | |
|  +---------------------------------------------------------+ |
+-------------------------------------------------------------+
```

- **Type Toggle Track**:
  - Segmented pill track in `#ECEFF3` with smooth active white pill toggle (`Expense`, `Income`, `Transfer`).
- **Hero Dynamic Amount Display**:
  - Responsive `text-4xl font-extrabold text-[#0F172A] tabular-nums`.
  - Real-time decimal input formatting with dual-digit safety guards.
- **Preset Quick-Fill Chips**:
  - Horizontal scrollable pill row (`$50`, `$100`, `$500`, `$1,000`, `$1,500`).
  - Tapping a chip immediately sets the value or highlights in Electric Lime.
- **Custom 3x4 Tactile Keypad**:
  - 12 individual 80×56 pt tactile buttons with 16pt corner radius (`rounded-2xl`).
  - Large, thumb-friendly targets with instant press states (`active:bg-gray-100 active:scale-95`).
  - Supports decimal typing and backspace deletion.
- **Bottom CTA**:
  - Full-width 56pt Electric Lime action button (`bg-[#D4F938] text-[#0F172A] font-extrabold`).
  - Connected directly to TanStack mutation with automated optimistic cache invalidation across transactions, account balances, and budget progress.

---

### 4. Transaction History & Feed (`app/(root)/(tabs)/Transactions.tsx`)

```
+-------------------------------------------------------------+
|  ( <- )                Transaction History          (Search) |
|                                                              |
|     [ Search by merchant, note, or type...              ]    |
|                                                              |
|     [ All ]       [ Income ]     [ Expense ]    [ Transfer ] |
|  (Lime active)     (White)         (White)        (White)    |
|                                                              |
|  TODAY                                                       |
|  +---------------------------------------------------------+ |
|  | (MB) Mikel Borle        10:30 AM             +$350.00   | |
|  |                                               Receive   | |
|  | ------------------------------------------------------- | |
|  | (Ub) Uber               08:25 AM              -$10.00   | |
|  |                                              Transfer   | |
|  | ------------------------------------------------------- | |
|  | (Am) Amazon Shopping    09:45 AM             -$124.00   | |
|  |                                                  Send   | |
|  +---------------------------------------------------------+ |
|                                                              |
|  YESTERDAY                                                   |
|  +---------------------------------------------------------+ |
|  | (NF) Netflix            03:15 PM              -$15.99   | |
|  |                                          Subscription   | |
+-------------------------------------------------------------+
```

- **Header & Search Bar**:
  - Clean search button toggles a full-width search input with real-time filtering across merchant names, descriptions, and category tags.
- **Horizontal Filter Chips**:
  - `All` button activates with Electric Lime background (`bg-[#D4F938] border-[#D4F938] text-[#0F172A]`).
  - Secondary filters (`Income`, `Expense`, `Transfer`) display as clean white pills with 1px border.
- **Date Grouping**:
  - Automatically sorts into chronological sections: `TODAY`, `YESTERDAY`, and formatted dates.
- **Transaction Details Modal**:
  - Tapping any transaction displays a focused bottom sheet showing transaction breakdown, exact timestamp, category, and a destructive **Delete** option.

---

### 5. Payment Accounts Screen & Right-Swipe Gesture (`app/(root)/Accounts.tsx`)

```
+-------------------------------------------------------------+
|  ( <- )                  Payment Accounts             ( + )  |
|                                                              |
|  +---------------------------------------------------------+ |
|  |  TOTAL LIQUID PORTFOLIO                                 | |
|  |  Rs 86,290.49                                           | |
|  |  [ 💳 4 Active Accounts ]       [ 🟢 Ledger Synced ]     | |
|  +---------------------------------------------------------+ |
|                                                              |
|  [ All ]      [ Bank ]      [ Cash ]      [ Cards ]  [ Wallets ]
|                                                              |
|  +---------------------------------------------------------+ |
|  | (🏦) HDFC Salary Account                     Rs 52,000  | |
|  |     [⭐ Default] • Bank Account             [ Primary ]  | |
|  +---------------------------------------------------------+ |
|  | (💵) Pocket Cash Wallet                       Rs 4,850  | |
|  |     Physical Cash                         [Make Primary] | |
|  +---------------------------------------------------------+ |
|  | (👛) Paytm UPI Wallet                        Rs 29,440  | |
|  |     Digital Wallet                        [Make Primary] | |
|  +---------------------------------------------------------+ |
+-------------------------------------------------------------+
```
- **Right-Swipe Navigation**:
  - Swiping horizontally to the right anywhere on the HomeScreen automatically activates `rightSwipeGesture` (`Gesture.Pan().activeOffsetX(30).failOffsetY([-25, 25])`) and navigates directly to the Payment Accounts screen.
- **Account Category Breakdown**:
  - 🏦 **Bank Accounts**: Checking, Savings, Salary accounts.
  - 💵 **Physical Cash**: Cash in pocket, home cash reserve.
  - 💳 **Credit & Debit Cards**: Line of credit or linked debit cards.
  - 👛 **Digital Wallets**: UPI, Paytm, Apple Pay, PayPal.
- **Live Dynamic Balances**:
  - Each account computes its exact liquid balance dynamically from `balance_entries` using `useAccountsWithBalancesQuery()`.
  - Supports quick "Make Primary" radio actions to set the default account.

---

## 4. Spacing, Corner Radius & Elevation Tokens

### Spacing Scale (4-Point Grid)

- `gap-1` / `p-1`: 4pt (Micro padding inside segmented controls)
- `gap-2` / `p-2`: 8pt (Button gaps, chip padding, pill spacing)
- `gap-3` / `p-3`: 12pt (Card inner spacing, icon-to-text gap)
- `px-4` / `py-3.5`: 14–16pt (Input padding, list item vertical padding)
- `px-6`: 24pt (Standard screen horizontal padding)
- `mt-7` / `mt-8`: 28–32pt (Major section vertical margin)

### Corner Radius Hierarchy

- `rounded-full` (9999px): Filter pills, search inputs, account dropdown chips, avatar circles.
- `rounded-3xl` (24px): Primary cards, list grouping cards, modal top sheets.
- `rounded-2xl` (16px): Keypad buttons, quick action buttons, preset chips, input fields.
- `rounded-xl` (12px): Inner tab pill buttons, modal action buttons.

### Elevation & Shadows

- Avoid heavy drop shadows in light mode. Instead, use:
  - `shadow-xs`: Subtle 1px elevation (`elevation: 1` / `shadowOpacity: 0.04`).
  - `border border-gray-100`: Crisp boundary definition without muddy darkness.

---

## 5. Implementation Reference (NativeWind Classes)

```tsx
// Electric Lime Primary Button
<Pressable className="w-full h-14 rounded-2xl bg-[#D4F938] items-center justify-center shadow-sm active:scale-[0.98]">
  <Text className="text-base font-extrabold text-[#0F172A] tracking-tight">
    Send Money
  </Text>
</Pressable>

// Account Selector Dropdown Pill
<Pressable className="flex-row items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-gray-100 shadow-xs active:opacity-75">
  <View className="w-5 h-3.5 rounded-xs bg-[#D4F938] items-center justify-center">
    <View className="w-3 h-0.5 bg-[#0F172A] rounded-full" />
  </View>
  <Text className="text-xs font-semibold text-[#0F172A] tracking-wider">
    **** 3425
  </Text>
  <Feather name="chevron-down" size={14} color="#64748B" />
</Pressable>

// Active Filter Chip (Electric Lime)
<Pressable className="px-4 py-2 rounded-full border bg-[#D4F938] border-[#D4F938]">
  <Text className="text-xs font-bold text-[#0F172A]">All</Text>
</Pressable>

// Inactive Filter Chip (Clean White)
<Pressable className="px-4 py-2 rounded-full border bg-white border-gray-100">
  <Text className="text-xs font-bold text-[#64748B]">Expense</Text>
</Pressable>
```
