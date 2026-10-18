import { useUser } from "@clerk/expo";
import { useCallback, useEffect, useState } from "react";
import { ensureDefaultAccounts } from "@services/accounts";
import { useUserStore } from "@store/userStore";
import { useSupabase } from "./useSupabase";

export const useUserSync = () => {
  const { user, isLoaded } = useUser();
  const setCurrency = useUserStore((state) => state.setCurrency);
  const setDisplayName = useUserStore((state) => state.setDisplayName);
  const setNeedsOnboarding = useUserStore((state) => state.setNeedsOnboarding);
  const authSupabase = useSupabase();
  const [syncError, setSyncError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const retrySync = useCallback(() => {
    setSyncError(null);
    setRetryTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!isLoaded || !user) return;

    let isCancelled = false;

    const syncUser = async (attempt = 1) => {
      try {
        setSyncError(null);

        const { data: existingUser, error: fetchError } = await authSupabase
          .from("profiles")
          .select("id, currency, name")
          .eq("id", user.id)
          .maybeSingle();

        if (isCancelled) return;

        if (fetchError) {
          console.warn(`[useUserSync] Attempt ${attempt} failed:`, fetchError.message);
          if (attempt < 3 && fetchError.message?.toLowerCase().includes("not yet valid")) {
            await new Promise((r) => setTimeout(r, 1200));
            if (!isCancelled) return syncUser(attempt + 1);
          }
          setSyncError(fetchError.message || "Unable to verify your profile.");
          return;
        }

        if (existingUser) {
          if (existingUser.currency) {
            setCurrency(existingUser.currency);
          }
          if (existingUser.name) {
            setDisplayName(existingUser.name);
          }

          const { count, error: countError } = await authSupabase
            .from("accounts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id);

          if (isCancelled) return;

          if (!countError && (!count || count === 0)) {
            // Automatically ensure Cash, Bank, and Savings accounts exist
            await ensureDefaultAccounts(authSupabase, user.id, existingUser.currency || "PKR");
          }

          setNeedsOnboarding(false);
          return;
        }

        const email = user.emailAddresses[0]?.emailAddress ?? "";
        const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

        const { data: newProfile, error: insertError } = await authSupabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
              email,
              name: fullName || null,
              image_url: user.imageUrl || null,
              currency: "PKR",
              month_start_day: 1,
            },
            { onConflict: "id" }
          )
          .select("currency, name")
          .maybeSingle();

        if (isCancelled) return;

        if (insertError) {
          console.error("Error upserting user profile:", insertError.message);
          setSyncError(insertError.message || "Unable to create your profile.");
          return;
        }

        if (newProfile?.currency) {
          setCurrency(newProfile.currency);
        }
        if (newProfile?.name) {
          setDisplayName(newProfile.name);
        }

        // Ensure default accounts exist for newly created profile
        await ensureDefaultAccounts(authSupabase, user.id, newProfile?.currency || "PKR");
        setNeedsOnboarding(true);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "unknown error";
        console.error("Unexpected error in useUserSync:", message);
        if (!isCancelled) {
          setSyncError(message);
        }
      }
    };

    void syncUser();

    return () => {
      isCancelled = true;
    };
  }, [isLoaded, user?.id, authSupabase, setCurrency, setDisplayName, setNeedsOnboarding, retryTrigger]);

  return { syncError, retrySync };
};