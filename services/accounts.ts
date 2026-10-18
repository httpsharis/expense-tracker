import { fromMinorUnits, toMinorUnits } from "@shared/lib/money";
import type { Database } from "@shared/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Account = Database["public"]["Tables"]["accounts"]["Row"];
export type AccountType = "cash" | "bank" | "credit_card" | "savings" | "wallet";

export interface AccountWithBalance extends Account {
  balance: number;
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  currency?: string;
  is_default?: boolean;
  initialBalance?: number;
}

export interface UpdateAccountInput {
  id: string;
  name?: string;
  type?: AccountType;
  currency?: string;
  is_default?: boolean;
  balanceAdjustmentDelta?: number;
}

export const DEFAULT_ACCOUNTS = [
  { name: "Cash", type: "cash" as const, is_default: true },
  { name: "Bank", type: "bank" as const, is_default: false },
  { name: "Savings", type: "savings" as const, is_default: false },
] as const;

/**
 * Ensures the 3 core default accounts (Cash, Bank, Savings) exist for the user.
 * Seeds them into Postgres if the user currently has 0 accounts.
 */
export async function ensureDefaultAccounts(
  supabase: SupabaseClient<Database>,
  userId: string,
  currency = "PKR",
): Promise<Account[]> {
  const { data: existing, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (existing && existing.length > 0) {
    return existing;
  }

  // Ensure profiles row exists to avoid foreign key violation on accounts.user_id
  await supabase.from("profiles").upsert(
    { id: userId, currency, email: "" },
    { onConflict: "id", ignoreDuplicates: true },
  );

  const seedPayload = DEFAULT_ACCOUNTS.map((acc) => ({
    user_id: userId,
    name: acc.name,
    type: acc.type,
    currency,
    is_default: acc.is_default,
  }));

  const { data: created, error: insertError } = await supabase
    .from("accounts")
    .insert(seedPayload)
    .select("*");

  if (insertError) throw insertError;
  return created ?? [];
}

/**
 * Fetches all accounts for a user. Automatically seeds default accounts if none exist.
 */
export async function getAccounts(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) {
    return ensureDefaultAccounts(supabase, userId);
  }
  return data ?? [];
}

/**
 * Fetches all accounts along with their current balance calculated
 * from the append-only balance_entries ledger using integer minor units.
 */
export async function getAccountsWithBalances(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<AccountWithBalance[]> {
  const accounts = await getAccounts(supabase, userId);

  const { data: entries, error: entriesError } = await supabase
    .from("balance_entries")
    .select("account_id, delta")
    .eq("user_id", userId);

  if (entriesError) throw entriesError;

  const balanceMinorByAccount = (entries ?? []).reduce<Record<string, number>>(
    (accumulator, entry) => {
      accumulator[entry.account_id] =
        (accumulator[entry.account_id] ?? 0) + toMinorUnits(Number(entry.delta));
      return accumulator;
    },
    {},
  );

  return accounts.map((account) => ({
    ...account,
    balance: fromMinorUnits(balanceMinorByAccount[account.id] ?? 0),
  }));
}

/**
 * Creates a new account and records optional initial balance in the ledger.
 */
export async function createAccount(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: CreateAccountInput,
): Promise<Account> {
  // Ensure profile row exists to avoid foreign key violation
  await supabase.from("profiles").upsert(
    { id: userId, currency: input.currency ?? "PKR", email: "" },
    { onConflict: "id", ignoreDuplicates: true },
  );

  if (input.is_default) {
    await supabase
      .from("accounts")
      .update({ is_default: false })
      .eq("user_id", userId)
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      type: input.type,
      currency: input.currency ?? "PKR",
      is_default: input.is_default ?? false,
    })
    .select()
    .single();

  if (error) throw error;

  if (input.initialBalance !== undefined) {
    const initialBalanceMinor = toMinorUnits(input.initialBalance);
    if (initialBalanceMinor !== 0) {
      const { error: balanceError } = await supabase.from("balance_entries").insert({
        user_id: userId,
        account_id: data.id,
        delta: fromMinorUnits(initialBalanceMinor),
        reason: "top_up",
      });

      if (balanceError) throw balanceError;
    }
  }

  return data;
}

/**
 * Sets an account as the user's default account.
 */
