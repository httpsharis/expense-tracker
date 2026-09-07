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

    const syncUser = async () => {
      try {
        // 1. Fetch user profile (maybeSingle prevents PGRST116 errors on new accounts)
        const { data: existingUser, error: fetchError } = await authSupabase
          .from("profiles")
          .select("id, currency")
          .eq("id", user.id)
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching user profile:", fetchError.message);
          setNeedsOnboarding(true);
          return;
        }

        // 2. Profile found in database
        if (existingUser) {
          if (existingUser.currency) {
            setCurrency(existingUser.currency);
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

        if (insertError) {
          console.error("Error upserting user profile:", insertError.message);
          setNeedsOnboarding(true);
          return;
        }

        if (newProfile?.currency) {
          setCurrency(newProfile.currency);
        }
        
        // Needs onboarding so they pick their starting currency & balance
        setNeedsOnboarding(true);
      } catch (err: any) {
        console.error("Unexpected error in useUserSync:", err?.message || err);
        setNeedsOnboarding(true);
      }
    };

    syncUser();
  }, [isLoaded, user?.id]);
};