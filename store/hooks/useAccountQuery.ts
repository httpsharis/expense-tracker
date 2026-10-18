import { useUser } from "@clerk/expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Account,
  AccountType,
  AccountWithBalance,
  clearAllUserData,
  createAccount,
  CreateAccountInput,
  deleteAccount,
  getAccounts,
  getAccountsWithBalances,
  setDefaultAccount,
  updateAccount,
  UpdateAccountInput,
} from "@services/accounts";
import { useSupabase } from "@shared/hooks/useSupabase";
import { invalidateLedgerQueries, queryKeys } from "../keys";

export type { Account, AccountType, AccountWithBalance, CreateAccountInput, UpdateAccountInput };

/**
 * Hook to fetch basic accounts metadata for the current user.
 */
export function useAccountsQuery() {
  const { user, isLoaded } = useUser();
  const supabase = useSupabase();

  return useQuery({
    queryKey: queryKeys.accounts(user?.id),
    queryFn: () => getAccounts(supabase, user!.id),
    enabled: Boolean(isLoaded && user?.id),
  });
}

/**
 * Hook to fetch accounts with their live balances computed from the ledger.
 */
export function useAccountsWithBalancesQuery() {
  const { user, isLoaded } = useUser();
  const supabase = useSupabase();

  return useQuery({
    queryKey: queryKeys.accountsWithBalances(user?.id),
    queryFn: () => getAccountsWithBalances(supabase, user!.id),
    enabled: Boolean(isLoaded && user?.id),
  });
}

/**
 * Mutation to create a new account.
 */
export function useCreateAccountMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAccountInput) => {
      if (!user?.id) throw new Error("User not authenticated");
      return createAccount(supabase, user.id, input);
    },
    onSuccess: () => {
      void invalidateLedgerQueries(queryClient, user?.id);
    },
  });
}

/**
 * Mutation to set an account as the default account.
 */
export function useSetDefaultAccountMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      return setDefaultAccount(supabase, user.id, accountId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts(user?.id) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accountsWithBalances(user?.id),
      });
    },
  });
}

/**
 * Mutation to update an existing account.
 */
export function useUpdateAccountMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateAccountInput) => {
      if (!user?.id) throw new Error("User not authenticated");
      return updateAccount(supabase, user.id, input);
    },
    onSuccess: () => {
      void invalidateLedgerQueries(queryClient, user?.id);
    },
  });
}

/**
 * Mutation to delete an account.
 */
export function useDeleteAccountMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      return deleteAccount(supabase, user.id, accountId);
    },
    onSuccess: () => {
      void invalidateLedgerQueries(queryClient, user?.id);
    },
  });
}

/**
 * Mutation to wipe all user tracking data and reset to fresh accounts with 0 balance.
 */
export function useClearAllUserDataMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (currency: string = "PKR") => {
      if (!user?.id) throw new Error("User not authenticated");
      return clearAllUserData(supabase, user.id, currency);
    },
    onSuccess: () => {
      void invalidateLedgerQueries(queryClient, user?.id);
    },
  });
}

