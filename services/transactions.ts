import { fromMinorUnits, toMinorUnits } from "@shared/lib/money";
import { generateUUID, isUUID } from "@shared/lib/uuid";
import type { Database } from "@shared/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
export type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];

export type TransactionType = "income" | "expense" | "transfer";
export type InputMethod = "manual" | "voice" | "scan" | "recurring";
export type TransactionStatus = "completed" | "pending" | "cancelled";

export interface TransactionWithCategory extends TransactionRow {
  category: {
    id: string;
    name: string;
    icon: string | null;
  } | null;
  account?: {
    id: string;
    name: string;
    currency: string;
  } | null;
}

export interface TransactionFilter {
  type?: TransactionType | null;
  accountId?: string | null;
  categoryId?: string | null;
  limit?: number;
  dateFrom?: string | null;
  dateTo?: string | null;
}

/**
 * Fetches transactions for a user with category and account metadata joined.
 * Uses exact foreign key 'transactions_account_id_fkey' to avoid PostgREST embedding collision.
 */
export async function getTransactions(
  supabase: SupabaseClient<Database>,
  userId: string,
  filters: TransactionFilter = {},
): Promise<TransactionWithCategory[]> {
  let query = supabase
    .from("transactions")
    .select(
      `
      *,
      category:categories(id, name, icon),
      account:accounts!transactions_account_id_fkey(id, name, currency)
    `,
    )
    .eq("user_id", userId);

  if (filters.type) {
    query = query.eq("type", filters.type);
  }
  if (filters.accountId) {
    query = query.eq("account_id", filters.accountId);
  }
  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters.dateFrom) {
    query = query.gte("date", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lt("date", filters.dateTo);
  }

  query = query.order("date", { ascending: false });

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as unknown as TransactionWithCategory[];
}

/**
 * Creates a transaction in the database.
 * The database trigger `trg_transaction_balance_entry` automatically posts
 * the corresponding balance_entries delta when status is 'completed'.
 */
