import type { TransactionWithCategory } from "@services/transactions";
import type { DetailedTransactionItem } from "../types/models";

const AVATAR_COLORS: Record<string, string> = {
  income: "#0F766E",
  transfer: "#0F172A",
  expense: "#2563EB",
};

/**
 * Maps a raw database/ledger TransactionWithCategory into a UI-ready DetailedTransactionItem.
 * Shared across Home, Ledger (Transactions), and Budget Detail screens.
 */
export function mapTransactionToDetailedItem(
  tx: TransactionWithCategory,
  categoryMap: Map<string, { name: string; icon: string | null }>,
  accountMap: Map<string, string>,
  fallbackAccountName = "Account",
  activeCurrency = "PKR",
  today = new Date(),
  includeYear = false,
): DetailedTransactionItem {
  const txDate = new Date(tx.date);
  const todayStr = today.toDateString();
  const yesterdayStr = new Date(today.getTime() - 86_400_000).toDateString();
  const txDateStr = txDate.toDateString();

  const isToday = txDateStr === todayStr;
  const isYesterday = txDateStr === yesterdayStr;

  const dateStr = isToday
    ? "Today"
    : isYesterday
      ? "Yesterday"
      : txDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          ...(includeYear ? { year: "numeric" } : {}),
        });

  const catMeta = tx.category_id ? categoryMap.get(tx.category_id) : null;
  const categoryName =
    tx.category?.name ??
    catMeta?.name ??
    (tx.type === "income" ? "Income" : "General");
  const categoryIcon =
    tx.category?.icon ??
    catMeta?.icon ??
    (tx.type === "income" ? "💰" : "🏷️");
  const accountName =
    tx.account?.name ??
    (tx.account_id ? accountMap.get(tx.account_id) : null) ??
    fallbackAccountName;

  const absAmount = Math.abs(Number(tx.amount));

  const transferAccountName = tx.transfer_account_id
    ? accountMap.get(tx.transfer_account_id) ?? null
    : null;

  const fullDateStr =
    txDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " at " +
    txDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return {
    id: tx.id,
    name: tx.description || categoryName,
    note:
      tx.description && tx.description !== categoryName ? tx.description : null,
    time: txDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    dateStr,
    fullDateStr,
    rawDate: tx.date,
    amount: tx.type === "income" ? absAmount : -absAmount,
    type: tx.type as DetailedTransactionItem["type"],
    categoryName,
    categoryIcon,
    accountName,
    transferAccountName,
    currency: tx.account?.currency ?? activeCurrency,
    inputMethod:
      (tx.input_method as DetailedTransactionItem["inputMethod"]) ?? "manual",
    avatarBg: AVATAR_COLORS[tx.type] ?? AVATAR_COLORS.expense,
    status: tx.status,
    isReversal: tx.description?.startsWith("[Reversal]"),
    isGroup: Boolean(tx.is_group),
    tags: Array.isArray(tx.tags) ? tx.tags.filter(Boolean) : [],
  };
}

