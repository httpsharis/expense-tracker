# Design System: Saldo — Nordic Botanical Neo-Banking

> Design System Specification derived from Google Stitch Screen `web application/stitch/projects/6740134184370062845/screens/aab23519365e45be85b8f3e85b47f689`.
> Enforcing high-taste tactile interfaces: luminous warm botanical canvas, obsidian forest surfaces, electric spring lime catalysts, and asymmetric bento financial telemetry.

---

## 1. Visual Theme & Atmosphere

Saldo is an intentional departure from the prevailing clichés of contemporary fintech interfaces: neither the dreary "all-black void" (`#000000`) nor the candy-neon purple/indigo gradient templates ("AI slop").

Instead, Saldo manifests a **Nordic Botanical Neo-Banking** aesthetic — reminiscent of a high-end Copenhagen or Zurich financial atelier:
- **Atmosphere & Mood:** Clean, luminous, organic, and architectural. The canvas breathes in a soft botanical mist (`#F4F6F3`), against which pure snow containers (`#FFFFFF`) float with diffused, whisper-soft elevation and hairline organic borders (`#E4E8DF`).
- **Tactile Weight & Contrast:** Key anchors — such as the primary quick action, the active split pocket, and the floating entry dock — are cast in **Deep Obsidian Forest** (`#0D1C13`). This provides deep visual grounding without pitch-black harshness.
- **Electric Catalyst:** A vibrant **Electric Spring Lime** (`#22C55E` / `#D4F938`) activates actionable states, the `saldo•` brandmark dot, positive cashflow indicators, and the central entry catalyst.
- **Spectrum Metrics:**
  - **Density:** 6/10 ("Daily App Balanced" — high-signal financial telemetry without visual clutter).
  - **Variance:** 8/10 ("Offset Asymmetric" — dual asymmetric bento cards pairing dark forest receivables with crisp white liabilities).
  - **Motion:** 6/10 ("Fluid Spring Micro-Interactions" — tactile push feedback with physical mass).

---

## 2. Color Palette & Roles

Every token carries a distinct, semantic responsibility with verified contrast exceeding WCAG 2.1 AA ($4.5:1$ minimum).

### 2.1 Core Palette Matrix

| Token Name | Hex Code | Functional Role & Semantic Context |
| :--- | :--- | :--- |
| **Botanical Mist Canvas** | `#F4F6F3` | Primary screen canvas background. Soft, warm-sage off-white that prevents eye fatigue. |
| **Pure Snow Surface** | `#FFFFFF` | Primary card and container fill for the balance card, budget widget, activity feed, and liabilities. |
| **Botanical Pearl Tint** | `#EEF2EB` | Secondary container fill: auxiliary quick action pills (`Request`, `Split`, `Scan`), avatar glyph backdrops. |
| **Obsidian Forest** | `#0D1C13` | Deep botanical dark anchor: primary action button (`Send / PAY`), shared tab receivables card, active bottom tab pill, and `+ ENTRY` floating dock. |
| **Forest Surface Highlight**| `#152A1E` | Subtle elevation and hover/pressed states on dark forest components. |
| **Electric Spring Lime** | `#22C55E` | Brand signature dot (`saldo•`), positive cashflow badges (`↗ +$1,240.00`), active status indicators, and the `+` glyph in `+ ENTRY`. |
| **Cashflow Inflow Green** | `#16A34A` | Settled income, positive ledger amounts (`+$850.00`), and `RECEIVED` status pills. |
| **Cashflow Outflow Ink** | `#0D1510` | Debit ledger amounts (`-$125.00`, `-$8.50`), monumental integer digits, and card titles. |
| **Deep Carbon Ink** | `#0D1510` | Primary text, screen headers, card names, and prominent figures. |
| **Slate Sage** | `#64748B` | Secondary text, cycle metadata (`+5.3% this month · 31d cycle`), sub-labels, and section headers. |
| **Whisper Slate** | `#94A3B8` | Tertiary text, decimal digits (`.00`), unselected navigation icons, and timestamps. |
| **Botanical Hairline Border**| `#E4E8DF` | 1px crisp structural border on cards, input wrappers, and segmented controls. |
| **Whisper Divider** | `#EFF2EC` | Internal list row dividers separating transaction items. |
| **Overdue Debt Gold** | `#C9A24B` | **STRICTLY RESERVED:** Open debt obligations that are overdue (`due_date < today`) or urgent settlement notices. Never used decoratively. |
| **Gold Ghost Tint** | `rgba(201,162,75,0.14)`| Background chip tint for overdue debt pills and urgent alert badges. |
| **Coral Alert Red** | `#EF4444` | Payment due date urgency warnings (`Due in 4 days`), overdraft alerts, and destructive confirmations. |
| **Category: Food & Dining** | `#10B981` | Emerald accent for grocery and dining budget progress tracks. |
| **Category: Transport** | `#3B82F6` | Cobalt blue accent for mobility, fuel, and transit budget tracks. |
| **Category: Fun & Social** | `#F59E0B` | Honey amber accent for entertainment and social budget tracks. |