export async function createTransaction(
  supabase: SupabaseClient<Database>,
  payload: TransactionInsert,
): Promise<TransactionRow> {
  const amountMinor = Math.abs(toMinorUnits(Number(payload.amount)));
  if (amountMinor <= 0) {
    throw new Error("Transaction amount must be greater than zero.");
  }

  if (
    payload.type === "transfer" &&
    (!payload.transfer_account_id ||
      payload.transfer_account_id === payload.account_id)
  ) {
    throw new Error("Transfers require a distinct destination account.");
  }

  const transactionId = payload.id && isUUID(payload.id) ? payload.id : generateUUID();
  const dbPayload: Record<string, unknown> = {
    ...payload,
    id: transactionId,
    category_id:
      payload.category_id && isUUID(payload.category_id)
        ? payload.category_id
        : null,
    amount: fromMinorUnits(amountMinor),
    created_at: payload.created_at ?? new Date().toISOString(),
    status: payload.status ?? "completed",
    input_method: payload.input_method ?? "manual",
  };

  // Only include tags if explicitly provided with items
  if (Array.isArray(payload.tags) && payload.tags.length > 0) {
    dbPayload.tags = payload.tags;
  } else {
    delete dbPayload.tags;
  }

  let { data, error } = await supabase
    .from("transactions")
    .insert(dbPayload as TransactionInsert)
    .select()
    .single();

  // If remote schema lacks the tags column, retry cleanly without tags
  if (error && (error.message?.toLowerCase().includes("tags") || (error as { details?: string }).details?.toLowerCase().includes("tags"))) {
    delete dbPayload.tags;
    const retry = await supabase
      .from("transactions")
      .insert(dbPayload as TransactionInsert)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;
  return data as TransactionRow;
}

/**
 * Posts an offsetting reversal entry for a completed transaction, or cancels a pending transaction.
 * Pending transactions never posted a balance_entries delta, so they are marked cancelled
 * without inserting an offsetting counter-entry.
 */
export async function reverseTransaction(
  supabase: SupabaseClient<Database>,
  userId: string,
  transaction: TransactionWithCategory,
  reason?: string,
): Promise<TransactionRow> {
  if (
    transaction.status === "cancelled" ||
    transaction.description?.startsWith("[Reversal]")
  ) {
    throw new Error("Cannot reverse an already cancelled or reversal transaction.");
  }

  const reversalDescription = `[Reversal] ${transaction.description || "Transaction"} (${reason || "User correction"})`;

  const { data: cancelledTransaction, error: cancelError } = await supabase
    .from("transactions")
    .update({ status: "cancelled", flag_reason: reversalDescription })
    .eq("id", transaction.id)
    .eq("user_id", userId)
    .select()
    .single();

  if (cancelError) throw cancelError;

  if (transaction.status !== "completed") {
    return cancelledTransaction;
  }

  const amountMinor = Math.abs(toMinorUnits(Number(transaction.amount)));
  const isTransfer = transaction.type === "transfer";
  const reversalType: TransactionType = isTransfer
    ? "transfer"
    : transaction.type === "expense"
      ? "income"
      : "expense";

  const reversalSourceAccountId = isTransfer
    ? (transaction.transfer_account_id ?? transaction.account_id)
    : transaction.account_id;
  const reversalTargetAccountId = isTransfer ? transaction.account_id : null;

  const reversalPayload: TransactionInsert = {
    id: generateUUID(),
    user_id: userId,
    account_id: reversalSourceAccountId,
    transfer_account_id: reversalTargetAccountId,
    amount: fromMinorUnits(amountMinor),
    type: reversalType,
    description: reversalDescription,
    category_id: transaction.category_id ?? null,
    date: new Date().toISOString(),
    status: "completed",
    input_method: "manual",
  };

  let { data: reversalRow, error: reversalError } = await supabase
    .from("transactions")
    .insert(reversalPayload)
    .select()
    .single();

  if (reversalError && (reversalError.message?.toLowerCase().includes("tags") || (reversalError as { details?: string }).details?.toLowerCase().includes("tags"))) {
    const { tags: _omitted, ...safeReversalPayload } = reversalPayload as Record<string, unknown>;
    const retry = await supabase
      .from("transactions")
      .insert(safeReversalPayload as TransactionInsert)
      .select()
      .single();
    reversalRow = retry.data;
    reversalError = retry.error;
  }

  if (reversalError) throw reversalError;
  return reversalRow as TransactionRow;
}

/**
 * Updates an existing transaction owned by the user.
 * The database trigger `trg_transaction_balance_entry` atomically appends
 * any necessary balance_entries adjustment rows inside Postgres.
 */
export async function updateTransaction(
  supabase: SupabaseClient<Database>,
  userId: string,
  transactionId: string,
  payload: Partial<TransactionInsert>,
): Promise<TransactionRow> {
  const normalizedPayload: Partial<TransactionInsert> = { ...payload };
  if (payload.amount !== undefined) {
    const nextAmountMinor = Math.abs(toMinorUnits(Number(payload.amount)));
    if (nextAmountMinor <= 0) {
      throw new Error("Transaction amount must be greater than zero.");
    }
    normalizedPayload.amount = fromMinorUnits(nextAmountMinor);
  }

  let { data: updatedRow, error: updateError } = await supabase
    .from("transactions")
    .update(normalizedPayload)
    .eq("id", transactionId)
    .eq("user_id", userId)
    .select()
    .single();

  if (updateError && (updateError.message?.toLowerCase().includes("tags") || (updateError as { details?: string }).details?.toLowerCase().includes("tags"))) {
    const { tags: _omitted, ...safeUpdatePayload } = normalizedPayload as Record<string, unknown>;
    const retry = await supabase
      .from("transactions")
      .update(safeUpdatePayload as Partial<TransactionInsert>)
      .eq("id", transactionId)
      .eq("user_id", userId)
      .select()
      .single();
    updatedRow = retry.data;
    updateError = retry.error;
  }

  if (updateError) throw updateError;
  return updatedRow as TransactionRow;
}

/**
 * Deletes/reverses a transaction owned by the user.
 * Dispatches to reverseTransaction to maintain append-only ledger integrity.
 */
export async function deleteTransaction(
  supabase: SupabaseClient<Database>,
  userId: string,
  transactionId: string,
  reason: string = "User deleted transaction",
): Promise<TransactionRow> {
  const { data: tx, error } = await supabase
    .from("transactions")
    .select("*, category:categories(id, name, icon), account:accounts!transactions_account_id_fkey(id, name, currency)")
    .eq("id", transactionId)
    .eq("user_id", userId)
    .single();

  if (error || !tx) {
    throw new Error(error?.message || "Transaction not found");
  }

  return reverseTransaction(
    supabase,
    userId,
    tx as unknown as TransactionWithCategory,
    reason,
  );
}