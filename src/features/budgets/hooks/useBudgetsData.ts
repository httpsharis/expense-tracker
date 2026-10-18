import { useMemo, useState } from "react";
import { deriveBudgetMetrics } from "@shared/lib/budgetCalculations";
import {
  useAccountsQuery,
  useBudgetsQuery,
  useCategoriesQuery,
  useDeleteBudgetMutation,
  useTransactionsQuery,
  useUpsertBudgetMutation,
} from "../../../../store/hooks";
import type { Budget, BudgetWithDerived, SaveBudgetPayload } from "../types";

export function useBudgetsData() {
  const [activeDate] = useState(() => new Date());

  // Queries
  const {
    data: rawBudgets = [],
    isLoading: budgetsLoading,
    refetch: refetchBudgets,
  } = useBudgetsQuery();

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    refetch: refetchCategories,
  } = useCategoriesQuery();

  const {
    data: accounts = [],
    isLoading: accountsLoading,
    refetch: refetchAccounts,
  } = useAccountsQuery();

  const {
    data: transactions = [],
    isLoading: txLoading,
    refetch: refetchTransactions,
  } = useTransactionsQuery({});

  // Mutations
  const upsertMutation = useUpsertBudgetMutation();
  const deleteMutation = useDeleteBudgetMutation();

  const [refreshing, setRefreshing] = useState(false);
  const refetchAll = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchBudgets(),
      refetchCategories(),
      refetchAccounts(),
      refetchTransactions(),
    ]);
    setRefreshing(false);
  };

  // Fast lookups
  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  const accountMap = useMemo(() => {
    return new Map(accounts.map((a) => [a.id, a]));
  }, [accounts]);

  // Derive live metrics for each budget from ledger transactions
  const budgets = useMemo<BudgetWithDerived[]>(() => {
    return (rawBudgets as Budget[])
      .map((b) => {
        const derived = deriveBudgetMetrics(b, transactions, activeDate);
        const cat = b.category_id ? categoryMap.get(b.category_id) : null;
        const acc = b.account_id ? accountMap.get(b.account_id) : null;

        return {
          ...derived,
          category: cat ? { id: cat.id, name: cat.name, icon: cat.icon } : null,
          account: acc ? { id: acc.id, name: acc.name, currency: acc.currency } : null,
        };
      })
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
  }, [rawBudgets, transactions, activeDate, categoryMap, accountMap]);

  return {
    activeDate,
    budgets,
    categories,
    accounts,
    transactions,
    isLoading: budgetsLoading || categoriesLoading || accountsLoading || txLoading,
    refreshing,
    refetchAll,
    upsertBudget: (payload: SaveBudgetPayload) => upsertMutation.mutateAsync(payload),
    deleteBudget: (id: string) => deleteMutation.mutateAsync(id),
    isSaving: upsertMutation.isPending || deleteMutation.isPending,
  };
}

