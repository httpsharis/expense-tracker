import { useUser } from "@clerk/expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database } from "@shared/types/database.types";
import {
  Account,
  AccountType,
  AccountWithBalance,
  getAccounts,
  getAccountsWithBalances,
} from "../../services/accounts";
import { useSupabase } from "../../src/shared/hooks/useSupabase";
import { queryKeys } from "../keys";

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

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  currency?: string;
  is_default?: boolean;
  initialBalance?: number;
}

/**
 * Mutation to create a new account.
 * Supports optional initial balance recorded directly in the ledger.
 */
export function useCreateAccountMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAccountInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("accounts")
        .insert({
          user_id: user.id,
          name: input.name.trim(),
          type: input.type,
          currency: input.currency ?? "USD",
          is_default: input.is_default ?? false,
        })
        .select()
        .single();

      if (error) throw error;

      // If an initial balance was specified, append an initial_balance entry to the ledger
      if (input.initialBalance && input.initialBalance !== 0) {
        const { error: balanceErr } = await supabase
          .from("balance_entries")
          .insert({
            user_id: user.id,
            account_id: data.id,
            delta: input.initialBalance,
            reason: "initial_balance",
          });

        if (balanceErr) {
          console.error("Failed to record initial balance entry:", balanceErr);
        }
      }

      return data as Account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts(user?.id) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accountsWithBalances(user?.id),
      });
      queryClient.invalidateQueries({
        queryKey: ["transactions", user?.id],
      });
    },
  });
}

/**
 * Mutation to set an account as the default account.
 * Updates previous default first to satisfy the partial unique index.
 */
export function useSetDefaultAccountMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Reset any current default
      const { error: resetError } = await supabase
        .from("accounts")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .eq("is_default", true);

      if (resetError) throw resetError;

      // Set new default
      const { error: setError } = await supabase
        .from("accounts")
        .update({ is_default: true })
        .eq("id", accountId)
        .eq("user_id", user.id);

      if (setError) throw setError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts(user?.id) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accountsWithBalances(user?.id),
      });
    },
  });
}

export interface UpdateAccountInput {
  id: string;
  name?: string;
  type?: AccountType;
  currency?: string;
  is_default?: boolean;
  balanceAdjustmentDelta?: number;
}

/**
 * Mutation to update an existing account.
 * Supports updating metadata and recording balance adjustments in the ledger.
 */
export function useUpdateAccountMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateAccountInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      if (input.is_default) {
        // Reset any existing default
        await supabase
          .from("accounts")
          .update({ is_default: false })
          .eq("user_id", user.id)
          .eq("is_default", true);
      }

      const updatePayload: Database["public"]["Tables"]["accounts"]["Update"] = {
        updated_at: new Date().toISOString(),
      };
      if (input.name !== undefined) updatePayload.name = input.name.trim();
      if (input.type !== undefined) updatePayload.type = input.type;
      if (input.currency !== undefined) updatePayload.currency = input.currency;
      if (input.is_default !== undefined) updatePayload.is_default = input.is_default;

      const { data, error } = await supabase
        .from("accounts")
        .update(updatePayload)
        .eq("id", input.id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      // If user adjusted balance, record the delta into the balance ledger
      if (input.balanceAdjustmentDelta && input.balanceAdjustmentDelta !== 0) {
        const { error: adjErr } = await supabase.from("balance_entries").insert({
          user_id: user.id,
          account_id: input.id,
          delta: input.balanceAdjustmentDelta,
          reason: "balance_adjustment",
        });

        if (adjErr) {
          console.error("Failed to record balance adjustment entry:", adjErr);
        }
      }

      return data as Account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts(user?.id) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accountsWithBalances(user?.id),
      });
      queryClient.invalidateQueries({
        queryKey: ["transactions", user?.id],
      });
    },
  });
}

/**
 * Mutation to delete an account.
 * Cleans up associated balance entries and transactions, and automatically
 * reassigns default if the deleted account was default.
 */
export function useDeleteAccountMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      // 1. Fetch account to check if it was default
      const { data: targetAccount, error: fetchErr } = await supabase
        .from("accounts")
        .select("id, is_default")
        .eq("id", accountId)
        .eq("user_id", user.id)
        .single();

      if (fetchErr) throw fetchErr;

      // 2. Clean up associated ledger balance entries & transactions first to avoid FK constraint blocks
      await supabase
        .from("balance_entries")
        .delete()
        .eq("account_id", accountId)
        .eq("user_id", user.id);

      await supabase
        .from("transactions")
        .delete()
        .eq("account_id", accountId)
        .eq("user_id", user.id);

      // 3. Delete the account
      const { error: deleteErr } = await supabase
        .from("accounts")
        .delete()
        .eq("id", accountId)
        .eq("user_id", user.id);

      if (deleteErr) throw deleteErr;

      // 4. If target was default, assign the first remaining account as default
      if (targetAccount?.is_default) {
        const { data: remainingAccounts } = await supabase
          .from("accounts")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (remainingAccounts && remainingAccounts.length > 0) {
          await supabase
            .from("accounts")
            .update({ is_default: true })
            .eq("id", remainingAccounts[0].id)
            .eq("user_id", user.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts(user?.id) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accountsWithBalances(user?.id),
      });
      queryClient.invalidateQueries({
        queryKey: ["transactions", user?.id],
      });
    },
  });
}