---

## 3. Typography Architecture

Saldo pairs structural geometric figures with ultra-legible humanist body type and dense monospace metadata.

### 3.1 Type Hierarchy

```
Monumental Balance : 38px / Weight: 900 / Tracking: -0.03em / Tabular Numbers  (e.g., $24,590)
Balance Decimals    : 22px / Weight: 600 / Tracking: -0.01em / Color: Whisper   (e.g., .00)
Hero Card Amount   : 26px / Weight: 800 / Tracking: -0.02em / Tabular Numbers  (e.g., $3,450, $850)
Section Header     : 16px / Weight: 700 / Tracking: -0.01em / Uppercase/Caps   (e.g., MONTHLY BUDGET)
Card Title         : 15px / Weight: 600 / Tracking: 0.0em   / Humanist Sans    (e.g., Dinner at Noma)
Body Regular       : 13px / Weight: 400 / Tracking: 0.0em   / Humanist Sans    (e.g., Yesterday · Split with Sarah)
Monospace Micro-Tag: 11px / Weight: 700 / Tracking: +0.06em / Monospace Caps   (e.g., MAIN POCKET, SECURE, 64% USED)
Cashflow Large     : 16px / Weight: 800 / Tracking: -0.01em / Tabular Numbers  (e.g., -$125.00, +$850.00)
```

### 3.2 Monospace Metadata Convention
All telemetry tags, date pills, cycle counters, payment method tags, and status pills MUST render in uppercase monospace (`font-mono tracking-wider font-bold`):
- `MAIN POCKET /`
- `Checking #4081 ∨`
- `SECURE 👁`
- `● OWED TO YOU`
- `● YOU OWE`
- `64% USED`
- `OCT 2024`
- `● CARD` · `● INSTANT` · `● APPLE PAY`
- `RECONCILED DAILY` · `✓ ENCRYPTED`
- `VAULT` · `LEDGER` · `SPLITS` · `CARDS`

### 3.3 Typography Anti-Patterns
- **Banned:** `Inter` default font stack.
- **Banned:** Generic serif fonts (`Times New Roman`, `Georgia`, `Palatino`) in dashboard and financial cards.
- **Banned:** Low-contrast muted text on light backgrounds (contrast ratio must remain $\ge 4.5:1$).
- **Banned:** Wrapping monumental balance numbers across multiple lines (`adjustsFontSizeToFit` and `numberOfLines={1}` mandatory).

---

## 4. Component Stylings & Structure

### 4.1 Header & Brand Identity Bar
- **Brand Logotype:** `saldo•` in lowercase geometric sans-serif with a prominent **Electric Spring Lime** (`#22C55E`) filled dot anchored beside the letter `o`.
- **Brand Glyph:** Deep forest circular container with dynamic spiral/path glyph in lime green.
- **Control Utilities:**
  - Round quick filter/slider icon button (`44×44px` touch target, subtle 1px border).
  - User initials avatar (`AV`) in solid lime-tinted circle with dark ink lettering, routing directly to `Profile.tsx`.

### 4.2 Monumental Balance Container (Main Pocket Card)
- **Shape & Elevation:** White card (`#FFFFFF`), generous corner radius (`rounded-[32px]`), structural border (`1px solid #E4E8DF`), and gentle diffused ambient drop shadow.
- **Header Line:**
  - Left: `MAIN POCKET /` monospace label paired with interactive account switcher pill (`Checking #4081 ∨`).
  - Right: `SECURE 👁` security badge with privacy eye toggle.
- **Balance Display:**
  - Tabular layout: Large integer `$24,590` paired with elevated decimal `.00`.
  - Cashflow Pill: Dark pill with electric lime text `↗ +$1,240.00` and cycle detail `● +5.3% this month · 31d cycle`.
