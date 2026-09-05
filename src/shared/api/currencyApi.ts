import { CURRENCIES, Currency } from '@shared/lib/currencies';

export interface ExchangeRatesResponse {
  result: string;
  base_code: string;
  rates: Record<string, number>;
  time_last_update_utc?: string;
}

const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.78,
  PKR: 278.5,
  INR: 83.9,
  AED: 3.67,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 147.2,
  SGD: 1.34,
  SAR: 3.75,
  CNY: 7.15,
};

/**
 * Fetches live exchange rates relative to USD from open.er-api.com
 */
export async function fetchExchangeRates(baseCurrency: string = 'USD'): Promise<Record<string, number>> {
  try {
    const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
    }
    const data: ExchangeRatesResponse = await response.json();
    if (data && data.rates) {
      return data.rates;
    }
    return FALLBACK_RATES;
  } catch (error) {
    console.warn('Using fallback exchange rates due to network error:', error);
    return FALLBACK_RATES;
  }
}

/**
 * Converts an amount from one currency code to another given exchange rates (based on USD)
 */
export function convertCurrency(
  amount: number,
  fromCode: string,
  toCode: string,
  rates: Record<string, number> = FALLBACK_RATES
): number {
  if (fromCode === toCode) return amount;
  const fromRate = rates[fromCode] || 1;
  const toRate = rates[toCode] || 1;
  // Convert from origin to USD, then from USD to target
  const amountInUSD = amount / fromRate;
  return amountInUSD * toRate;
}
