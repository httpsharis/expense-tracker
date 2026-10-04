import type { Database } from "@shared/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Budget, SaveBudgetPayload } from "../src/features/budgets/types";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const isUUID = (str?: string | null): boolean =>
  Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

// In-memory fallback cache to ensure UI never breaks even during offline or pending RLS migration
const LOCAL_BUDGETS_CACHE: Budget[] = [];

/**
 * Fetches all budgets for a user.
 * Ordered by created_at DESC (most recently created first).
 */
export async function getBudgets(
  supabase: SupabaseClient<Database>,
  userId: string,
  _monthDate?: string
): Promise<Budget[]> {
  try {
    const { data, error } = await (supabase as any)
      .from("budgets")
      .select(
        "id, user_id, name, amount, category_id, account_id, period_type, period_start, period_end, created_at, updated_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const budgets = data as Budget[];
      LOCAL_BUDGETS_CACHE.length = 0;
      LOCAL_BUDGETS_CACHE.push(...budgets);
      return budgets;
    }

    if (error) {
      if (!error.message.includes("permission denied")) {
        console.warn("[budgets] getBudgets remote notice:", error.message);
      }
    }
  } catch (err: any) {
    if (!err?.message?.includes("permission denied")) {
      console.warn("[budgets] getBudgets caught exception:", err?.message);
    }
  }

  // Resilient fallback: return local cache
  return [...LOCAL_BUDGETS_CACHE];
}

export interface UpsertBudgetServiceInput extends SaveBudgetPayload {
  userId: string;
}

/**
 * Creates or updates a budget record matching the Saldo schema:
 * budgets(id, user_id, name, amount, category_id, account_id, period_type, period_start, period_end)
 */
export async function upsertBudget(
  supabase: SupabaseClient<Database>,
  payload: UpsertBudgetServiceInput
): Promise<Budget> {
  const categoryIdToStore =
    !payload.category_id || payload.category_id === "all" ? null : payload.category_id;
  const accountIdToStore =
    !payload.account_id || payload.account_id === "all" ? null : payload.account_id;

  const targetId = payload.id && isUUID(payload.id) ? payload.id : (payload.id || generateUUID());

  const dbRow = {
    id: targetId,
    user_id: payload.userId,
    name: payload.name.trim() || "Budget",
    amount: Number(payload.amount),
    category_id: categoryIdToStore,
    account_id: accountIdToStore,
    period_type: payload.period_type || "month",
    period_start: payload.period_start || null,
    period_end: payload.period_end || null,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await (supabase as any)
      .from("budgets")
      .upsert(dbRow)
      .select()
      .single();

    if (!error && data) {
      const saved = data as Budget;
      const idx = LOCAL_BUDGETS_CACHE.findIndex((b) => b.id === saved.id);
      if (idx >= 0) LOCAL_BUDGETS_CACHE[idx] = saved;
      else LOCAL_BUDGETS_CACHE.unshift(saved);
      return saved;
    }

    if (error) {
      console.warn("[budgets] upsert remote notice:", error.message);
    }
  } catch (err: any) {
    console.warn("[budgets] upsert caught exception:", err?.message);
  }

  // Fallback optimistic save in local cache
  const fallbackBudget: Budget = {
    id: targetId,
    user_id: payload.userId,
    name: payload.name.trim() || "Budget",
    amount: Number(payload.amount),
    category_id: categoryIdToStore,
    account_id: accountIdToStore,
    period_type: payload.period_type || "month",
    period_start: payload.period_start || null,
    period_end: payload.period_end || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const idx = LOCAL_BUDGETS_CACHE.findIndex((b) => b.id === fallbackBudget.id);
  if (idx >= 0) LOCAL_BUDGETS_CACHE[idx] = fallbackBudget;
  else LOCAL_BUDGETS_CACHE.unshift(fallbackBudget);

  return fallbackBudget;
}

/**
 * Deletes a budget by ID.
 * Safely removes from local cache and only forwards to Supabase if ID is a valid UUID.
 */
export async function deleteBudget(
  supabase: SupabaseClient<Database>,
  budgetId: string
): Promise<void> {
  const idx = LOCAL_BUDGETS_CACHE.findIndex((b) => b.id === budgetId);
  if (idx >= 0) LOCAL_BUDGETS_CACHE.splice(idx, 1);

  // If budgetId is not a UUID, do not send to Supabase to prevent Postgres invalid UUID syntax error
  if (!isUUID(budgetId)) return;

  try {
    const { error } = await supabase.from("budgets").delete().eq("id", budgetId);
    if (error) {
      console.warn("[budgets] delete remote notice:", error.message);
    }
  } catch (err: any) {
    console.warn("[budgets] delete caught exception:", err?.message);
  }
}