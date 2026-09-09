import { useAuth } from "@clerk/expo";
import { createSupabaseClient } from "@shared/lib/supabase";
import { useMemo } from "react";

export function useSupabase() {
  const { getToken, userId } = useAuth();

  const client = useMemo(() => {
    return createSupabaseClient(async () => {
      try {
        // First attempt using the custom "supabase" template if configured in Clerk
        const token = await getToken({ template: "supabase" });
        if (token) return token;
      } catch {
        // Fall back to standard session token containing Clerk sub claim
      }

      try {
        return await getToken();
      } catch (err) {
        console.error("[useSupabase] Failed to retrieve Clerk token:", err);
        return null;
      }
    });
  }, [userId, getToken]);

  return client;
}