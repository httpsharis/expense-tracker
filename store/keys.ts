import type { TransactionFilter } from "../services/transactions";

export const queryKeys = {
  accounts: (userId?: string) => ["accounts", userId] as const,
  accountsWithBalances: (userId?: string) =>
    ["accounts", "with-balances", userId] as const,
  transactions: (userId?: string, filters: TransactionFilter = {}) =>
    ["transactions", userId, filters] as const,
  budgets: (userId?: string, monthDate?: string) =>
    ["budgets", userId, monthDate] as const,
  categories: (userId?: string) => ["categories", userId] as const,
};