import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { closePeriod, createPeriod, fetchActivePeriod, fetchPeriods } from './api';

export function useActivePeriod() {
    const queryClient = useQueryClient();

    const periodQuery = useQuery({
        queryKey: ['active_period'],
        queryFn: fetchActivePeriod,
    });

    const createMutation = useMutation({
        mutationFn: createPeriod,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active_period'] });
            queryClient.invalidateQueries({ queryKey: ['periods'] });
        }
    });

    const closeMutation = useMutation({
        mutationFn: closePeriod,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active_period'] });
            queryClient.invalidateQueries({ queryKey: ['periods'] });
        }
    });

    return {
        period: periodQuery.data,
        isLoading: periodQuery.isLoading,
        createPeriod: createMutation.mutateAsync,
        closePeriod: closeMutation.mutateAsync,
    };
}

export function usePeriods() {
    return useQuery({
        queryKey: ['periods'],
        queryFn: fetchPeriods,
    });
}