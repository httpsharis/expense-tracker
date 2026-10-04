import { useUser } from "@clerk/expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteBudget, getBudgets, upsertBudget } from "../../services/budget";
import { useSupabase } from "../../src/shared/hooks/useSupabase";
import type { BudgetPeriod, SaveBudgetPayload } from "../../src/features/budgets/types";
import { queryKeys } from "../keys";

/**
 * Hook to fetch budgets for the current user.
 */
export function useBudgetsQuery(monthDate?: string) {
  const { user } = useUser();
  const supabase = useSupabase();

  return useQuery({
    queryKey: queryKeys.budgets(user?.id, monthDate),
    queryFn: () => getBudgets(supabase, user!.id, monthDate),
    enabled: Boolean(user?.id),
  });
}

export type SaveBudgetInput = SaveBudgetPayload | {
  id?: string;
  name?: string;
  amount: number;
  period_type?: BudgetPeriod;
  periodType?: BudgetPeriod;
  period?: BudgetPeriod;
  category_id?: string | null;
  categoryId?: string | null;
  account_id?: string | null;
  accountId?: string | null;
  period_start?: string | null;
  periodStart?: string | null;
  period_end?: string | null;
  periodEnd?: string | null;
  monthDate?: string;
};

/**
 * Mutation to create or update a budget.
 */
export function useUpsertBudgetMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveBudgetInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      const normalizedPayload: SaveBudgetPayload = {
        id: input.id,
        name: input.name || "Budget",
        amount: Number(input.amount),
        period_type:
          (input as any).period_type ||
          (input as any).periodType ||
          (input as any).period ||
          "month",
        category_id:
          (input as any).category_id ?? (input as any).categoryId ?? null,
        account_id:
          (input as any).account_id ?? (input as any).accountId ?? null,
        period_start:
          (input as any).period_start ?? (input as any).periodStart ?? null,
        period_end:
          (input as any).period_end ?? (input as any).periodEnd ?? null,
      };

      return upsertBudget(supabase, {
        userId: user.id,
        ...normalizedPayload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["budgets", user?.id],
      });
    },
  });
}

/**
 * Mutation to delete a budget.
 */
export function useDeleteBudgetMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (budgetId: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      return deleteBudget(supabase, budgetId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["budgets", user?.id],
      });
    },
  });
}