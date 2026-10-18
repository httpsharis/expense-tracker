import { useUser } from "@clerk/expo";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
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
import { fromMinorUnits, toMinorUnits } from "@shared/lib/money";
import {
    OnboardingFormValues,
    onboardingSchema,
} from "@shared/lib/schemas/onboarding";
import { ensureDefaultAccounts } from "@services/accounts";
import { useSupabase } from "@shared/hooks/useSupabase";
import { invalidateLedgerQueries } from "@store/keys";
import { useUserStore } from "@store/userStore";

interface SetupErrorState {
  title: string;
  message: string;
}

export default function Onboarding() {
  const router = useRouter();
  const { user } = useUser();
  const authSupabase = useSupabase();
  const queryClient = useQueryClient();
  const setStoreCurrency = useUserStore((state) => state.setCurrency);
  const setNeedsOnboarding = useUserStore((state) => state.setNeedsOnboarding);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [setupError, setSetupError] = useState<SetupErrorState | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyEntry>(
    () => ALL_CURRENCIES.find((c) => c.code === "PKR") ?? ALL_CURRENCIES[0],
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
      const errorObj = err as Record<string, unknown>;
      const code = typeof errorObj.code === "string" ? errorObj.code : "";
      const rawMessage =
        typeof errorObj.message === "string" ? errorObj.message : "";
      const message = rawMessage.toLowerCase();

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

      if (rawMessage) {
        return {
          title: "Setup Failed",
          message: rawMessage,
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
    if (submittingRef.current) return;
    if (!user) {
      setSetupError({
        title: "Session Missing",
        message:
          "Your authenticated session has expired. Please sign in again.",
      });
      return;
    }

    submittingRef.current = true;
    try {
      setIsSubmitting(true);
      setSetupError(null);

      const initialAmountMinor = toMinorUnits(
        parseFloat(data.startingBalance || "0") || 0,
      );
      const initialAmount = fromMinorUnits(initialAmountMinor);
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

      // 2. Provision core default accounts (Cash, Bank, Savings)
      const accounts = await ensureDefaultAccounts(
        authSupabase,
        user.id,
        selectedCurrency.code,
      );
      const defaultCashAccount =
        accounts.find((a) => a.is_default) ??
        accounts.find((a) => a.type === "cash") ??
        accounts[0];

      // 3. Record initial starting balance via transactions (trigger posts balance_entries automatically)
      if (initialAmountMinor > 0 && defaultCashAccount) {
        const { error: transactionError } = await authSupabase
          .from("transactions")
          .insert({
            user_id: user.id,
            account_id: defaultCashAccount.id,
            type: "income",
            amount: initialAmount,
            description: "Starting Balance",
            input_method: "manual",
            status: "completed",
          });

        if (transactionError) throw transactionError;
      }

      // 4. Invalidate React Query caches, synchronize local store, and route to dashboard
      await invalidateLedgerQueries(queryClient, user.id);
      setStoreCurrency(selectedCurrency.code);
      setNeedsOnboarding(false);
      router.replace("/(root)/(tabs)");
    } catch (err: unknown) {
      const parsed = parseDatabaseError(err);
      setSetupError(parsed);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (submittingRef.current) return;
    if (!user) {
      setSetupError({
        title: "Session Missing",
        message:
          "Your authenticated session has expired. Please sign in again.",
      });
      return;
    }

    submittingRef.current = true;
    try {
      setIsSubmitting(true);
      setSetupError(null);

      const email = user.emailAddresses[0]?.emailAddress ?? "";
      const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

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

      await ensureDefaultAccounts(authSupabase, user.id, selectedCurrency.code);
      await invalidateLedgerQueries(queryClient, user.id);
      setStoreCurrency(selectedCurrency.code);
      setNeedsOnboarding(false);
      router.replace("/(root)/(tabs)");
    } catch (err: unknown) {
      const parsed = parseDatabaseError(err);
      setSetupError(parsed);
    } finally {
      submittingRef.current = false;
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

        {/* Action Button & Skip Option */}
        <View className="w-full pt-4 gap-3">
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

          <Pressable
            onPress={handleSkip}
            disabled={isSubmitting}
            className="w-full py-2.5 items-center justify-center active:opacity-60"
          >
            <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Skip for now (Start with 0)
            </Text>
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
