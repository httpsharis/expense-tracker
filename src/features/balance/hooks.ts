import { calculatePeriodBalance, calculateSpendingProgress } from '@shared/lib/calculations';
import { Database } from '@shared/types/database.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addTopUp, fetchBalanceEntries } from './api';

type BalanceEntry = Database['public']['Tables']['balance_entries']['Row'];

export function useBalance(periodId: string | undefined) {
    const queryClient = useQueryClient();

    const entriesQuery = useQuery({
        queryKey: ['balance_entries', periodId],
        queryFn: () => (periodId ? fetchBalanceEntries(periodId) : Promise.resolve([])),
        enabled: Boolean(periodId),
    });

    const entries: BalanceEntry[] = entriesQuery.data || [];
    const balance = calculatePeriodBalance(entries);

    const totalTopUps = entries
        .filter((e: BalanceEntry) => e.type === 'top_up')
        .reduce((sum: number, e: BalanceEntry) => sum + Number(e.amount), 0);
    const totalSpent = entries
        .filter((e: BalanceEntry) => e.type === 'expense' || e.type === 'settlement')
        .reduce((sum: number, e: BalanceEntry) => sum + Number(e.amount), 0);

    const progress = calculateSpendingProgress(totalTopUps, totalSpent);

    const topUpMutation = useMutation({
        mutationFn: ({ amount }: { amount: number }) => {
            if (!periodId) throw new Error('No active period found');
            return addTopUp(periodId, amount);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['balance_entries', periodId] });
        },
    });

    return {
        balance,
        spendingProgress: progress,
        entries,
        isLoading: entriesQuery.isLoading,
        topUp: topUpMutation.mutateAsync,
    };
}