import { useMemo, useState } from "react";

import { DEFAULT_CATEGORIES } from "@services/categories";
import { fromMinorUnits, toMinorUnits } from "@shared/lib/money";
import {
  useAccountsWithBalancesQuery,
  useBudgetsQuery,
  useCategoriesQuery,
  useTransactionsQuery,
} from "@store/hooks";
import { useUserStore } from "@store/userStore";
import type {
  AnalyticsPeriod,
  AnalyticsSummary,
  CategorySpendBreakdown,
  DaySpendItem,
  DiagnosticInsight,
} from "../types";

const CATEGORY_COLORS = [
  "#22C55E", // Emerald
  "#3B82F6", // Blue
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#64748B", // Slate
];

export function useAnalyticsData() {
  const storeCurrency = useUserStore((s) => s.currency) || "PKR";
  const [period, setPeriod] = useState<AnalyticsPeriod>("this_month");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const { data: accounts = [] } = useAccountsWithBalancesQuery();
  const { data: rawCategories = [] } = useCategoriesQuery();
  const { data: transactions = [], isLoading, isError, refetch } = useTransactionsQuery({
    limit: 500,
  });
  const { data: budgets = [] } = useBudgetsQuery();

  const categories = useMemo(() => {
    if (rawCategories.length > 0) return rawCategories;
    return DEFAULT_CATEGORIES.map((cat, idx) => ({
      id: `default-${idx + 1}`,
      name: cat.name,
      icon: cat.icon,
      is_default: true,
      user_id: "",
      created_at: "",
      updated_at: "",
    }));
  }, [rawCategories]);

  const summary = useMemo<AnalyticsSummary>(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    let daysInPeriod = 30;

    if (period === "this_month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      daysInPeriod = Math.max(1, now.getDate());
    } else if (period === "last_month") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      daysInPeriod = endDate.getDate();
    } else if (period === "last_30_days") {
      startDate = new Date(now.getTime() - 30 * 86_400_000);
      daysInPeriod = 30;
    } else {
      // all_time
      startDate = new Date(0);
      daysInPeriod = 365;
    }

    // Filter relevant transactions
    const periodTxs = transactions.filter((tx) => {
      if (tx.status !== "completed") return false;
      if (tx.type === "transfer") return false;
      if (selectedAccountId && tx.account_id !== selectedAccountId) return false;

      const txDate = new Date(tx.date);
      if (period !== "all_time") {
        if (txDate < startDate || txDate > endDate) return false;
      }
      return true;
    });

    let incomeMinor = 0;
    let expenseMinor = 0;
    const categoryTotals: { [catId: string]: { amountMinor: number; count: number } } = {};
    const dayTotals: { [dateKey: string]: number } = {};
    const expenseList: Array<{
      id: string;
      description: string;
      amount: number;
      date: string;
      categoryId: string | null;
      accountId: string;
    }> = [];

    for (const tx of periodTxs) {
      const val = Number(tx.amount);
      const absMinor = Math.abs(toMinorUnits(val));

      if (val > 0) {
        incomeMinor += absMinor;
      } else {
        expenseMinor += absMinor;
        const catId = tx.category_id || "uncategorized";
        if (!categoryTotals[catId]) {
          categoryTotals[catId] = { amountMinor: 0, count: 0 };
        }
        categoryTotals[catId].amountMinor += absMinor;
        categoryTotals[catId].count += 1;

        // Daily histogram
        const dateKey = tx.date.slice(0, 10);
        dayTotals[dateKey] = (dayTotals[dateKey] || 0) + fromMinorUnits(absMinor);

        expenseList.push({
          id: tx.id,
          description: tx.description || "Expense",
          amount: fromMinorUnits(absMinor),
          date: tx.date,
          categoryId: tx.category_id,
          accountId: tx.account_id,
        });
      }
    }

    const totalIncome = fromMinorUnits(incomeMinor);
    const totalExpenses = fromMinorUnits(expenseMinor);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate =
      totalIncome > 0
        ? Math.max(0, Math.min(100, Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)))
        : 0;
    const dailyAvgSpend = Math.round((totalExpenses / daysInPeriod) * 100) / 100;

    // Resolve category names and budgets
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const budgetMap = new Map(budgets.map((b) => [b.category_id, Number(b.amount)]));
    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

    const categoryBreakdown: CategorySpendBreakdown[] = Object.entries(categoryTotals)
      .map(([catId, data], index) => {
        const cat = categoryMap.get(catId);
        const amount = fromMinorUnits(data.amountMinor);
        const percentage = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
        const budgetLimit = budgetMap.get(catId);
        const isOverBudget = budgetLimit !== undefined && budgetLimit > 0 && amount > budgetLimit;

        return {
          id: catId,
          name: cat?.name || "Other / Uncategorized",
          icon: cat?.icon || "tag",
          amount,
          percentage,
          count: data.count,
          color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
          budgetLimit,
          isOverBudget,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // Build Diagnostic Intelligence ("What's going wrong")
    const insights: DiagnosticInsight[] = [];

    // 1. Deficit check
    if (totalExpenses > totalIncome && totalIncome > 0) {
      insights.push({
        id: "insight-deficit",
        type: "critical",
        title: "Cashflow Deficit",
        message: `Your total spending (${totalExpenses.toLocaleString()} ${storeCurrency}) exceeds your income (${totalIncome.toLocaleString()} ${storeCurrency}) by ${(totalExpenses - totalIncome).toLocaleString()} ${storeCurrency}.`,
        impactAmount: totalExpenses - totalIncome,
      });
    }

    // 2. Over-budget categories
    const overBudgetCats = categoryBreakdown.filter((c) => c.isOverBudget);
    for (const oc of overBudgetCats) {
      const overBy = oc.amount - (oc.budgetLimit || 0);
      insights.push({
        id: `insight-over-${oc.id}`,
        type: "critical",
        title: `Over Budget: ${oc.name}`,
        message: `You spent ${oc.amount.toLocaleString()} ${storeCurrency} on ${oc.name}, which exceeds your ${oc.budgetLimit?.toLocaleString()} ${storeCurrency} monthly limit by ${overBy.toLocaleString()} ${storeCurrency}.`,
        impactAmount: overBy,
        categoryName: oc.name,
      });
    }

    // 3. Fast Burn Warning (Spent > 75% of budget with more than 10 days left in month)
    const daysRemainingInMonth =
      new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
    if (period === "this_month" && daysRemainingInMonth > 8) {
      for (const cb of categoryBreakdown) {
        if (cb.budgetLimit && !cb.isOverBudget && cb.budgetLimit > 0) {
          const usagePercent = Math.round((cb.amount / cb.budgetLimit) * 100);
          if (usagePercent >= 75) {
            insights.push({
              id: `insight-burn-${cb.id}`,
              type: "warning",
              title: `High Velocity: ${cb.name}`,
              message: `${cb.name} has consumed ${usagePercent}% of its allocation with ${daysRemainingInMonth} days remaining in this billing cycle.`,
              categoryName: cb.name,
            });
          }
        }
      }
    }

    // 4. Untracked Leakage (categories with no budget limit set)
    const unbudgetedSpendMinor = categoryBreakdown
      .filter((c) => !c.budgetLimit || c.budgetLimit <= 0)
      .reduce((sum, c) => sum + toMinorUnits(c.amount), 0);
    const unbudgetedSpend = fromMinorUnits(unbudgetedSpendMinor);
    if (unbudgetedSpend > 0 && totalExpenses > 0) {
      const unbudgetedPercent = Math.round((unbudgetedSpend / totalExpenses) * 100);
      if (unbudgetedPercent >= 25) {
        insights.push({
          id: "insight-unbudgeted",
          type: "warning",
          title: "Untracked Spending Leakage",
          message: `${unbudgetedSpend.toLocaleString()} ${storeCurrency} (${unbudgetedPercent}% of your total outflow) went into categories without a defined budget cap.`,
          impactAmount: unbudgetedSpend,
        });
      }
    }

    // 5. Heavy Concentration Alert (> 40% of all spending in a single category)
    if (categoryBreakdown.length > 0 && categoryBreakdown[0].percentage >= 40) {
      const topCat = categoryBreakdown[0];
      insights.push({
        id: `insight-concentration-${topCat.id}`,
        type: "info",
        title: `Heavy Outflow in ${topCat.name}`,
        message: `${topCat.name} accounts for ${topCat.percentage}% of all your expenses this period (${topCat.amount.toLocaleString()} ${storeCurrency}).`,
        categoryName: topCat.name,
      });
    }

    // 6. Healthy Affirmation if no critical issues found
    if (insights.filter((i) => i.type === "critical").length === 0) {
      if (savingsRate >= 20) {
        insights.push({
          id: "insight-healthy-savings",
          type: "positive",
          title: "Healthy Savings Momentum",
          message: `Great job! You are retaining ${savingsRate}% of your income as net savings with balanced category allocations.`,
        });
      } else if (totalExpenses === 0) {
        insights.push({
          id: "insight-zero-expense",
          type: "info",
          title: "No Expenses Recorded",
          message: "No outgoing expenses found for this period. As you record transactions, AI diagnostic insights will appear here.",
        });
      }
    }

    // Daily Trend (Last 7 days)
    const dailyTrend: DaySpendItem[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      dailyTrend.push({
        date: key,
        dayLabel: dayName,
        amount: dayTotals[key] || 0,
      });
    }

    // Largest 5 expenses
    const largestExpenses = expenseList
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        description: item.description,
        amount: item.amount,
        date: item.date,
        categoryName: item.categoryId
          ? categoryMap.get(item.categoryId)?.name || "General"
          : "General",
        accountName: accountMap.get(item.accountId) || "Account",
      }));

    return {
      period,
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      dailyAvgSpend,
      topCategoryName: categoryBreakdown[0]?.name,
      topCategoryPercent: categoryBreakdown[0]?.percentage,
      currency: storeCurrency,
      insights,
      categoryBreakdown,
      dailyTrend,
      largestExpenses,
    };
  }, [period, selectedAccountId, transactions, categories, budgets, accounts, storeCurrency]);

  return {
    period,
    setPeriod,
    selectedAccountId,
    setSelectedAccountId,
    accounts,
    summary,
    isLoading,
    isError,
    refetch,
  };
}

