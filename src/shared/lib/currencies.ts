export interface Currency {
    code: string;
    name: string;
    symbol: string;
    position: 'prefix' | 'suffix';
}

export const CURRENCIES: Currency[] = [
    { code: 'USD', name: 'US Dollar', symbol: '$', position: 'prefix' },
    { code: 'EUR', name: 'Euro', symbol: '€', position: 'prefix' },
    { code: 'GBP', name: 'British Pound', symbol: '£', position: 'prefix' },
    { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs ', position: 'prefix' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', position: 'prefix' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'AED ', position: 'prefix' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', position: 'prefix' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'AU$', position: 'prefix' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', position: 'prefix' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'SG$', position: 'prefix' },
];

export const DEFAULT_CURRENCY = CURRENCIES[0];

/**
 * Pure function: formats any monetary figure with tabular formatting
 */
export function formatMoney(amount: number, currency: Currency = DEFAULT_CURRENCY): string {
    const formatted = Math.abs(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const sign = amount < 0 ? '-' : '';

    if (currency.position === 'prefix') {
        return `${sign}${currency.symbol}${formatted}`;
    }
    return `${sign}${formatted} ${currency.symbol}`;
}