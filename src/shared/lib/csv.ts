import { formatLocalDateKey, parseLocalDate } from "./dates";

const FORMULA_PREFIX_REGEX = /^[=+\-@\t\r]/;

/**
 * Escapes a single CSV cell value:
 * - Prefixes potential spreadsheet formula triggers (=, +, -, @, tab, CR) with a single quote
 * - Doubles any internal double-quotes
 * - Wraps the cell in double-quotes to safely handle commas and newlines
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const safeFormula = FORMULA_PREFIX_REGEX.test(raw.trimStart())
    ? `'${raw}`
    : raw;
  const escapedQuotes = safeFormula.replace(/"/g, '""');
  return `"${escapedQuotes}"`;
}

export interface CsvExportAccountInfo {
  name: string;
  currency?: string | null;
}

export interface CsvTransactionRow {
  date?: string | null;
  description?: string | null;
  category_id?: string | null;
  account_id?: string | null;
  type?: string | null;
  amount?: number | string | null;
  status?: string | null;
  category?: { name: string } | null;
  account?: { name: string; currency?: string | null } | null;
}

/**
 * Builds a complete RFC-4180 + formula-safe CSV string for a list of transactions.
 */
export function buildTransactionsCsv(
  transactions: CsvTransactionRow[],
  categoryMap: Map<string, string>,
  accountMap: Map<string, CsvExportAccountInfo | string>,
  defaultCurrency = "PKR",
): string {
  const header = "Date,Description,Category,Account,Type,Amount,Currency,Status";
  const rows = transactions.map((tx) => {
    const dateStr = tx.date ? formatLocalDateKey(parseLocalDate(tx.date)) : "";
    const description = tx.description ?? "";
    const categoryName =
      tx.category?.name ??
      (tx.category_id ? categoryMap.get(tx.category_id) : undefined) ??
      "Uncategorized";
    const accountEntry = tx.account_id ? accountMap.get(tx.account_id) : undefined;
    const accountName =
      tx.account?.name ??
      (typeof accountEntry === "string" ? accountEntry : accountEntry?.name) ??
      "Primary Account";
    const accountCurrency =
      tx.account?.currency ??
      (typeof accountEntry === "object" && accountEntry?.currency
        ? accountEntry.currency
        : undefined) ??
      defaultCurrency;
    const amount = Math.abs(Number(tx.amount ?? 0)).toFixed(2);

    return [
      escapeCsvCell(dateStr),
      escapeCsvCell(description),
      escapeCsvCell(categoryName),
      escapeCsvCell(accountName),
      escapeCsvCell(tx.type),
      escapeCsvCell(amount),
      escapeCsvCell(accountCurrency),
      escapeCsvCell(tx.status),
    ].join(",");
  });

  return [header, ...rows].join("\n");
}

