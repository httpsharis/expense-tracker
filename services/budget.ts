import { fromMinorUnits, toMinorUnits } from "@shared/lib/money";
import { generateUUID, isUUID } from "@shared/lib/uuid";
import type { Database } from "@shared/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Budget, SaveBudgetPayload } from "@features/budgets/types";

/**
 * Fetches all budgets for a user, ordered by created_at DESC.
 */
export async function getBudgets(
  supabase: SupabaseClient<Database>,
  userId: string,
  _monthDate?: string,
): Promise<Budget[]> {
  const { data, error } = await supabase
    .from("budgets")
    .select(
      "id, user_id, name, amount, category_id, account_id, period_type, period_start, period_end, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Budget[];
}

export interface UpsertBudgetServiceInput extends SaveBudgetPayload {
  userId: string;
}

/**
 * Creates or updates a budget record owned by the user.
 */
export async function upsertBudget(
  supabase: SupabaseClient<Database>,
  payload: UpsertBudgetServiceInput,
): Promise<Budget> {
  const amountMinor = Math.abs(toMinorUnits(Number(payload.amount)));
  if (amountMinor <= 0) {
    throw new Error("Budget limit must be greater than zero.");
  }

  const categoryIdToStore =
    !payload.category_id || payload.category_id === "all" ? null : payload.category_id;
  const accountIdToStore =
    !payload.account_id || payload.account_id === "all" ? null : payload.account_id;

  const isExistingBudget = Boolean(payload.id && isUUID(payload.id));
  const targetId = isExistingBudget ? payload.id! : generateUUID();

  const dbRow = {
    id: targetId,
    user_id: payload.userId,
    name: payload.name.trim() || "Budget",
    amount: fromMinorUnits(amountMinor),
    category_id: categoryIdToStore,
    account_id: accountIdToStore,
    period_type: payload.period_type || "month",
    period_start: payload.period_start || null,
    period_end: payload.period_end || null,
    updated_at: new Date().toISOString(),
  };

  if (isExistingBudget) {
    const { data, error } = await supabase
      .from("budgets")
      .update(dbRow)
      .eq("id", targetId)
      .eq("user_id", payload.userId)
      .select()
      .single();

    if (error) throw error;
    return data as Budget;
  }

  const { data, error } = await supabase
    .from("budgets")
    .insert(dbRow)
    .select()
    .single();

  if (error) throw error;
  return data as Budget;
}

/**
 * Deletes a budget owned by the user.
 */
export async function deleteBudget(
  supabase: SupabaseClient<Database>,
  userId: string,
  budgetId: string,
): Promise<void> {
  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", budgetId)
    .eq("user_id", userId);

  if (error) throw error;
}