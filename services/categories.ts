import type { Database } from "@shared/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type Category = CategoryRow;

export const DEFAULT_CATEGORIES = [
  // Expense Categories
  { name: "Food & Dining", icon: "restaurant" },
  { name: "Groceries", icon: "cart" },
  { name: "Shopping", icon: "bag-handle" },
  { name: "Transportation", icon: "car" },
  { name: "Bills & Utilities", icon: "flash" },
  { name: "Housing & Rent", icon: "home" },
  { name: "Entertainment", icon: "film" },
  { name: "Health & Medical", icon: "medkit" },
  { name: "Personal Care", icon: "sparkles" },
  { name: "Travel & Trips", icon: "airplane" },
  { name: "Education", icon: "school" },
  { name: "Subscriptions", icon: "calendar" },

  // Savings & Wealth Goals
  { name: "Emergency Fund", icon: "shield-checkmark" },
  { name: "Savings", icon: "wallet" },
  { name: "Investments", icon: "trending-up" },
  { name: "Gold & Metals", icon: "diamond" },
  { name: "Future Reserve", icon: "leaf" },
  { name: "Major Purchase", icon: "flag" },
];

/**
 * Fetches categories scoped strictly to the authenticated user.
 * Seeds default categories into Postgres on first load if the user has none yet.
 */
export async function getCategories(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CategoryRow[]> {
  const { data: existingCategories, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error) throw error;
  if (existingCategories && existingCategories.length > 0) {
    return existingCategories;
  }

  // Ensure profiles row exists to avoid foreign key violation
  await supabase.from("profiles").upsert(
    { id: userId, email: "" },
    { onConflict: "id", ignoreDuplicates: true },
  );

  const seedRows = DEFAULT_CATEGORIES.map((category) => ({
    user_id: userId,
    name: category.name,
    icon: category.icon,
    is_default: true,
  }));

  const { data: seededCategories, error: seedError } = await supabase
    .from("categories")
    .insert(seedRows)
    .select("*");

  if (seedError) throw seedError;
  return (seededCategories ?? []).sort((first, second) =>
    first.name.localeCompare(second.name),
  );
}

/**
 * Creates a new custom category for a user.
 */
export async function createCategory(
  supabase: SupabaseClient<Database>,
  payload: { userId: string; name: string; icon?: string },
): Promise<CategoryRow> {
  const trimmedName = payload.name.trim();
  if (!trimmedName) {
    throw new Error("Category name is required.");
  }

  // Ensure profiles row exists to avoid foreign key violation
  await supabase.from("profiles").upsert(
    { id: payload.userId, email: "" },
    { onConflict: "id", ignoreDuplicates: true },
  );

  const { data: createdCategory, error } = await supabase
    .from("categories")
    .insert({
      user_id: payload.userId,
      name: trimmedName,
      icon: payload.icon?.trim() || "pricetag",
      is_default: false,
    })
    .select("*")
    .single();

  if (error) throw error;
  return createdCategory;
}

export interface CategoryUsageCount {
  transactionCount: number;
  budgetCount: number;
  totalCount: number;
}

/**
 * Counts how many transactions and budgets reference a category.
 */
export async function getCategoryUsageCount(
  supabase: SupabaseClient<Database>,
  userId: string,
  categoryId: string,
): Promise<CategoryUsageCount> {
  const [txResult, budgetResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("category_id", categoryId),
    supabase
      .from("budgets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("category_id", categoryId),
  ]);

  if (txResult.error) throw txResult.error;
  if (budgetResult.error) throw budgetResult.error;

  const transactionCount = txResult.count ?? 0;
  const budgetCount = budgetResult.count ?? 0;
  return {
    transactionCount,
    budgetCount,
    totalCount: transactionCount + budgetCount,
  };
}

/**
 * Deletes an unused category owned by the user.
 * Blocks deletion if any transaction or budget references the category.
 */
export async function deleteCategory(
  supabase: SupabaseClient<Database>,
  userId: string,
  categoryId: string,
): Promise<void> {
  const usage = await getCategoryUsageCount(supabase, userId, categoryId);
  if (usage.totalCount > 0) {
    const parts: string[] = [];
    if (usage.transactionCount > 0) {
      parts.push(
        `${usage.transactionCount} ${usage.transactionCount === 1 ? "transaction" : "transactions"}`,
      );
    }
    if (usage.budgetCount > 0) {
      parts.push(
        `${usage.budgetCount} ${usage.budgetCount === 1 ? "budget" : "budgets"}`,
      );
    }
    throw new Error(
      `Cannot delete category while it is used by ${parts.join(" and ")}.`,
    );
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("user_id", userId);

  if (error) throw error;
}
