import { useUser } from "@clerk/expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteBudget, getBudgets, upsertBudget } from "../../services/budget";
import type { SaveBudgetPayload } from "../../src/features/budgets/types";
import { useSupabase } from "../../src/shared/hooks/useSupabase";
import { queryKeys } from "../keys";

export function useBudgetsQuery(monthDate?: string) {
  const { user, isLoaded } = useUser();
  const supabase = useSupabase();

  return useQuery({
    queryKey: queryKeys.budgets(user?.id, monthDate),
    queryFn: () => getBudgets(supabase, user!.id, monthDate),
    enabled: Boolean(isLoaded && user?.id),
  });
}

export function useUpsertBudgetMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SaveBudgetPayload) => {
      if (!user?.id) throw new Error("User not authenticated");
      return upsertBudget(supabase, {
        ...payload,
        userId: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.budgets(user?.id),
      });
    },
  });
}

export function useDeleteBudgetMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (budgetId: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      return deleteBudget(supabase, user.id, budgetId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.budgets(user?.id),
      });
    },
  });
}