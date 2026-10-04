import { useUser } from "@clerk/expo";
import { useMemo, useState } from "react";

import {
  calculateSafeDailySpend,
  getCurrentMonthDate,
  getDaysRemainingInMonth,
} from "@shared/lib/budgetCalculations";
import type { TransactionWithCategory } from "../../../../services/transactions";
import {
  useAccountsWithBalancesQuery,
  useBudgetsQuery,
  useCategoriesQuery,
  useTransactionsQuery,
} from "../../../../store/hooks";
import { useUserStore } from "../../../../store/userStore";
import type { DetailedTransactionItem, HomeScreenData } from "../types";

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────

/** Returns "YYYY-MM-01" for the first day of the next month. */
function getNextMonthDate(ref = new Date()): string {
  const year = ref.getMonth() === 11 ? ref.getFullYear() + 1 : ref.getFullYear();
  const month = String(((ref.getMonth() + 1) % 12) + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

const AVATAR_COLORS: Record<string, string> = {
  income: "#0F766E",
  transfer: "#0F172A",
  expense: "#2563EB",
};

function mapToDetailedItem(
  tx: TransactionWithCategory,
  categoryMap: Map<string, { name: string; icon: string | null }>,
  accountMap: Map<string, string>,
  fallbackAccountName: string,
  activeCurrency: string,
  today: Date,
): DetailedTransactionItem {
  const txDate = new Date(tx.date);
  const isToday = txDate.toDateString() === today.toDateString();
  const isYesterday =
    new Date(Date.now() - 86_400_000).toDateString() === txDate.toDateString();

  const dateStr = isToday
    ? "Today"
    : isYesterday
      ? "Yesterday"
      : txDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const catMeta = tx.category_id ? categoryMap.get(tx.category_id) : null;
  const categoryName =
    tx.category?.name ?? catMeta?.name ?? (tx.type === "income" ? "Income" : "General");
  const categoryIcon =
    tx.category?.icon ?? catMeta?.icon ?? (tx.type === "income" ? "💰" : "🏷️");
  const accountName =
    (tx.account as any)?.name ??
    (tx.account_id ? accountMap.get(tx.account_id) : null) ??
    fallbackAccountName;

  return {
    id: tx.id,
    name: tx.description || categoryName,
    note: tx.description && tx.description !== categoryName ? tx.description : null,
    time: txDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    dateStr,
    amount: tx.type === "income" ? Number(tx.amount) : -Number(tx.amount),
    type: tx.type as DetailedTransactionItem["type"],
    categoryName,
    categoryIcon,
    accountName,
    currency: (tx.account as any)?.currency ?? activeCurrency,
    inputMethod: (tx.input_method as DetailedTransactionItem["inputMethod"]) ?? "manual",
    avatarBg: AVATAR_COLORS[tx.type] ?? AVATAR_COLORS.expense,
  };
}

// ────────────────────────────────────────────────
// Hook Implementation
// ────────────────────────────────────────────────

export function useHomeScreenData(): HomeScreenData {
  const { user } = useUser();
  const storeCurrency = useUserStore((s) => s.currency);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Date anchors (stable per render) ──
  const today = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => getCurrentMonthDate(today), [today]);
  const monthEnd = useMemo(() => getNextMonthDate(today), [today]);
  const daysRemaining = useMemo(() => getDaysRemainingInMonth(today), [today]);

  // ── Queries ──
  const accountsQuery = useAccountsWithBalancesQuery();
  const accounts = accountsQuery.data ?? [];

  // Query 1: Full-month transactions for accurate metrics (no limit)
  const monthTransactionsQuery = useTransactionsQuery({
    accountId: selectedAccountId || undefined,
    dateFrom: monthStart,
    dateTo: monthEnd,
  });
  const monthTransactions = monthTransactionsQuery.data ?? [];

  // Query 2: Recent transactions feed (capped for UI performance)
  const feedQuery = useTransactionsQuery({
    accountId: selectedAccountId || undefined,
    limit: 5,
  });
  const feedRaw = feedQuery.data ?? [];

  const budgetsQuery = useBudgetsQuery(monthStart);
  const budgets = budgetsQuery.data ?? [];

  const categoriesQuery = useCategoriesQuery();
  const categories = categoriesQuery.data ?? [];

  // ── Pull-to-refresh handler ──
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      accountsQuery.refetch(),
      monthTransactionsQuery.refetch(),
      feedQuery.refetch(),
      budgetsQuery.refetch(),
      categoriesQuery.refetch(),
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

  const totalLiquidBalance = useMemo(
    () => accounts.reduce((acc, a) => acc + Number(a.balance), 0),
    [accounts],
  );

  const activeBalance = currentAccount ? Number(currentAccount.balance) : totalLiquidBalance;
  const activeCurrency = currentAccount?.currency ?? storeCurrency ?? "PKR";
  const accountLabel = currentAccount
    ? `${currentAccount.name} (**** ${currentAccount.id.slice(-4)})`
    : "All Accounts Combined";

  // ── Monthly Aggregates (derived from all current month transactions) ──
  const { monthlyIncome, monthlyExpenses } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const tx of monthTransactions) {
      const amt = Number(tx.amount);
      if (tx.type === "income") income += amt;
      else if (tx.type === "expense") expenses += amt;
    }
    return { monthlyIncome: income, monthlyExpenses: expenses };
  }, [monthTransactions]);

  // ── Budget & Safe Spend Calculations ──
  const totalBudget = useMemo(
    () => budgets.reduce((sum, b) => sum + Number(b.amount), 0),
    [budgets],
  );

  const remainingBudget = Math.max(totalBudget - monthlyExpenses, 0);
  const budgetProgressPercent =
    totalBudget > 0 ? Math.min(Math.round((monthlyExpenses / totalBudget) * 100), 100) : 0;
  const dailyAllowance = Math.round(
    calculateSafeDailySpend(totalBudget, monthlyExpenses, daysRemaining),
  );

  // ── Formatted Feed for UI ──
  const feedTransactions = useMemo(
    () =>
      feedRaw.map((tx) =>
        mapToDetailedItem(
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

  const isLoading =
    accountsQuery.isLoading || monthTransactionsQuery.isLoading || feedQuery.isLoading;

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
    totalBudget,
    remainingBudget,
    budgetProgressPercent,
    dailyAllowance,
    daysRemaining,
    cycleMonthName,
    feedTransactions,
    isLoading,
    onRefresh,
    refreshing,
  };
}