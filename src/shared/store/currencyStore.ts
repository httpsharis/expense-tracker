import { convertCurrency, fetchExchangeRates } from '@shared/api/currencyApi';
import { CURRENCIES, Currency, DEFAULT_CURRENCY } from '@shared/lib/currencies';
import { create } from 'zustand';

interface CurrencyState {
  currency: Currency;
  rates: Record<string, number>;
  isLoadingRates: boolean;
  setCurrency: (code: string) => void;
  loadRates: () => Promise<void>;
  format: (amount: number) => string;
}

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  currency: DEFAULT_CURRENCY,
  rates: { USD: 1 },
  isLoadingRates: false,

  setCurrency: (code: string) => {
    const selected = CURRENCIES.find((c) => c.code === code) || DEFAULT_CURRENCY;
    set({ currency: selected });
  },

  loadRates: async () => {
    set({ isLoadingRates: true });
    const fetchedRates = await fetchExchangeRates('USD');
    set({ rates: fetchedRates, isLoadingRates: false });
  },

  format: (amount: number) => {
    const { currency } = get();
    const formatted = Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const sign = amount < 0 ? '-' : '';
    if (currency.position === 'prefix') {
      return `${sign}${currency.symbol}${formatted}`;
    }
    return `${sign}${formatted} ${currency.symbol}`;
  },
}));
