import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addPerson, deletePerson, fetchPeople } from './api';

export function usePeople() {
    const queryClient = useQueryClient();

    const peopleQuery = useQuery({
        queryKey: ['people'],
        queryFn: fetchPeople,
    });

    const addMutation = useMutation({
        mutationFn: (name: string) => addPerson(name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['people'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deletePerson(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['people'] });
        },
    });

    return {
        people: peopleQuery.data || [],
        isLoading: peopleQuery.isLoading,
        addPerson: addMutation.mutateAsync,
        deletePerson: deleteMutation.mutateAsync,
    };
}
