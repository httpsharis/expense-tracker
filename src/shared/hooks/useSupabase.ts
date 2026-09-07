// src/shared/hooks/useSupabase.ts (or wherever your hook is placed)
import { useAuth } from "@clerk/expo";
import { createSupabaseClient } from "@shared/lib/supabase";
import { useMemo } from "react";

export function useSupabase() {
  const { getToken, userId } = useAuth();

  const client = useMemo(() => {
    return createSupabaseClient(async () => {
      // Must match the Clerk JWT template named "supabase"
      return await getToken({ template: "supabase" });
    });
  }, [userId]);

  return client;
}