import { useUser } from "@clerk/expo";
import { useEffect } from "react";
import { useUserStore } from "../../../store/userStore";
import { useSupabase } from "./useSupabase";

export const useUserSync = () => {
  const { user, isLoaded } = useUser();
  const setCurrency = useUserStore((state) => state.setCurrency);
  const setNeedsOnboarding = useUserStore((state) => state.setNeedsOnboarding);
  const authSupabase = useSupabase();

  useEffect(() => {
    if (!isLoaded || !user) return;

    let isCancelled = false;

    const syncUser = async (attempt = 1) => {
      try {
        // 1. Fetch user profile (maybeSingle prevents PGRST116 errors on new accounts)
        const { data: existingUser, error: fetchError } = await authSupabase
          .from("profiles")
          .select("id, currency")
          .eq("id", user.id)
          .maybeSingle();

        if (isCancelled) return;

        if (fetchError) {
          console.warn(`[useUserSync] Attempt ${attempt} failed:`, fetchError.message);
          // If token clock skew ("not yet valid"), retry up to 3 times
          if (attempt < 3 && fetchError.message?.toLowerCase().includes("not yet valid")) {
            await new Promise((r) => setTimeout(r, 1200));
            if (!isCancelled) return syncUser(attempt + 1);
          }
          // Do not leave app stuck in loading state indefinitely
          if (useUserStore.getState().needsOnboarding === null) {
            setNeedsOnboarding(false);
          }
          return;
        }

        // 2. Profile found in database
        if (existingUser) {
          if (existingUser.currency) {
            setCurrency(existingUser.currency);
          }

          // Check whether the user has at least one account to determine onboarding completion
          const { count, error: countError } = await authSupabase
            .from("accounts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id);

          if (isCancelled) return;

          if (!countError && typeof count === "number" && count > 0) {
            setNeedsOnboarding(false);
          } else {
            setNeedsOnboarding(true);
          }
          return;
        }

        // 3. Brand new user -> create initial profile record
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
              currency: "USD",
              month_start_day: 1,
            },
            { onConflict: "id" }
          )
          .select("currency")
          .maybeSingle();

        if (isCancelled) return;

        if (insertError) {
          console.error("Error upserting user profile:", insertError.message);
          return;
        }

        if (newProfile?.currency) {
          setCurrency(newProfile.currency);
        }

        // Needs onboarding so they pick their starting currency & balance
        setNeedsOnboarding(true);
      } catch (err: any) {
        console.error("Unexpected error in useUserSync:", err?.message || err);
      }
    };

    syncUser();

    return () => {
      isCancelled = true;
    };
  }, [isLoaded, user?.id, authSupabase, setCurrency, setNeedsOnboarding]);
};