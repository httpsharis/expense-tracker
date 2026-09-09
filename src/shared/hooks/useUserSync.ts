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

    const syncUser = async () => {
      try {
        // 1. Fetch user profile (maybeSingle prevents PGRST116 errors on new accounts)
        const { data: existingUser, error: fetchError } = await authSupabase
          .from("profiles")
          .select("id, currency, onboarding_completed_at")
          .eq("id", user.id)
          .maybeSingle();

        if (isCancelled) return;

        if (fetchError) {
          console.error("Error fetching user profile:", fetchError.message);
          // Preserve previous needsOnboarding value on fetch errors instead of forcing it to true
          return;
        }

        // 2. Profile found in database
        if (existingUser) {
          if (existingUser.currency) {
            setCurrency(existingUser.currency);
          }

          // Mark onboarding complete only when onboarding_completed_at flag is present
          if (existingUser.onboarding_completed_at) {
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
          .select("currency, onboarding_completed_at")
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