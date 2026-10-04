import { useUser } from "@clerk/expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createTransaction,
    deleteTransaction,
    getTransactions,
    TransactionFilter,
    TransactionInsert
} from "../../services/transactions";
import { useSupabase } from "../../src/shared/hooks/useSupabase";
import { queryKeys } from "../keys";

/**
 * Hook to fetch transactions feed with optional filtering by type, account, category, or limit.
 */
export function useTransactionsQuery(filters: TransactionFilter = {}) {
  const { user } = useUser();
  const supabase = useSupabase();

  return useQuery({
    queryKey: queryKeys.transactions(user?.id, filters),
    queryFn: () => getTransactions(supabase, user?.id || "default", filters),
    enabled: true, // Allow optimistic / fallback ledger even if user is loading
  });
}

export type CreateTransactionInput = Omit<TransactionInsert, "user_id">;

/**
 * Mutation to create a transaction.
 * Synchronizes:
 * 1. Transactions feed cache
 * 2. Account live balances cache (since money moved!)
 * 3. Monthly budget cache (since category spending changed!)
 */
export function useCreateTransactionMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const effectiveUserId = user?.id || "default";

      return createTransaction(supabase, {
        ...input,
        user_id: effectiveUserId,
      });
    },
    onSuccess: () => {
      // 1. Invalidate all transaction queries for this user
      queryClient.invalidateQueries({
        queryKey: ["transactions"],
      });

      // 2. Invalidate account balances cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.accountsWithBalances(user?.id),
      });

      // 3. Invalidate monthly budget caches
      queryClient.invalidateQueries({
        queryKey: ["budgets"],
      });
    },
  });
}

/**
 * Mutation to delete a transaction.
 */
export function useDeleteTransactionMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      await deleteTransaction(supabase, transactionId, user?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["transactions"],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accountsWithBalances(user?.id),
      });
      queryClient.invalidateQueries({
        queryKey: ["budgets"],
      });
    },
  });
}
