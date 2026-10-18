import { z } from "zod";
import { addMoney, subtractMoney } from "@shared/lib/money";
import type { AssistantContext, GeminiFunctionDeclaration } from "../types";
import { MAX_PERSON_NAME_CHARS } from "./splits";

export const getFinancialSummarySchema = z.object({
  period: z.enum(["this_month", "last_month", "all_time"]),
});

export type GetFinancialSummaryInput = z.infer<typeof getFinancialSummarySchema>;

export const getBudgetStatusSchema = z.object({
  category: z.string().trim().min(1).max(MAX_PERSON_NAME_CHARS).optional(),
});

export type GetBudgetStatusInput = z.infer<typeof getBudgetStatusSchema>;

export function computeFinancialSummaryFromContext(
  rawArgs: unknown,
  context: Pick<AssistantContext, "recentTransactions">,
) {
  const { period } = getFinancialSummarySchema.parse(rawArgs);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const filtered = context.recentTransactions.filter((transaction) => {
    if (transaction.status === "pending" || transaction.status === "cancelled") {
      return false;
    }
    const txDate = new Date(transaction.created_at);
    if (period === "this_month") {
      return (
        txDate.getMonth() === currentMonth &&
        txDate.getFullYear() === currentYear
      );
    }
    if (period === "last_month") {
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear =
        currentMonth === 0 ? currentYear - 1 : currentYear;
      return (
        txDate.getMonth() === lastMonth &&
        txDate.getFullYear() === lastMonthYear
      );
    }
    return true;
  });

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals: Record<string, number> = {};

  for (const transaction of filtered) {
    const amount = Math.abs(transaction.amount);
    if (transaction.type === "income") {
      totalIncome = addMoney(totalIncome, amount);
    } else if (transaction.type === "expense") {
      totalExpense = addMoney(totalExpense, amount);
      const categoryName = transaction.category?.name ?? "Uncategorized";
      categoryTotals[categoryName] = addMoney(
        categoryTotals[categoryName] ?? 0,
        amount,
      );
    }
  }

  let topCategory = "None";
  let maxCategorySpend = 0;
  for (const [categoryName, spend] of Object.entries(categoryTotals)) {
    if (spend > maxCategorySpend) {
      maxCategorySpend = spend;
      topCategory = categoryName;
    }
  }

  const periodLabel =
    period === "this_month"
      ? "This Month"
      : period === "last_month"
        ? "Last Month"
        : "All Time";

  return {
    period: periodLabel,
    totalIncome,
    totalExpense,
    netCashflow: subtractMoney(totalIncome, totalExpense),
    topCategory,
  };
}

export function computeBudgetStatusFromContext(
  rawArgs: unknown,
  context: Pick<AssistantContext, "budgets" | "categories">,
) {
  const { category } = getBudgetStatusSchema.parse(rawArgs);
  const categoryFilter = category?.toLowerCase();

  return context.budgets
    .map((budget) => {
      const matchedCategory = context.categories.find(
        (item) => item.id === budget.category_id,
      );
      const categoryName = matchedCategory?.name ?? budget.name ?? "General";
      const spent = budget.spent ?? 0;
      const limit = budget.amount;
      const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      return {
        category: categoryName,
        spent,
        limit,
        percentage,
      };
    })
    .filter((item) =>
      categoryFilter
        ? item.category.toLowerCase().includes(categoryFilter)
        : true,
    );
}

export const GET_FINANCIAL_SUMMARY_DECLARATION: GeminiFunctionDeclaration = {
  name: "get_financial_summary",
  description:
    "Calculate total income, total expenses, net cashflow, and top spending category for a period.",
  parameters: {
    type: "OBJECT",
    properties: {
      period: {
        type: "STRING",
        enum: ["this_month", "last_month", "all_time"],
        description: "The time period to summarize.",
      },
    },
    required: ["period"],
  },
};

export const GET_BUDGET_STATUS_DECLARATION: GeminiFunctionDeclaration = {
  name: "get_budget_status",
  description:
    "Check budget spending vs limit across all budgets or for a specific category.",
  parameters: {
    type: "OBJECT",
    properties: {
      category: {
        type: "STRING",
        description: "Optional category name to filter budgets.",
      },
    },
    required: [],
  },
};

