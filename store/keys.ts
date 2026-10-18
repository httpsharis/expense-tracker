import type { QueryClient } from "@tanstack/react-query";
import type { TransactionFilter } from "@services/transactions";
import { invalidateAssistantContextCache } from "@services/ai/chatService";

export const queryKeys = {
  accounts: (userId?: string) => ["accounts", userId] as const,
  accountsWithBalances: (userId?: string) =>
    ["accounts", "with-balances", userId] as const,
  transactionsAll: (userId?: string) => ["transactions", userId] as const,
  transactions: (userId?: string, filters: TransactionFilter = {}) =>
    ["transactions", userId, filters] as const,
  budgetsAll: (userId?: string) => ["budgets", userId] as const,
  budgets: (userId?: string, monthDate?: string) =>
    monthDate !== undefined
      ? (["budgets", userId, monthDate] as const)
      : (["budgets", userId] as const),
  categories: (userId?: string) => ["categories", userId] as const,
  groups: (userId?: string) => ["groups", userId] as const,
  splits: (userId?: string) => ["splits", userId] as const,
  settlements: (userId?: string) => ["settlements", userId] as const,
};

export function invalidateLedgerQueries(
  queryClient: QueryClient,
  userId?: string,
): Promise<void[]> {
  invalidateAssistantContextCache();
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts(userId) }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.accountsWithBalances(userId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.transactionsAll(userId),
    }),
    queryClient.invalidateQueries({ queryKey: queryKeys.budgetsAll(userId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.splits(userId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.groups(userId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.settlements(userId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.categories(userId) }),
  ]);
}