import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SettlePayload, fetchDebts, settleDebt } from './api';

export function useDebts() {
    const queryClient = useQueryClient();

    const debtsQuery = useQuery({
        queryKey: ['debts'],
        queryFn: fetchDebts,
    });

    const settleMutation = useMutation({
        mutationFn: (payload: SettlePayload) => settleDebt(payload),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['debts'] });
            queryClient.invalidateQueries({ queryKey: ['balance_entries', variables.periodId] });
        },
    });

    return {
        debts: debtsQuery.data || [],
        isLoading: debtsQuery.isLoading,
        settleDebt: settleMutation.mutateAsync,
    };
}
