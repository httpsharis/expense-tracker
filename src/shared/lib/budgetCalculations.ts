import type { TransactionWithCategory } from "../../../services/transactions";
import type { Budget, BudgetPeriod, BudgetWithDerived } from "../../features/budgets/types";

/**
 * Pure math & ledger transformation helpers for budgets, spending limits, and pacing.
 */

export interface PeriodBounds {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Computes exact start and end date bounds for a given budget period type.
 */
export function getPeriodBounds(
  periodType: BudgetPeriod = "month",
  referenceDate = new Date(),
  customStart?: string | null,
  customEnd?: string | null
): PeriodBounds {
  const ref = new Date(referenceDate);

  if (periodType === "day") {
    const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0, 0);
    const end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59, 999);
    return { start, end, label: "Today" };
  }

  if (periodType === "week") {
    const day = ref.getDay(); // 0 is Sunday
    const start = new Date(ref);
    start.setDate(ref.getDate() - day);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: "This Week" };
  }

  if (periodType === "year") {
    const start = new Date(ref.getFullYear(), 0, 1, 0, 0, 0, 0);
    const end = new Date(ref.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start, end, label: "This Year" };
  }

  if (periodType === "custom" && customStart && customEnd) {
    const start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);

    const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { start, end, label: `${startStr} - ${endStr}` };
  }

  // Default: Month
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end, label: "This Month" };
}

/**
 * Checks if a transaction automatically matches a budget's filter and current period.
 * Ledger Invariant: Only expenses count towards spending limits.
 * An empty category_id / account_id means "all".
 */
export function matchesBudgetFilter(
  tx: TransactionWithCategory,
  budget: Pick<Budget, "category_id" | "account_id" | "period_type" | "period_start" | "period_end">,
  referenceDate = new Date()
): boolean {
  // 1. Only expense transactions count
  if (tx.type !== "expense") return false;

  // 2. Period bounds check
  const bounds = getPeriodBounds(
    budget.period_type,
    referenceDate,
    budget.period_start,
    budget.period_end
  );
  const txTime = new Date(tx.date).getTime();
  if (txTime < bounds.start.getTime() || txTime > bounds.end.getTime()) {
    return false;
  }

  // 3. Category filter (if set, must match)
  if (budget.category_id && budget.category_id !== "all") {
    if (tx.category_id !== budget.category_id) return false;
  }

  // 4. Account filter (if set, must match)
  if (budget.account_id && budget.account_id !== "all") {
    if (tx.account_id !== budget.account_id) return false;
  }

  return true;
}

/**
 * Derives live metrics for a budget by summing matching balance entries / transactions.
 * Spent and remaining are NEVER stored as a running total.
 */
export function deriveBudgetMetrics(
  budget: Budget,
  transactions: TransactionWithCategory[],
  referenceDate = new Date()
): BudgetWithDerived {
  const bounds = getPeriodBounds(
    budget.period_type,
    referenceDate,
    budget.period_start,
    budget.period_end
  );

  const matchingTransactions = transactions.filter((tx) =>
    matchesBudgetFilter(tx, budget, referenceDate)
  );

  const spent = matchingTransactions.reduce(
    (sum, tx) => sum + Number(tx.amount || 0),
    0
  );

  const cap = Number(budget.amount || 0);
  const remaining = Math.max(0, cap - spent);
  const percent = cap > 0 ? Math.round((spent / cap) * 100) : 0;
  const isExceeded = spent > cap;

  const nowMs = referenceDate.getTime();
  const startMs = bounds.start.getTime();
  const endMs = bounds.end.getTime();
  const totalDuration = Math.max(1, endMs - startMs);
  const elapsed = Math.max(0, Math.min(nowMs - startMs, totalDuration));

  const daysTotal = Math.max(1, Math.ceil(totalDuration / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(
    1,
    Math.ceil(Math.max(0, endMs - nowMs) / (1000 * 60 * 60 * 24))
  );

  const timePercent = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
  const safeDailySpend = daysRemaining > 0 ? Math.round(remaining / daysRemaining) : 0;

  // Real-time tracking pacing status
  let pacingStatus: "under" | "on_track" | "warning" | "exceeded" = "on_track";
  if (isExceeded) {
    pacingStatus = "exceeded";
  } else if (percent >= 90) {
    pacingStatus = "warning";
  } else if (percent > timePercent + 15) {
    // Spending faster than calendar progression
    pacingStatus = "warning";
  } else if (percent <= timePercent) {
    pacingStatus = "under";
  }

  return {
    ...budget,
    amount: cap,
    spent,
    remaining,
    percent,
    isExceeded,
    periodLabel: bounds.label,
    matchingTransactionCount: matchingTransactions.length,
    daysRemaining,
    daysTotal,
    safeDailySpend,
    timePercent,
    pacingStatus,
  };
}


/**
 * Determines whether a category name represents a savings, investment, or emergency fund goal.
 */
export function isSavingsCategory(name?: string | null): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return (
    lower.includes("saving") ||
    lower.includes("invest") ||
    lower.includes("emergency") ||
    lower.includes("gold") ||
    lower.includes("crypto") ||
    lower.includes("fund") ||
    lower.includes("reserve") ||
    lower.includes("deposit") ||
    lower.includes("wealth") ||
    lower.includes("future")
  );
}

/**
 * Calculates total spent per category for the specified month/cycle.
 * Only processes transactions where type === "expense".
 */
export function calculateCategorySpending(
  transactions: TransactionWithCategory[],
  monthDate?: string
): Map<string, number> {
  const spendingMap = new Map<string, number>();
  const targetDate = monthDate ? new Date(monthDate) : new Date();
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();

  for (const tx of transactions) {
    if (tx.type !== "expense") continue;

    const txDate = new Date(tx.date);
    if (
      txDate.getFullYear() === targetYear &&
      txDate.getMonth() === targetMonth
    ) {
      const current = spendingMap.get(tx.category_id || "unbudgeted") || 0;
      spendingMap.set(tx.category_id || "unbudgeted", current + Number(tx.amount || 0));
    }
  }

  return spendingMap;
}

/**
 * Calculates safe daily spend velocity for the remainder of the cycle.
 * Velocity = (Cap - Spent) / Days Left
 */
export function calculateSafeDailySpend(
  totalCap: number,
  totalSpent: number,
  daysRemaining: number
): number {
  if (daysRemaining <= 0) return 0;
  const remaining = Math.max(0, totalCap - totalSpent);
  return remaining / daysRemaining;
}

/**
 * Returns remaining days in the active calendar month.
 */
export function getDaysRemainingInMonth(referenceDate = new Date()): number {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const currentDay = referenceDate.getDate();
  return Math.max(1, totalDays - currentDay);
}

/**
 * Returns month formatted as "YYYY-MM-01" for query key and DB consistency.
 */
export function getCurrentMonthDate(referenceDate = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export type BudgetType = "expense" | "savings";
export type TransactionFilterType = "all" | "expense" | "income" | "transfer";
export type InclusionMode = "all_matching" | "selected_only";

/**
 * Computes status, percentages, and threshold flags for a budget item.
 */
export function getBudgetThresholdStatus(spent: number, cap: number) {
  const percent = cap > 0 ? Math.round((spent / cap) * 100) : 0;
  const isWarning = percent >= 80 && percent <= 100;
  const isExceeded = spent > cap;
  const remaining = Math.max(0, cap - spent);
  const overspend = Math.max(0, spent - cap);
  return { percent, isWarning, isExceeded, remaining, overspend };
}