export async function setDefaultAccount(
  supabase: SupabaseClient<Database>,
  userId: string,
  accountId: string,
): Promise<void> {
  const { error: resetError } = await supabase
    .from("accounts")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true);

  if (resetError) throw resetError;

  const { error: setError } = await supabase
    .from("accounts")
    .update({ is_default: true })
    .eq("id", accountId)
    .eq("user_id", userId);

  if (setError) throw setError;
}

/**
 * Updates an account and appends an optional balance adjustment delta to the ledger.
 */
export async function updateAccount(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: UpdateAccountInput,
): Promise<Account> {
  if (input.is_default) {
    const { error: resetError } = await supabase
      .from("accounts")
      .update({ is_default: false })
      .eq("user_id", userId)
      .eq("is_default", true);

    if (resetError) throw resetError;
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
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;

  if (input.balanceAdjustmentDelta !== undefined) {
    const adjustmentMinor = toMinorUnits(input.balanceAdjustmentDelta);
    if (adjustmentMinor !== 0) {
      const { error: adjustmentError } = await supabase.from("balance_entries").insert({
        user_id: userId,
        account_id: input.id,
        delta: fromMinorUnits(adjustmentMinor),
        reason: "adjustment",
      });

      if (adjustmentError) throw adjustmentError;
    }
  }

  return data;
}

/**
 * Deletes an account and cleans up associated ledger records, reassigning default if needed.
 */
export async function deleteAccount(
  supabase: SupabaseClient<Database>,
  userId: string,
  accountId: string,
): Promise<void> {
  const { data: targetAccount, error: fetchError } = await supabase
    .from("accounts")
    .select("id, is_default")
    .eq("id", accountId)
    .eq("user_id", userId)
    .single();

  if (fetchError) throw fetchError;

  const { error: accountDeleteError } = await supabase
    .from("accounts")
    .delete()
    .eq("id", accountId)
    .eq("user_id", userId);

  if (accountDeleteError) throw accountDeleteError;

  if (targetAccount?.is_default) {
    const { data: remainingAccounts, error: remainingError } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (remainingError) throw remainingError;

    if (remainingAccounts && remainingAccounts.length > 0) {
      const { error: defaultUpdateError } = await supabase
        .from("accounts")
        .update({ is_default: true })
        .eq("id", remainingAccounts[0].id)
        .eq("user_id", userId);

      if (defaultUpdateError) throw defaultUpdateError;
    }
  }
}

/**
 * Wipes all personal financial data (settlements, splits, groups, transactions,
 * budgets, subscriptions, accounts, and balance entries) for a user, then re-seeds
 * fresh default accounts with zero balance so the user can start over from scratch.
 */
export async function clearAllUserData(
  supabase: SupabaseClient<Database>,
  userId: string,
  currency = "PKR",
): Promise<Account[]> {
  try {
    // Attempt atomic RPC first
    // @ts-expect-error RPC may not be typed in database.types.ts yet
    const { error: rpcError } = await supabase.rpc("clear_user_data", {
      target_user_id: userId,
    });

    if (rpcError) {
      // Fallback: Delete tables in dependency order via standard RLS
      await supabase.from("settlements").delete().eq("user_id", userId);
      await supabase.from("transaction_splits").delete().eq("user_id", userId);
      await supabase.from("group_members").delete().eq("user_id", userId);
      await supabase.from("groups").delete().eq("user_id", userId);
      await supabase.from("transactions").delete().eq("user_id", userId);
      await supabase.from("budgets").delete().eq("user_id", userId);
      await supabase.from("subscriptions").delete().eq("user_id", userId);
      await supabase.from("balance_entries").delete().eq("user_id", userId);
      await supabase.from("accounts").delete().eq("user_id", userId);
    }
  } catch {
    // Fallback: Delete tables sequentially
    await supabase.from("settlements").delete().eq("user_id", userId);
    await supabase.from("transaction_splits").delete().eq("user_id", userId);
    await supabase.from("group_members").delete().eq("user_id", userId);
    await supabase.from("groups").delete().eq("user_id", userId);
    await supabase.from("transactions").delete().eq("user_id", userId);
    await supabase.from("budgets").delete().eq("user_id", userId);
    await supabase.from("subscriptions").delete().eq("user_id", userId);
    await supabase.from("balance_entries").delete().eq("user_id", userId);
    await supabase.from("accounts").delete().eq("user_id", userId);
  }

  // Re-seed clean default accounts ("Cash" default, "Bank", "Savings") with 0 balance
  return await ensureDefaultAccounts(supabase, userId, currency);
}