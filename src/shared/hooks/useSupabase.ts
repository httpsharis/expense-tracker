import { useAuth } from "@clerk/expo";
import { createSupabaseClient } from "@shared/lib/supabase";
import { useMemo } from "react";

export function useSupabase() {
  const { getToken, userId } = useAuth();

  const client = useMemo(() => {
    return createSupabaseClient(async () => {
      try {
        // 1. Try fetching the dedicated Supabase template
        return await getToken({ template: "supabase" });
      } catch (err) {
        console.warn(
          "[useSupabase] Supabase JWT template missing in Clerk. Falling back to default token."
        );
        // 2. Fallback so queries don't throw fatal exceptions
        return await getToken();
      }
    });
  }, [userId]);

  return client;
}