import { useUser } from "@clerk/expo";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    ActivityIndicator,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    ALL_CURRENCIES,
    CurrencyEntry,
    CurrencyPicker,
} from "@shared/components/CurrencyPicker";
import {
    OnboardingFormValues,
    onboardingSchema,
} from "@shared/lib/schemas/onboarding";
import { useSupabase } from "../../src/shared/hooks/useSupabase";
import { useUserStore } from "../../store/userStore";

interface SetupErrorState {
  title: string;
  message: string;
}

export default function Onboarding() {
  const router = useRouter();
  const { user } = useUser();
  const authSupabase = useSupabase();
  const setStoreCurrency = useUserStore((state) => state.setCurrency);
  const setNeedsOnboarding = useUserStore((state) => state.setNeedsOnboarding);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupError, setSetupError] = useState<SetupErrorState | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyEntry>(
    () => ALL_CURRENCIES.find((c) => c.code === "USD") ?? ALL_CURRENCIES[0],
  );

  const {
    control,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    mode: "onBlur",
    defaultValues: { startingBalance: "0" },
  });

  const parseDatabaseError = (err: unknown): SetupErrorState => {
    if (typeof err === "object" && err !== null) {
      const errorObj = err as Record<string, any>;
      const code = errorObj.code;
      const message = errorObj.message?.toLowerCase() || "";

      // PostgREST / Supabase permission failure
      if (code === "42501" || message.includes("row-level security")) {
        return {
          title: "Permission Denied",
          message:
            "Unable to update profile. Please verify your authentication session.",
        };
      }

      // Network drop or unreachable database
      if (
        message.includes("failed to fetch") ||
        message.includes("network request failed")
      ) {
        return {
          title: "Network Offline",
          message:
            "Check your internet connection and tap continue to try again.",
        };
      }

      // Missing profile record
      if (code === "PGRST116" || message.includes("profiles")) {
        return {
          title: "Account Syncing",
          message:
            "Profile row is initializing. Please wait a moment and try again.",
        };
      }

      if (errorObj.message) {
        return {
          title: "Setup Failed",
          message: errorObj.message,
        };
      }
    }

    if (err instanceof Error) {
      return { title: "Error", message: err.message };
    }

    return {
      title: "Setup Incomplete",
      message: "An unexpected error occurred while configuring your wallet.",
    };
  };

  const handleSave = async (data: OnboardingFormValues) => {
    if (!user) {
      setSetupError({
        title: "Session Missing",
        message:
          "Your authenticated session has expired. Please sign in again.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setSetupError(null);

      const initialAmount = parseFloat(data.startingBalance || "0");
      const email = user.emailAddresses[0]?.emailAddress ?? "";
      const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

      // 1. Ensure the profile row exists with the chosen currency (UPSERT avoids FK violation)
      const { error: profileError } = await authSupabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email,
            name: fullName || null,
            image_url: user.imageUrl || null,
            currency: selectedCurrency.code,
            month_start_day: 1,
          },
          { onConflict: "id" },
        );

      if (profileError) throw profileError;

      // 2. Fetch or create the primary Cash account
      let accountId: string;
      const { data: existingAccount, error: fetchAccountError } =
        await authSupabase
          .from("accounts")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_default", true)
          .maybeSingle();

      if (fetchAccountError) throw fetchAccountError;

      if (existingAccount) {
        accountId = existingAccount.id;
      } else {
        const { data: newAccount, error: accountError } = await authSupabase
          .from("accounts")
          .insert({
            user_id: user.id,
            name: "Cash",
            type: "cash",
            currency: selectedCurrency.code,
            is_default: true,
          })
          .select("id")
          .single();

        if (accountError) throw accountError;
        accountId = newAccount.id;
      }

      // 3. Append the initial balance entry to the ledger
      if (initialAmount > 0) {
        const { error: balanceError } = await authSupabase
          .from("balance_entries")
          .insert({
            user_id: user.id,
            account_id: accountId,
            delta: initialAmount,
            reason: "top_up", // <-- 'top_up' satisfies the existing check constraint
          });

        if (balanceError) throw balanceError;
      }

      // 4. Synchronize local store and route to dashboard
      setStoreCurrency(selectedCurrency.code);
      setNeedsOnboarding(false);
      router.replace("/(root)/(tabs)");
    } catch (err: unknown) {
      const parsed = parseDatabaseError(err);
      setSetupError(parsed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F7F5] dark:bg-[#0A0A0B]">
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
          paddingHorizontal: 24,
          paddingVertical: 16,
        }}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Eyebrow */}
        <View className="items-center pt-2">
          <Text className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
            Initial Setup
          </Text>
        </View>

        {/* Center Display Area */}
        <View className="items-center justify-center my-auto">
          {/* Currency Pill */}
          <Pressable
            onPress={() => {
              setSetupError(null);
              setPickerOpen(true);
            }}
            className="flex-row items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-200/70 dark:bg-zinc-800/80 active:opacity-75 mb-8"
          >
            <Text className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {selectedCurrency.code} ({selectedCurrency.symbol})
            </Text>
            <Feather name="chevron-down" size={14} color="#71717A" />
          </Pressable>

          <Text className="text-xs font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase mb-4">
            Starting Balance
          </Text>

          {/* Hero Numerical Input */}
          <Controller
            control={control}
            name="startingBalance"
            render={({ field: { onChange, onBlur, value } }) => (
              <View className="flex-row items-center justify-center">
                <Text className="text-5xl md:text-6xl font-extrabold text-zinc-400 dark:text-zinc-600 mr-2">
                  {selectedCurrency.symbol}
                </Text>
                <TextInput
                  value={value}
                  onChangeText={(val) => {
                    setSetupError(null);
                    const sanitized = val.replace(/[^0-9.]/g, "");
                    onChange(sanitized);
                  }}
                  onBlur={onBlur}
                  placeholder="0"
                  placeholderTextColor="#A1A1AA"
                  keyboardType="decimal-pad"
                  autoFocus
                  caretHidden={!value}
                  cursorColor="#71717A"
                  className="text-5xl md:text-6xl font-black text-zinc-900 dark:text-zinc-50 p-0 text-center min-w-[50px]"
                />
              </View>
            )}
          />

          {/* Form Validation Errors */}
          {formErrors.startingBalance && (
            <Text className="text-xs font-medium text-red-500 mt-4 text-center">
              {formErrors.startingBalance.message}
            </Text>
          )}

          {/* Structured Database & Network Error Banner */}
          {setupError && (
            <View className="w-full mt-6 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200/70 dark:border-red-900/60">
              <View className="flex-row items-center gap-2 mb-1">
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text className="text-xs font-bold text-red-700 dark:text-red-400">
                  {setupError.title}
                </Text>
              </View>
              <Text className="text-xs text-red-600 dark:text-red-300 ml-6">
                {setupError.message}
              </Text>
            </View>
          )}
        </View>

        {/* Action Button */}
        <View className="w-full pt-4">
          <Pressable
            onPress={handleSubmit(handleSave)}
            disabled={isSubmitting}
            className="w-full h-14 bg-zinc-900 dark:bg-zinc-100 rounded-2xl items-center justify-center active:opacity-80 shadow-sm"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-base font-semibold text-white dark:text-zinc-950">
                {setupError ? "Try Again" : "Continue"}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAwareScrollView>

      {/* Currency Picker Component */}
      <CurrencyPicker
        visible={pickerOpen}
        selectedCode={selectedCurrency.code}
        onSelect={(currency) => setSelectedCurrency(currency)}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}
