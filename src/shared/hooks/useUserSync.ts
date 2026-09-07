import { useUser } from "@clerk/expo";
import { useEffect } from "react";
import { useUserStore } from "../../../store/userStore";
import { useSupabase } from "./useSupabase";

export const useUserSync = () => {
    const { user } = useUser();
    const setCurrency = useUserStore((state) => state.setCurrency);
    const setNeedsOnboarding = useUserStore((state) => state.setNeedsOnboarding);
    const authSupabase = useSupabase();

    useEffect(() => {
        if (!user) return;

        const syncUser = async () => {
            try {
                // 1. Check if profile exists
                const { data: existingUser, error: fetchError } = await authSupabase
                    .from("profiles")
                    .select("id, currency")
                    .eq("id", user.id)
                    .maybeSingle();

                if (fetchError) {
                    console.error("Error fetching user profile:", fetchError);
                    setNeedsOnboarding(true);
                    return;
                }

                if (existingUser) {
                    setCurrency(existingUser.currency ?? "USD");
                    setNeedsOnboarding(!existingUser.currency);
                    return;
                }

                // 2. Create profile if missing
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
                        { onConflict: "id", ignoreDuplicates: false }
                    )
                    .select("currency")
                    .single();

                if (insertError) {
                    console.error("Error upserting profile:", insertError);
                    setNeedsOnboarding(true);
                    return;
                }

                setCurrency(newProfile?.currency ?? "USD");
                setNeedsOnboarding(false);

                // 3. Create initial Default Cash Account
                const { data: newAccount, error: accountError } = await authSupabase
                    .from("accounts")
                    .insert({
                        user_id: user.id,
                        name: "Cash",
                        type: "cash",
                        currency: newProfile?.currency ?? "USD",
                        is_default: true,
                    })
                    .select("id")
                    .single();

                if (accountError) {
                    console.error("Error creating default account:", accountError);
                    return;
                }

                // 4. Initialize account balance via an append-only balance entry
                if (newAccount) {
                    await authSupabase.from("balance_entries").insert({
                        user_id: user.id,
                        account_id: newAccount.id,
                        delta: 0,
                        reason: "initial_balance",
                    });
                }
            } catch (error) {
                console.error("Unexpected error in useUserSync:", error);
            }
        };

        syncUser();
    }, [user?.id]);
};