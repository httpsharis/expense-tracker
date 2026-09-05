Here is a professional, technical product strategy document that officially defines how Saldo will handle these core features. You can add this directly to your project documentation (e.g., as `PRODUCT_STRATEGY.md`).

---

# Saldo: Product Strategy & Architecture Decisions (Phase 0)

**Document Purpose:** To define the core product philosophy, finalize the target audience for Phase 0, and establish the technical mechanisms for ledger management and debt tracking.

---

## 1. Core Product Philosophy: "Solo First"

Based on market analysis and architectural constraints, Saldo Phase 0 is strictly a **Single-User Pocket Money Manager**, not a multiplayer hostel-management platform.

The primary value proposition is offering a lightning-fast, beautifully designed personal expense tracker. The "Group Split" functionality is a secondary feature designed for casual use (e.g., "I paid for lunch, you owe me"), rather than complex, multi-user household accounting.

### Target Audience Pivot

| Characteristic         | Phase 0 Target (The Solo User)          | Excluded for Now (The Hostelite)                     |
| ---------------------- | --------------------------------------- | ---------------------------------------------------- |
| **Primary Need** | "Where did my allowance go?"            | "Who owes what for rent and groceries?"              |
| **App Usage**    | One user logs all their own expenses.   | Multiple users log into a shared group ledger.       |
| **Debt Focus**   | Casual, occasional splits with friends. | Continuous, highly complex interconnected debts.     |
| **Architecture** | Single-user database with RLS.          | Multiplayer database with shared Row-Level Security. |

---

## 2. Core Feature 1: Month Transitions & Ledger Mechanics

Saldo operates on an **Append-Only Ledger System**. We do not store a static "balance" integer; the user's current pocket money is always calculated dynamically from the `balance_entries` table. This ensures perfect financial integrity.

To address user demands for flexibility in how their months transition, Saldo will support the following mechanics:

### A. Custom Month Cycles

Not all users receive their allowance on the 1st of the month.

* **Implementation:** The `months` table utilizes `started_at` and `ended_at` timestamps. Users can define custom start dates (e.g., the 15th to the 15th), freeing them from rigid calendar months.

### B. The Transition Choice: Rollover vs. Clean Slate

When a user closes an active month and opens a new one, they are presented with two options for their remaining balance:

1. **Standard Rollover (Default):** * *Logic:* The app simply calculates the total sum of all past `balance_entries` across all time. The leftover money naturally carries over to the new month.
2. **Start from Zero (Clean Slate):** * *Logic:* Money cannot magically disappear from a ledger. If a user has $50 left and wants to start the next month at $0, the system will automatically generate a background `expense` entry (Type: `balance_adjustment`, Amount: -$50).

* *Result:* This balances the ledger to zero mathematically without breaking database integrity.

---

## 3. Core Feature 2: Casual Splitting ("Debting")

To prevent the user from feeling like an unpaid accountant for their friends, the group splitting feature is designed to be as frictionless as possible for a single operator.

### A. The "Solo Splitting" Architecture

* **The Actor:** Only the authenticated Saldo user inputs data.
* **The Contacts:** Friends/roommates are strictly plain-text names stored in the `people` table. They do not have Saldo accounts or app access.
* **The Flow:** When the user pays for a shared bill, they log it once. The app's logic layer automatically generates the underlying `debts` rows.

### B. Simplification over Complexity

Saldo will focus on granular, 1-to-1 debt settlements.

* If Alice owes the User $20 for pizza, the User will simply tap "Settle" next to Alice's name when she hands them cash.
* The app will *not* attempt to run complex minimum-transaction routing algorithms (e.g., "Alice pays Bob so Bob can pay Charlie") as this requires a multiplayer ecosystem to function effectively.

---

## 4. Engineering Next Steps

With the logic clearly defined, the immediate development pipeline is:

1. **Implement Auth Store:** Finalize Zustand and Supabase Auth routing (Step 1).
2. **Build the Ledger Hook:** Create the TanStack Query hook that dynamically calculates the total from `balance_entries` to display the Live Balance Header.
3. **Build the Top-Up/Expense Forms:** Create the UI to insert standard, solo transactions.