- **4-Slot Quick Action Bar:**
  - **Slot 1 (Send / PAY - Primary Action):** Deep Obsidian Forest button (`#0D1C13`), rounded rectangle (`18px`), bright lime diagonal up-right arrow (`↗`), white label "Send" with micro-tag "PAY" in lime uppercase.
  - **Slot 2 (Request):** Botanical Pearl pill card (`#EEF2EB`), down arrow (`↓`), dark ink label "Request".
  - **Slot 3 (Split):** Botanical Pearl pill card (`#EEF2EB`), split arrows (`⇄`), dark ink label "Split".
  - **Slot 4 (Scan):** Botanical Pearl pill card (`#EEF2EB`), camera glyph (`📷`), dark ink label "Scan".
  - *Interaction:* Every action cell enforces `active:scale-95` micro-spring feedback.

### 4.3 Dual Asymmetric Split Bento Cards (Receivables vs. Liabilities)
- **Left Bento Card (Owed to You — Shared Tab):**
  - Surface: **Deep Obsidian Forest** (`#0D1C13`).
  - Corner Radius: `24px` (`rounded-[24px]`).
  - Header Tag: `● OWED TO YOU` with lime dot and diagonal arrow (`↗`).
  - Hero Figure: `$ 3,450` in crisp white tabular type.
  - Subtitle: `Shared tab` in olive sage.
  - Social Proof: Stacked avatar ring (`SJ`, `MC`, `+3`) with `5 pending` count.
- **Right Bento Card (You Owe — Liability & Settle Up):**
  - Surface: **Pure Snow White** (`#FFFFFF`) with 1px border (`#E4E8DF`).
  - Corner Radius: `24px` (`rounded-[24px]`).
  - Header Tag: `● YOU OWE` in slate monospace with slate dot and upward arrow (`↑`).
  - Hero Figure: `$ 850` in deep carbon ink (`#0D1510`).
  - Urgency Badge: `Due in 4 days` in soft coral red (`#EF4444`).
  - Action Button: Full-pill dark CTA `Settle Up →` in Obsidian Forest (`#0D1C13`) with white text and `active:scale-95` tactile push.

### 4.4 Monthly Budget & Pacing Card
- **Surface:** Pure Snow White (`#FFFFFF`), `rounded-[28px]`, 1px border (`#E4E8DF`), generous internal padding (`20px`).
- **Header:** `MONTHLY BUDGET ●` with green dot on left, right-aligned cycle switcher `OCTOBER >`.
- **Spend Metric:** `$640 spent of $1,000` with status badge `64% USED` in light lime-tinted pill (`#EBF9E9` fill, `#16A34A` text).
- **Master Progress Track:**
  - Height: `6px`, `rounded-full`.
  - Fill: Obsidian forest dark bar with remaining track in botanical pearl (`#EEF2EB`).
- **Safe Daily Pace Indicator:**
  - `⏱ $24.00/day safe pace` on left in emerald sage.
  - `18 days left` on right in muted slate.
- **Multi-Category Allocation Tracks:**
  1. `● Food & Dining`: Emerald dot (`#10B981`), `$320 / $450` tabular values, ~70% emerald progress fill.
  2. `● Transport`: Cobalt blue dot (`#3B82F6`), `$180 / $250` tabular values, ~72% cobalt progress fill.
  3. `● Fun & Social`: Honey amber dot (`#F59E0B`), `$140 / $150` tabular values, ~93% amber progress fill.

### 4.5 Recent Activity Feed
- **Header:** Monospace indicator `■ RECENT ACTIVITY` paired with bordered month badge `OCT 2024` and `View all →` navigation link.
- **Feed Container:** Pure Snow White (`#FFFFFF`), `rounded-[28px]`, 1px border (`#E4E8DF`).
- **Row Anatomy:**
  - Category Avatar: Circular container (`40×40px`) in botanical pearl (`#EEF2EB`) with category icon (dining utensils, coffee cup). For incoming deposits, circular container in obsidian forest with lime icon.
  - Primary Details: Bold merchant/description (`Dinner at Noma`, `Rent Share`, `Coffee Run`) with subtle context (`Yesterday · Split with Sarah`, `Oct 12 · Michael Chen`).
  - Amount & Method:
    - Debits: Bold dark ink `-$125.00`, `-$8.50` with method tag `● CARD`, `● APPLE PAY`.
    - Credits: Bold electric green `+$850.00` with `RECEIVED` badge and `● INSTANT` method tag.
  - Action Extension: Inline attached pill (e.g. `📄 Scan receipt`) with subtle border.
