import { useUser } from "@clerk/expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategory,
  deleteCategory,
  getCategories,
} from "../../services/categories";
import { useSupabase } from "../../src/shared/hooks/useSupabase";
import { queryKeys } from "../keys";

export function useCategoriesQuery() {
  const { user, isLoaded } = useUser();
  const supabase = useSupabase();

  return useQuery({
    queryKey: queryKeys.categories(user?.id),
    queryFn: () => getCategories(supabase, user!.id),
    enabled: Boolean(isLoaded && user?.id),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useCreateCategoryMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name: string; icon?: string }) => {
      if (!user?.id) throw new Error("User not authenticated");
      return createCategory(supabase, {
        userId: user.id,
        name: payload.name,
        icon: payload.icon,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.categories(user?.id),
      });
    },
  });
}

export function useDeleteCategoryMutation() {
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      return deleteCategory(supabase, user.id, categoryId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.categories(user?.id),
      });
    },
  });
}
