import { useUser } from "@clerk/expo";
import { useMemo, useState } from "react";

import {
  calculateSafeDailySpend,
  getCurrentMonthDate,
  getDaysRemainingInMonth,
} from "@shared/lib/budgetCalculations";
import { endOfLocalMonth, startOfLocalMonth } from "@shared/lib/dates";
import {
  fromMinorUnits,
  subtractMoney,
  sumMoney,
  toMinorUnits,
} from "@shared/lib/money";
import { mapTransactionToDetailedItem } from "@shared/lib/transactionMapper";
import {
  useAccountsWithBalancesQuery,
  useBudgetsQuery,
  useCategoriesQuery,
  useSplitsSummaryQuery,
  useTransactionsQuery,
} from "../../../../store/hooks";
import { useUserStore } from "../../../../store/userStore";
import type { CategoryAllocation, HomeScreenData } from "../types";

// ────────────────────────────────────────────────
// Hook Implementation
// ────────────────────────────────────────────────

export function useHomeScreenData(): HomeScreenData {
  const { user } = useUser();
  const storeCurrency = useUserStore((s) => s.currency);
  const monthStartMode = useUserStore((s) => s.monthStartMode);
  const selectedAccountId = useUserStore((s) => s.activeFilterAccountId);
  const setSelectedAccountId = useUserStore((s) => s.setActiveFilterAccountId);
  const [refreshing, setRefreshing] = useState(false);

  // ── Date anchors (stable per render) ──
  const today = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => getCurrentMonthDate(today), [today]);
  const monthFromIso = useMemo(() => startOfLocalMonth(today).toISOString(), [today]);
  const monthToIso = useMemo(() => endOfLocalMonth(today).toISOString(), [today]);
  const daysRemaining = useMemo(() => getDaysRemainingInMonth(today), [today]);

  // ── Queries ──
  const accountsQuery = useAccountsWithBalancesQuery();
  const accounts = accountsQuery.data ?? [];

  // Query 1: Full-month transactions for accurate metrics (no limit)
  const monthTransactionsQuery = useTransactionsQuery({
    accountId: selectedAccountId || undefined,
    dateFrom: monthFromIso,
    dateTo: monthToIso,
  });
  const monthTransactions = monthTransactionsQuery.data ?? [];

  // Query 2: Recent transactions feed (capped for UI performance, lazy rendered)
  const feedQuery = useTransactionsQuery({
    accountId: selectedAccountId || undefined,
    limit: 50,
  });
  const feedRaw = feedQuery.data ?? [];

  const budgetsQuery = useBudgetsQuery(monthStart);
  const budgets = budgetsQuery.data ?? [];

  const categoriesQuery = useCategoriesQuery();
  const categories = categoriesQuery.data ?? [];

  const splitsSummaryQuery = useSplitsSummaryQuery();
  const splitsSummary = splitsSummaryQuery.data?.summary;
  const rawSplits = splitsSummaryQuery.data?.splits ?? [];

  // ── Pull-to-refresh handler ──
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      accountsQuery.refetch(),
      monthTransactionsQuery.refetch(),
      feedQuery.refetch(),
      budgetsQuery.refetch(),
      categoriesQuery.refetch(),
      splitsSummaryQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  // ── Relational Lookup Maps ──
  const categoryMap = useMemo(() => {
    const map = new Map<string, { name: string; icon: string | null }>();
    for (const c of categories) {
      map.set(c.id, { name: c.name, icon: c.icon });
    }
    return map;
  }, [categories]);

  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of accounts) {
      map.set(a.id, a.name);
    }
    return map;
  }, [accounts]);

  // ── Active Account Resolution ──
  const currentAccount = useMemo(
    () => (selectedAccountId ? accounts.find((a) => a.id === selectedAccountId) ?? null : null),
    [accounts, selectedAccountId],
  );

  const baseCurrency = storeCurrency || "PKR";
  const totalLiquidBalance = useMemo(
    () =>
      sumMoney(
        accounts
          .filter((a) => (a.currency || baseCurrency) === baseCurrency)
          .map((a) => Number(a.balance)),
      ),
    [accounts, baseCurrency],
  );

  // ── Monthly Aggregates (derived from completed current-month transactions in minor units) ──
  const { monthlyIncome, monthlyExpenses, monthlyNet } = useMemo(() => {
    let incomeMinor = 0;
    let expensesMinor = 0;
    for (const tx of monthTransactions) {
      if (tx.status !== "completed") continue;
      if (!selectedAccountId && (tx.account?.currency || baseCurrency) !== baseCurrency) {
        continue;
      }
      const amountMinor = Math.abs(toMinorUnits(Number(tx.amount)));
      if (tx.type === "income") incomeMinor += amountMinor;
      else if (tx.type === "expense") expensesMinor += amountMinor;
    }
    return {
      monthlyIncome: fromMinorUnits(incomeMinor),
      monthlyExpenses: fromMinorUnits(expensesMinor),
      monthlyNet: fromMinorUnits(incomeMinor - expensesMinor),
    };
  }, [monthTransactions, selectedAccountId, baseCurrency]);

  const activeBalance = currentAccount
    ? Number(currentAccount.balance)
    : monthStartMode === "zero"
      ? monthlyNet
      : totalLiquidBalance;
  const activeCurrency = currentAccount?.currency ?? baseCurrency;
  const accountLabel = currentAccount
    ? `${currentAccount.name} (**** ${currentAccount.id.slice(-4)})`
    : monthStartMode === "zero"
      ? "This Month (Zero-Based)"
      : "All Accounts Combined";

  // ── Budget & Safe Spend Calculations ──
  const totalBudget = useMemo(() => {
    const matchingMonthly = budgets.filter(
      (budget) =>
        (!budget.period_type || budget.period_type === "month") &&
        (!selectedAccountId ||
          !budget.account_id ||
          budget.account_id === "all" ||
          budget.account_id === selectedAccountId),
    );
    const overallBudget = sumMoney(
      matchingMonthly
        .filter((budget) => !budget.category_id || budget.category_id === "all")
        .map((budget) => Number(budget.amount)),
    );
    const categoryBudgets = sumMoney(
      matchingMonthly
        .filter((budget) => Boolean(budget.category_id && budget.category_id !== "all"))
        .map((budget) => Number(budget.amount)),
    );
    return Math.max(overallBudget, categoryBudgets);
  }, [budgets, selectedAccountId]);

  const remainingBudget = Math.max(subtractMoney(totalBudget, monthlyExpenses), 0);
  const budgetProgressPercent =
    totalBudget > 0 ? Math.min(Math.round((monthlyExpenses / totalBudget) * 100), 100) : 0;
  const dailyAllowance = Math.round(
    calculateSafeDailySpend(totalBudget, monthlyExpenses, daysRemaining),
  );

  // ── Dynamic Category Allocations (Stitch 3-bar budget pacing) ──
  const categoryAllocations = useMemo<CategoryAllocation[]>(() => {
    const categorySpentMap = new Map<string, number>();
    for (const tx of monthTransactions) {
      if (tx.status !== "completed" || tx.type !== "expense" || !tx.category_id) continue;
      const current = categorySpentMap.get(tx.category_id) ?? 0;
      categorySpentMap.set(tx.category_id, current + Math.abs(toMinorUnits(Number(tx.amount))));
    }

    const ALLOCATION_COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899"];
    const result: CategoryAllocation[] = [];

    // Prioritize explicit budgets
    let colorIdx = 0;
    for (const b of budgets) {
      if (!b.category_id || b.category_id === "all") continue;
      const cat = categoryMap.get(b.category_id);
      const spentMinor = categorySpentMap.get(b.category_id) ?? 0;
      const budgetAmount = Number(b.amount);
      const spentAmount = fromMinorUnits(spentMinor);
      const percent = budgetAmount > 0 ? Math.min(Math.round((spentAmount / budgetAmount) * 100), 100) : 0;

      result.push({
        id: b.category_id,
        name: cat?.name ?? "Category",
        icon: cat?.icon ?? "🏷️",
        spent: spentAmount,
        budget: budgetAmount,
        percent,
        color: ALLOCATION_COLORS[colorIdx % ALLOCATION_COLORS.length],
      });
      colorIdx++;
    }

    // If fewer than 5, backfill from top-spent categories
    if (result.length < 5) {
      const existingIds = new Set(result.map((r) => r.id));
      const sortedSpent = Array.from(categorySpentMap.entries())
        .filter(([id]) => !existingIds.has(id))
        .sort((a, b) => b[1] - a[1]);

      for (const [catId, spentMinor] of sortedSpent) {
        if (result.length >= 5) break;
        const cat = categoryMap.get(catId);
        const spentAmount = fromMinorUnits(spentMinor);
        const targetBudget = Math.max(spentAmount * 1.3, 100);
        result.push({
          id: catId,
          name: cat?.name ?? "Category",
          icon: cat?.icon ?? "🏷️",
          spent: spentAmount,
          budget: Math.round(targetBudget),
          percent: Math.min(Math.round((spentAmount / targetBudget) * 100), 100),
          color: ALLOCATION_COLORS[colorIdx % ALLOCATION_COLORS.length],
        });
        colorIdx++;
      }
    }

    // If still empty (e.g. brand new user), backfill from available user categories
    if (result.length === 0 && categories.length > 0) {
      for (const cat of categories.slice(0, 5)) {
        result.push({
          id: cat.id,
          name: cat.name,
          icon: cat.icon ?? "🏷️",
          spent: 0,
          budget: 0,
          percent: 0,
          color: ALLOCATION_COLORS[colorIdx % ALLOCATION_COLORS.length],
        });
        colorIdx++;
      }
    }

    return result.slice(0, 6);
  }, [monthTransactions, budgets, categoryMap, categories]);

  // ── Split & Debt Obligations Telemetry ──
  const { totalOwedToMe, totalIOwe, pendingOwedCount, pendingDebtors } = useMemo(() => {
    const owedToMe = splitsSummary?.totalOwedToMe ?? 0;
    const iOwe = splitsSummary?.totalIOwe ?? 0;
    
    // Extract pending open debtors
    const openDebts = rawSplits.filter(
      (s) => s.status !== "settled" && Number(s.share_amount || s.remaining_amount || 0) > 0,
    );
    const debtors = Array.from(new Set(openDebts.map((s) => s.member_name || "Friend"))).slice(0, 3);

    return {
      totalOwedToMe: owedToMe,
      totalIOwe: iOwe,
      pendingOwedCount: openDebts.length,
      pendingDebtors: debtors,
    };
  }, [splitsSummary, rawSplits]);

  // ── Formatted Feed for UI ──
  const feedTransactions = useMemo(
    () =>
      feedRaw.map((tx) =>
        mapTransactionToDetailedItem(
          tx,
          categoryMap,
          accountMap,
          currentAccount?.name ?? "Account",
          activeCurrency,
          today,
        ),
      ),
    [feedRaw, categoryMap, accountMap, currentAccount, activeCurrency, today],
  );

  const cycleMonthName = useMemo(
    () => today.toLocaleString("en-US", { month: "long" }),
    [today],
  );

  const selectedBudgetName = useMemo(() => {
    const master = budgets.find((b) => !b.category_id || b.category_id === "all");
    return master?.name || (budgets[0]?.name ?? "Monthly Master Budget");
  }, [budgets]);

  const isLoading =
    accountsQuery.isLoading || monthTransactionsQuery.isLoading || feedQuery.isLoading;
  const isError =
    accountsQuery.isError || monthTransactionsQuery.isError || feedQuery.isError;
  const error =
    accountsQuery.error ?? monthTransactionsQuery.error ?? feedQuery.error;

  return {
    userName: user?.firstName ?? "User",
    userImageUrl: user?.imageUrl,
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    currentAccount,
    activeBalance,
    totalBalance: totalLiquidBalance,
    activeCurrency,
    accountLabel,
    monthlyIncome,
    monthlyExpenses,
    monthlyNet,
    monthStartMode,
    totalBudget,
    remainingBudget,
    budgetProgressPercent,
    dailyAllowance,
    daysRemaining,
    cycleMonthName,
    selectedBudgetName,
    totalOwedToMe,
    totalIOwe,
    pendingOwedCount,
    pendingDebtors,
    categoryAllocations,
    feedTransactions,
    rawFeedTransactions: feedRaw,
    isLoading,
    isError,
    error,
    onRefresh,
    refreshing,
  };
}