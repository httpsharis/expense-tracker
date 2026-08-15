import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateTransactionPayload, createTransaction, deleteTransaction, fetchTransactionById, fetchTransactions } from './api';

export function useTransactions(periodId?: string) {
    const queryClient = useQueryClient();

    const txnsQuery = useQuery({
        queryKey: ['transactions', periodId],
        queryFn: () => fetchTransactions(periodId),
        enabled: Boolean(periodId),
    });

    const createMutation = useMutation({
        mutationFn: (payload: CreateTransactionPayload) => createTransaction(payload),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['transactions', variables.periodId] });
            queryClient.invalidateQueries({ queryKey: ['balance_entries', variables.periodId] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: ({ id, periodId }: { id: string; periodId: string }) => deleteTransaction(id),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['transactions', variables.periodId] });
            queryClient.invalidateQueries({ queryKey: ['balance_entries', variables.periodId] });
        },
    });

    return {
        transactions: txnsQuery.data || [],
        isLoading: txnsQuery.isLoading,
        createTransaction: createMutation.mutateAsync,
        deleteTransaction: deleteMutation.mutateAsync,
    };
}

export function useTransaction(id: string) {
    return useQuery({
        queryKey: ['transaction', id],
        queryFn: () => fetchTransactionById(id),
        enabled: Boolean(id),
    });
}
