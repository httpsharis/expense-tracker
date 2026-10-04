import getSymbolFromCurrency from "currency-symbol-map";

export interface FormatCurrencyOptions {
  showPositivePrefix?: boolean;
  showSign?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Common currency symbols fallback dictionary
 */
const SYMBOL_OVERRIDE_MAP: Record<string, string> = {
  PKR: "Rs",
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
  AUD: "AU$",
  JPY: "¥",
  CNY: "¥",
  AED: "AED",
  SAR: "SAR",
};

/**
 * Common supported currency codes for selection
 */
export const POPULAR_CURRENCIES = [
  { code: "PKR", symbol: "Rs", label: "Pakistani Rupee" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "AED", symbol: "AED", label: "UAE Dirham" },
  { code: "SAR", symbol: "SAR", label: "Saudi Riyal" },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar" },
  { code: "AUD", symbol: "AU$", label: "Australian Dollar" },
];

/**
 * Returns currency symbol for a 3-letter currency code (e.g. PKR -> Rs, USD -> $)
 */
export function getCurrencySymbol(currencyCode: string = "PKR"): string {
  const code = (currencyCode || "PKR").toUpperCase().trim();
  if (SYMBOL_OVERRIDE_MAP[code]) {
    return SYMBOL_OVERRIDE_MAP[code];
  }
  const fromMap = getSymbolFromCurrency(code);
  return fromMap || code;
}

/**
 * Formats a numeric amount using dynamic currency symbol and locale-aware number formatting.
 *
 * Example:
 * formatCurrency(2500, "PKR") -> "Rs 2,500.00"
 * formatCurrency(-50, "USD") -> "-$50.00"
 * formatCurrency(120, "PKR", { showPositivePrefix: true }) -> "+Rs 120.00"
 * formatCurrency(0, "EUR") -> "€0.00"
 */
export function formatCurrency(
  amount: number | null | undefined,
  currencyCode: string = "PKR",
  options: FormatCurrencyOptions = {}
): string {
  const {
    showPositivePrefix = false,
    showSign = false,
    maximumFractionDigits = 2,
  } = options;

  const minDigits =
    options.minimumFractionDigits !== undefined
      ? Math.min(options.minimumFractionDigits, maximumFractionDigits)
      : Math.min(2, maximumFractionDigits);

  const numeric = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  const isNegative = numeric < 0;
  const isPositive = numeric > 0;
  const absAmount = Math.abs(numeric);

  const symbol = getCurrencySymbol(currencyCode);

  // Use en-IN locale grouping for South Asian currencies, en-US for others
  const isSubcontinent = currencyCode === "PKR" || currencyCode === "INR";
  const locale = isSubcontinent ? "en-IN" : "en-US";

  const formattedNum = absAmount.toLocaleString(locale, {
    minimumFractionDigits: minDigits,
    maximumFractionDigits,
  });

  // Symbol placement: standard prefix with space for alphanumeric/multi-char (e.g. "Rs ", "AED ")
  const isLetterSymbol = /^[A-Za-z]/.test(symbol);
  const symbolFormatted = isLetterSymbol ? `${symbol} ` : symbol;

  let prefix = "";
  if (isNegative) {
    prefix = "-";
  } else if (isPositive && (showPositivePrefix || showSign)) {
    prefix = "+";
  }

  return `${prefix}${symbolFormatted}${formattedNum}`;
}
