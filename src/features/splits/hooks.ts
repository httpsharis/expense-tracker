import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateSplitPayload, createSplit, fetchSplitByTransaction } from './api';

export function useSplit(transactionId: string) {
    return useQuery({
        queryKey: ['split', transactionId],
        queryFn: () => fetchSplitByTransaction(transactionId),
        enabled: Boolean(transactionId),
    });
}

export function useCreateSplit() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateSplitPayload) => createSplit(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['debts'] });
        },
    });
}
