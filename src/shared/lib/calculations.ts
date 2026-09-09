export interface BalanceEntrySummary {
    amount: number;
    type: 'top_up' | 'expense' | 'settlement';
}

export interface SplitResult {
    personId: string | null; // null represents the app user
    amount: number;
}

export interface DebtSummary {
    amount: number;
    direction: 'owed_to_me' | 'i_owe';
    status: 'open' | 'partial' | 'settled';
}

/**
 * Calculates current ledger balance by summing signed deltas from balance_entries.
 */
export function calculateLedgerBalance(entries: { delta: number }[]): number {
    return entries.reduce((acc, entry) => acc + Number(entry.delta), 0);
}

/**
 * Calculates current period balance: Top-ups minus (Expenses + From-Balance Settlements).
 */
export function calculatePeriodBalance(entries: BalanceEntrySummary[]): number {
    return entries.reduce((acc, entry) => {
        if (entry.type === 'top_up') {
            return acc + Number(entry.amount);
        }
        return acc - Number(entry.amount);
    }, 0);
}

/**
 * Splits an amount evenly across participants, assigning rounding remainder cents to the payer.
 */
export function calculateEvenSplit(
    totalAmount: number,
    numPeople: number,
    payerPersonId: string | null,
    participantIds: (string | null)[]
): SplitResult[] {
    if (numPeople <= 0) throw new Error('Number of participants must be greater than zero.');

    const baseAmount = Math.floor((totalAmount / numPeople) * 100) / 100;
    const totalAllocated = baseAmount * numPeople;
    const remainder = Math.round((totalAmount - totalAllocated) * 100) / 100;

    return participantIds.map((id, index) => {
        const isPayer = id === payerPersonId;
        const extra = isPayer || (payerPersonId === null && index === 0) ? remainder : 0;
        return {
            personId: id,
            amount: Math.round((baseAmount + extra) * 100) / 100,
        };
    });
}

/**
 * Calculates remaining unsettled debt and updates status.
 */
export function calculateRemainingDebt(
    totalAmount: number,
    settlements: { amount: number }[]
): { remainingAmount: number; status: 'open' | 'partial' | 'settled' } {
    const settledSum = settlements.reduce((sum, s) => sum + Number(s.amount), 0);
    const remaining = Math.max(0, Math.round((totalAmount - settledSum) * 100) / 100);

    let status: 'open' | 'partial' | 'settled' = 'open';
    if (remaining === 0) {
        status = 'settled';
    } else if (settledSum > 0) {
        status = 'partial';
    }

    return { remainingAmount: remaining, status };
}

/**
 * Calculates net debt balance for a specific person: (Owed to me) - (I owe).
 */
export function calculatePersonNetBalance(debts: DebtSummary[]): { netAmount: number; direction: 'owed_to_me' | 'i_owe' | 'even' } {
    const activeDebts = debts.filter((d) => d.status !== 'settled');
    const owedToMeSum = activeDebts
        .filter((d) => d.direction === 'owed_to_me')
        .reduce((sum, d) => sum + Number(d.amount), 0);
    const iOweSum = activeDebts
        .filter((d) => d.direction === 'i_owe')
        .reduce((sum, d) => sum + Number(d.amount), 0);

    const diff = owedToMeSum - iOweSum;
    if (diff > 0) {
        return { netAmount: diff, direction: 'owed_to_me' };
    } else if (diff < 0) {
        return { netAmount: Math.abs(diff), direction: 'i_owe' };
    }
    return { netAmount: 0, direction: 'even' };
}

/**
 * Calculates the progress fraction (0 to 1) for the hero BalanceHeader progress bar.
 */
export function calculateSpendingProgress(totalTopUps: number, totalSpent: number): number {
    if (totalTopUps <= 0) return 0;
    return Math.min(Math.max(totalSpent / totalTopUps, 0), 1);
}