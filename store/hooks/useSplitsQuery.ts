import { useUser } from "@clerk/expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDirectLoan,
  createDirectPeopleSplit,
  createGroup,
  createTransactionSplits,
  deletePerson,
  getGroups,
  getSettlementHistory,
  getSplitsSummary,
  renamePerson,
  settleSplit,
  type DirectLoanInput,
} from "../../services/splits";
import type { SplitMode } from "../../src/shared/lib/money";
import { useSupabase } from "../../src/shared/hooks/useSupabase";
import { invalidateLedgerQueries, queryKeys } from "../keys";

export function useGroupsQuery() {
  const { user, isLoaded } = useUser();
  const supabase = useSupabase();

  return useQuery({
    queryKey: queryKeys.groups(user?.id),
    queryFn: () => getGroups(supabase, user!.id),
    enabled: Boolean(isLoaded && user?.id),
  });
}

export function useSplitsSummaryQuery() {
  const { user, isLoaded } = useUser();
  const supabase = useSupabase();

  return useQuery({
    queryKey: queryKeys.splits(user?.id),
    queryFn: () => getSplitsSummary(supabase, user!.id),
    enabled: Boolean(isLoaded && user?.id),
  });
}

export function useSettlementHistoryQuery() {
  const { user, isLoaded } = useUser();
  const supabase = useSupabase();

  return useQuery({
    queryKey: queryKeys.settlements(user?.id),
    queryFn: () => getSettlementHistory(supabase, user!.id),
    enabled: Boolean(isLoaded && user?.id),
  });
}

export function useCreateGroupMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      memberNames,
    }: {
      name: string;
      memberNames: string[];
    }) => {
      if (!user?.id) throw new Error("User not authenticated");
      return createGroup(supabase, user.id, name, memberNames);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups(user?.id) });
    },
  });
}

export function useCreateTransactionSplitsMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      groupId,
      totalAmount,
      members,
      description,
      payerName,
      splitMode,
      customAmounts,
    }: {
      transactionId: string;
      groupId: string | null;
      totalAmount: number;
      members: { id: string; name: string }[];
      description: string;
      payerName?: string;
      splitMode?: SplitMode;
      customAmounts?: Record<string, number>;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");
      return createTransactionSplits(
        supabase,
        user.id,
        transactionId,
        groupId,
        totalAmount,
        members,
        description,
        { payerName, splitMode, customAmounts },
      );
    },
    onSuccess: () => {
      void invalidateLedgerQueries(queryClient, user?.id);
    },
  });
}

export function useCreateDirectPeopleSplitMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      totalAmount,
      peopleNames,
      description,
      payerName,
      splitMode,
      customAmounts,
    }: {
      transactionId: string;
      totalAmount: number;
      peopleNames: string[];
      description: string;
      payerName?: string;
      splitMode?: SplitMode;
      customAmounts?: Record<string, number>;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");
      return createDirectPeopleSplit(
        supabase,
        user.id,
        transactionId,
        totalAmount,
        peopleNames,
        description,
        { payerName, splitMode, customAmounts },
      );
    },
    onSuccess: () => {
      void invalidateLedgerQueries(queryClient, user?.id);
    },
  });
}

export function useCreateLoanMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DirectLoanInput) => {
      if (!user?.id) throw new Error("User not authenticated");
      return createDirectLoan(supabase, user.id, input);
    },
    onSuccess: () => {
      void invalidateLedgerQueries(queryClient, user?.id);
    },
  });
}

export function useSettleSplitMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      splitId,
      amount,
      accountId,
      settlementMode = "account_impact",
    }: {
      splitId: string;
      amount?: number;
      accountId?: string | null;
      settlementMode?: "account_impact" | "off_ledger";
    }) => {
      if (!user?.id) throw new Error("User not authenticated");
      return settleSplit(
        supabase,
        user.id,
        splitId,
        amount,
        accountId,
        settlementMode,
      );
    },
    onSuccess: () => {
      void invalidateLedgerQueries(queryClient, user?.id);
    },
  });
}

export function useRenamePersonMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      oldName,
      newName,
    }: {
      oldName: string;
      newName: string;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");
      return renamePerson(supabase, user.id, oldName, newName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.splits(user?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups(user?.id) });
    },
  });
}

export function useDeletePersonMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (personName: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      return deletePerson(supabase, user.id, personName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.splits(user?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups(user?.id) });
    },
  });
}