- **Footer Security Strip:** `RECONCILED DAILY` on left, `✓ ENCRYPTED` in green on right.
- **Floating `+ ENTRY` Dock Pill:**
  - Anchored on right side above navigation dock.
  - Capsule pill shape (`rounded-full`), deep obsidian forest fill (`#0D1C13`), bright lime green `+` icon (`#22C55E`), white bold text `ENTRY`.
  - Minimum touch target: `48×48px` bounding box.

### 4.6 Bottom Navigation Dock
- **Container:** Floating pill dock on light botanical canvas (`#FFFFFF` with subtle border and elevation).
- **4 Primary Slots:**
  1. `VAULT` (Home Dashboard): Active slot with filled obsidian forest dark pill (`#0D1C13`), lime vault icon, and lime uppercase label `VAULT`.
  2. `LEDGER` (Historical Transactions): Subtle slate outline icon and monospace label `LEDGER`.
  3. `SPLITS` (Shared Debt & Groups): Subtle slate outline icon and monospace label `SPLITS`.
  4. `CARDS` (Accounts & Wallets): Subtle slate outline icon and monospace label `CARDS`.

---

## 5. Layout & Spatial Principles

- **Single-Column Mobile Stack:** Maximum width containment, full responsive padding (`16px` to `20px` horizontal screen gutters).
- **Asymmetric Grid over 3-Card Symmetries:** Banned generic 3-card equal boxes. Split obligations strictly use 2-column asymmetric bento cards.
- **Corner Radii Hierarchy:**
  - Screen containers / Modals: `32px` (`rounded-[32px]`).
  - Primary Hero & Budget Cards: `28px` (`rounded-[28px]`).
  - Secondary Bento Cards: `24px` (`rounded-[24px]`).
  - Action Pills & Buttons: `18px` (`rounded-[18px]`).
  - Status Badges, Chips & Floating Action Buttons: `9999px` (`rounded-full`).
- **Touch Geometry (WCAG AA):** Every tappable icon, chip, and cell satisfies the minimum $44 \times 44\text{px}$ touch target with explicit `hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}`.

---

## 6. Motion Philosophy & Micro-Interactions

- **Spring Physics Standard:** `stiffness: 100, damping: 20` for all sheet presentations, modal entries, and interactive pushes. No linear easing.
- **Tactile Feedback:** Buttons and interactive cards feature micro-scale compression:
  - Active buttons: `active:scale-95`
  - Active bento cards: `active:scale-98`
- **Performance:** Hardware-accelerated transforms (`transform: [{ scale }]`, `opacity`) only. Never animate layout dimensions (`width`, `height`, `top`, `left`).

---

## 7. Anti-Patterns (Explicitly Banned)

1. **NO All-Black Void (`#000000`):** Pitch black screens create harsh visual fatigue. All dark surfaces must use Deep Obsidian Forest (`#0D1C13` / `#0A120D`).
2. **NO AI Purple/Indigo Gradients:** Electric purple button glows, violet ambient meshes, and generic AI gradients are strictly forbidden.
3. **NO Symmetrical 3-Card Feature Grids:** Clichéd "3 identical cards in a row" are banned in favor of asymmetric bento telemetry.
4. **NO Decorative Gold (Anti-Gold Wall):** `#C9A24B` is exclusively reserved for overdue debts (`due_date < today`). Using gold for active tabs, regular buttons, or decoration is prohibited.
5. **NO Emojis as Primary Interface Icons:** All icons must be clean vectors (Ionicons / Lucide / custom SVG paths), never Unicode emojis in buttons or headers.
6. **NO Generic AI Copywriting:** Words like *"Elevate"*, *"Seamless"*, *"Unleash"*, *"Next-Gen"* are banned. Use precise financial terminology (*"Reconciled Daily"*, *"Safe Pace"*, *"Shared Tab"*, *"Settle Up"*).
7. **NO Floating Fractions / Precision Loss:** Floating-point arithmetic on currency is strictly prohibited. All amounts are stored and calculated in integer minor units.
8. **NO Touch Targets Under 44px:** All buttons, filters, and icons must meet the minimum $44 \times 44\text{px}$ bounding box.
