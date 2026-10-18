import { useUser } from "@clerk/expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
  reverseTransaction,
  TransactionFilter,
  TransactionInsert,
  TransactionWithCategory,
  updateTransaction,
} from "@services/transactions";
import { useSupabase } from "@shared/hooks/useSupabase";
import { invalidateLedgerQueries, queryKeys } from "../keys";

export function useTransactionsQuery(filters: TransactionFilter = {}) {
  const { user, isLoaded } = useUser();
  const supabase = useSupabase();

  return useQuery({
    queryKey: queryKeys.transactions(user?.id, filters),
    queryFn: () => getTransactions(supabase, user!.id, filters),
    enabled: Boolean(isLoaded && user?.id),
  });
}

export function useCreateTransactionMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: Omit<TransactionInsert, "user_id"> & { user_id?: string },
    ) => {
      if (!user?.id) throw new Error("User not authenticated");
      return createTransaction(supabase, {
        ...payload,
        user_id: user.id,
      });
    },
    onSuccess: () => {
      void invalidateLedgerQueries(queryClient, user?.id);
    },
  });
}

export function useReverseTransactionMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transaction,
      reason,
    }: {
      transaction: TransactionWithCategory;
      reason?: string;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");
      return reverseTransaction(supabase, user.id, transaction, reason);
    },
    onSuccess: () => {
      void invalidateLedgerQueries(queryClient, user?.id);
    },
  });
}

export function useDeleteTransactionMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      args: string | { transaction: TransactionWithCategory; reason?: string }
    ) => {
      if (!user?.id) throw new Error("User not authenticated");
      if (typeof args === "string") {
        return deleteTransaction(supabase, user.id, args);
      }
      return reverseTransaction(supabase, user.id, args.transaction, args.reason);
    },
    onSuccess: () => {
      void invalidateLedgerQueries(queryClient, user?.id);
    },
  });
}

export function useUpdateTransactionMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<TransactionInsert>;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");
      return updateTransaction(supabase, user.id, id, {
        ...data,
        user_id: user.id,
      });
    },
    onSuccess: () => {
      void invalidateLedgerQueries(queryClient, user?.id);
    },
  });
}
