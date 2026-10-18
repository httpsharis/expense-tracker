import { useClerk, useUser } from "@clerk/expo";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CategoryRow } from "@services/categories";
import { getTransactions } from "@services/transactions";
import { CurrencyPicker } from "@shared/components/CurrencyPicker";
import { useSupabase } from "@shared/hooks/useSupabase";
import { buildTransactionsCsv, type CsvExportAccountInfo } from "@shared/lib/csv";
import { formatCurrency, getCurrencySymbol } from "@shared/lib/currency";
import { getErrorMessage } from "@shared/lib/errors";
import { fromMinorUnits, toMinorUnits } from "@shared/lib/money";
import {
  useAccountsWithBalancesQuery,
  useBudgetsQuery,
  useCategoriesQuery,
  useClearAllUserDataMutation,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useSetDefaultAccountMutation,
} from "@store/hooks";
import { invalidateLedgerQueries } from "@store/keys";
import { usePrompt } from "@store/promptStore";
import { type MonthStartMode, useUserStore } from "@store/userStore";
import {
  DonationModal,
  MonthStartModeModal,
} from "@features/profile";
import { CategoryIconPickerModal } from "@features/categories";
import { CategoryIcon } from "@shared/components/CategoryIcon";
import { checkAndApplyUpdate } from "@shared/lib/updates";

interface ProfileRowItem {
  id: string;
  label: string;
  subtitle?: string;
  icon: keyof typeof Feather.glyphMap;
  onPress?: () => void;
  isDestructive?: boolean;
  rightText?: string;
  badgeColor?: "primary" | "neutral";
}

interface ProfileSection {
  title: string;
  items: ProfileRowItem[];
}

export default function ProfileScreen() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const supabase = useSupabase();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setColorScheme } = useColorScheme();
  const theme = useUserStore((s) => s.theme);
  const toggleTheme = useUserStore((s) => s.toggleTheme);
  const displayName = useUserStore((s) => s.displayName);
  const setDisplayName = useUserStore((s) => s.setDisplayName);
  const isDark = theme === "dark";
  const { confirm, alert } = usePrompt();

  const handleToggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    toggleTheme();
    try {
      setColorScheme(nextTheme);
    } catch {
      // Ignore if native appearance bridge is unavailable
    }
  };

  const currency = useUserStore((s) => s.currency) || "PKR";
  const setCurrency = useUserStore((s) => s.setCurrency);

  const { data: accounts = [] } = useAccountsWithBalancesQuery();
  const { data: categories = [] } = useCategoriesQuery();
  const { data: budgets = [] } = useBudgetsQuery();
  const createCategoryMutation = useCreateCategoryMutation();
  const deleteCategoryMutation = useDeleteCategoryMutation();
  const setDefaultAccountMutation = useSetDefaultAccountMutation();

  // Compute total net worth across accounts
  const totalNetWorth = useMemo(() => {
    try {
      const sumMinor = accounts.reduce((acc, item) => {
        const bal = Number(item.balance);
        return acc + (Number.isFinite(bal) ? toMinorUnits(bal) : 0);
      }, 0);
      return fromMinorUnits(sumMinor);
    } catch {
      return 0;
    }
  }, [accounts]);

  const defaultAccount = useMemo(
    () => accounts.find((a) => a.is_default) ?? accounts[0] ?? null,
    [accounts],
  );

  const categoryMap = useMemo(
    () => new Map(categories.map((cat) => [cat.id, cat.name])),
    [categories],
  );
  const accountMap = useMemo(
    () =>
      new Map<string, CsvExportAccountInfo>(
        accounts.map((acc) => [acc.id, { name: acc.name, currency: acc.currency }]),
      ),
    [accounts],
  );

  // Modals & local state
  const [loggingOut, setLoggingOut] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [defaultAccountModalOpen, setDefaultAccountModalOpen] = useState(false);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [monthStartModalOpen, setMonthStartModalOpen] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [clearingData, setClearingData] = useState(false);

  const monthStartMode = useUserStore((s) => s.monthStartMode);
  const setMonthStartMode = useUserStore((s) => s.setMonthStartMode);
  const setLastMonthResetDate = useUserStore((s) => s.setLastMonthResetDate);
  const clearAllUserDataMutation = useClearAllUserDataMutation();

  // Edit Profile form state
  const [firstNameInput, setFirstNameInput] = useState(user?.firstName || "");
  const [lastNameInput, setLastNameInput] = useState(user?.lastName || "");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (displayName) {
      const parts = displayName.trim().split(/\s+/);
      setFirstNameInput(parts[0] || "");
      setLastNameInput(parts.slice(1).join(" "));
    } else if (user) {
      setFirstNameInput(user.firstName || "");
      setLastNameInput(user.lastName || "");
    }
  }, [user, displayName]);

  // Categories form state
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("pricetag");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const fullName =
    displayName ||
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Saldo Member";
  const email = user?.primaryEmailAddress?.emailAddress || "ledger@saldo.app";
  const nameParts = fullName.trim().split(/\s+/);
  const initials =
    (nameParts[0]?.[0] || "S").toUpperCase() +
    (nameParts[1]?.[0] || nameParts[0]?.[1] || "A").toUpperCase();

  // ── Save Profile Details (Supabase + Clerk + Store) ──
  const handleSaveProfile = async () => {
    if (!user || savingProfile) return;
    const trimmedFirst = firstNameInput.trim();
    const trimmedLast = lastNameInput.trim();
    if (!trimmedFirst) {
      await alert({
        title: "Name Required",
        message: "Please enter your first name.",
        variant: "warning",
      });
      return;
    }

    setSavingProfile(true);
    try {
      const updatedFullName = [trimmedFirst, trimmedLast]
        .filter(Boolean)
        .join(" ");

      const { error: dbError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email,
            name: updatedFullName,
            currency,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );

      if (dbError) throw dbError;

      setDisplayName(updatedFullName);

      try {
        await user.update({
          firstName: trimmedFirst,
          lastName: trimmedLast,
        });
      } catch {
        // Clerk OAuth providers may disallow direct firstName/lastName mutation;
        // Supabase profile & local store are already updated.
      }

      setEditProfileModalOpen(false);
    } catch (err: unknown) {
      await alert({
        title: "Update Failed",
        message: getErrorMessage(err, "Could not update profile details."),
        variant: "warning",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Create Custom Category ──
  const handleCreateCategory = async () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName || createCategoryMutation.isPending) return;
    try {
      await createCategoryMutation.mutateAsync({
        name: trimmedName,
        icon: newCategoryIcon.trim() || "pricetag",
      });
      setNewCategoryName("");
      setNewCategoryIcon("pricetag");
    } catch (err: unknown) {
      await alert({
        title: "Could Not Create Category",
        message: getErrorMessage(err),
        variant: "warning",
      });
    }
  };

  // ── Delete Unused Category ──
  const handleDeleteCategory = async (cat: CategoryRow) => {
    const confirmed = await confirm({
      title: `Delete "${cat.name}"?`,
      message:
        "Unused categories can be removed permanently. Categories used by transactions or budgets are protected.",
      variant: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!confirmed) return;

    try {
      await deleteCategoryMutation.mutateAsync(cat.id);
    } catch (err: unknown) {
      await alert({
        title: "Category In Use",
        message: getErrorMessage(err, "Could not delete category."),
        variant: "warning",
      });
    }
  };

  // ── Sync & Refresh Ledger ──
  const handleSyncLedger = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await invalidateLedgerQueries(queryClient, user?.id);
      await queryClient.refetchQueries();
      await alert({
        title: "Ledger Synced",
        message: "All accounts, transactions, budgets, and splits are up to date.",
        variant: "info",
      });
    } catch (err: unknown) {
      await alert({
        title: "Sync Error",
        message: getErrorMessage(err),
        variant: "warning",
      });
    } finally {
      setSyncing(false);
    }
  };

  // ── Export CSV ──
  const handleExportData = async () => {
    if (!user?.id) return;

    try {
      const allTransactions = await getTransactions(supabase, user.id);
      if (allTransactions.length === 0) {
        await alert({
          title: "No Transactions",
          message: "You have no transactions to export yet.",
          variant: "warning",
        });
        return;
      }

      const csv = buildTransactionsCsv(
        allTransactions,
        categoryMap,
        accountMap,
        currency,
      );

      await Share.share({
        title: "Saldo Transactions Export",
        message: csv,
      });
    } catch (err: unknown) {
      await alert({
        title: "Export Failed",
        message: getErrorMessage(err),
        variant: "warning",
      });
    }
  };

  // ── Check for OTA Updates ──
  const handleCheckForUpdates = async () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    try {
      const result = await checkAndApplyUpdate(true, async () => {
        return await confirm({
          title: "Update Downloaded",
          message: "A new update is ready. Restart Saldo now to apply?",
          confirmText: "Restart Now",
          cancelText: "Later",
          variant: "info",
        });
      });

      if (result.status === "updated") {
        await alert({
          title: "Update Installed",
          message: result.message,
          variant: "info",
        });
      } else if (result.status === "up_to_date") {
        await alert({
          title: "Up to Date",
          message: result.message,
          variant: "info",
        });
      } else if (result.status === "dev_mode") {
        await alert({
          title: "EAS Updates Active",
          message: result.message,
          variant: "info",
        });
      } else {
        await alert({
          title: "Update Check",
          message: result.message,
          variant: "warning",
        });
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

  // ── Sign Out ──
  const handleSignOut = async () => {
    const confirmed = await confirm({
      title: "Sign Out",
      message: "Are you sure you want to sign out of Saldo?",
      variant: "danger",
      confirmText: "Sign Out",
      cancelText: "Cancel",
    });
    if (!confirmed) return;

    setLoggingOut(true);
    try {
      await signOut();
      queryClient.clear();
      useUserStore.getState().resetUserStore();
      router.replace("/(auth)/SignIn");
    } catch (err: unknown) {
      setLoggingOut(false);
      await alert({
        title: "Sign Out Error",
        message: getErrorMessage(err),
        variant: "warning",
      });
    }
  };

  // ── Delete Account ──
  const handleDeleteAccount = async () => {
    const firstConfirm = await confirm({
      title: "Delete Account",
      message:
        "Are you sure you want to permanently delete your account? This action cannot be reversed.",
      variant: "danger",
      confirmText: "Proceed",
      cancelText: "Cancel",
    });
    if (!firstConfirm) return;

    const secondConfirm = await confirm({
      title: "Final Confirmation",
      message:
        "All your personal ledger history, accounts, budgets, and split records will be permanently removed. Continue?",
      variant: "danger",
      confirmText: "Delete Account Forever",
      cancelText: "Keep Account",
    });
    if (!secondConfirm) return;

    setLoggingOut(true);
    try {
      if (user) {
        const { error: deleteProfileError } = await supabase
          .from("profiles")
          .delete()
          .eq("id", user.id);
        if (deleteProfileError) throw deleteProfileError;

        await user.delete();
      }
      await signOut();
      queryClient.clear();
      useUserStore.getState().resetUserStore();
      router.replace("/(auth)/SignIn");
    } catch (err: unknown) {
      setLoggingOut(false);
      await alert({
        title: "Deletion Error",
        message: getErrorMessage(err),
        variant: "warning",
      });
    }
  };

  // ── Month Start Mode Handler ──
  const handleStartNewMonthNow = async (mode: MonthStartMode) => {
    setMonthStartMode(mode);
    setLastMonthResetDate(new Date().toISOString());
    if (user?.id) {
      await invalidateLedgerQueries(queryClient, user.id);
    }
  };

  // ── Clear All Data (Start Over) ──
  const handleClearAllData = async () => {
    const firstConfirm = await confirm({
      title: "Clear All Data?",
      message:
        "This will permanently erase all transactions, splits, shared debts, budgets, and balance history so you can start over from scratch with zero balance. Your login account will stay active.",
      variant: "danger",
      confirmText: "Yes, Start Over",
      cancelText: "Keep My Data",
    });
    if (!firstConfirm) return;

    const secondConfirm = await confirm({
      title: "Final Confirmation",
      message:
        "Are you completely certain? All ledger records will be deleted immediately and default accounts will reset to 0.00.",
      variant: "danger",
      confirmText: "Wipe & Start Over",
      cancelText: "Cancel",
    });
    if (!secondConfirm) return;

    setClearingData(true);
    try {
      if (!user?.id) throw new Error("User not authenticated");
      await clearAllUserDataMutation.mutateAsync(currency);
      useUserStore.getState().setActiveFilterAccountId(null);
      queryClient.clear();
      await invalidateLedgerQueries(queryClient, user.id);

      await alert({
        title: "Data Reset Complete",
        message:
          "All transactions, splits, and budgets have been wiped. You now have a fresh start with 0 balance across default accounts.",
        variant: "success",
      });
    } catch (err: unknown) {
      await alert({
        title: "Reset Error",
        message: getErrorMessage(err),
        variant: "warning",
      });
    } finally {
      setClearingData(false);
    }
  };

  const sections: ProfileSection[] = [
    {
      title: "ACCOUNT & PREFERENCES",
      items: [
        {
          id: "personal_details",
          label: "Personal Details",
          subtitle: "Name, email & account identity",
          icon: "user",
          rightText: "Edit",
          onPress: () => setEditProfileModalOpen(true),
        },
        {
          id: "currency",
          label: "Base Currency",
          subtitle: "Primary ledger denomination",
          icon: "dollar-sign",
          rightText: `${currency} (${getCurrencySymbol(currency)})`,
          badgeColor: "primary",
          onPress: () => setCurrencyPickerOpen(true),
        },
        {
          id: "default_account",
          label: "Default Payment Account",
          subtitle: "Pre-selected when logging transactions",
          icon: "check-circle",
          rightText: defaultAccount?.name || "None",
          onPress: () => setDefaultAccountModalOpen(true),
        },
        {
          id: "month_start_mode",
          label: "Monthly Cycle Rollover",
          subtitle:
            monthStartMode === "zero"
              ? "Start new month at 0.00 (Zero-Based)"
              : "Carry forward remaining amount",
          icon: "calendar",
          rightText: monthStartMode === "zero" ? "Start at 0" : "Carry Over",
          badgeColor: "primary",
          onPress: () => setMonthStartModalOpen(true),
        },
        {
          id: "appearance",
          label: "Appearance",
          subtitle: "Switch between Light and Dark theme",
          icon: isDark ? "moon" : "sun",
          rightText: isDark ? "Dark" : "Light",
          onPress: handleToggleTheme,
        },
      ],
    },
    {
      title: "FINANCIAL HUB",
      items: [
        {
          id: "accounts",
          label: "Accounts & Wallets",
          subtitle: "Manage bank, cash & wallet balances",
          icon: "credit-card",
          rightText: `${accounts.length}`,
          onPress: () => router.push("/(root)/(tabs)/Accounts"),
        },
        {
          id: "transactions",
          label: "Transaction Ledger",
          subtitle: "Search & audit full transaction history",
          icon: "list",
          onPress: () => router.push("/(root)/(tabs)/Transactions"),
        },
        {
          id: "budgets",
          label: "Budgets & Spending Limits",
          subtitle: "Monthly envelopes & velocity targets",
          icon: "pie-chart",
          rightText: `${budgets.length}`,
          onPress: () => router.push("/(root)/(tabs)/budgets"),
        },
        {
          id: "splits",
          label: "People, Splits & Loans",
          subtitle: "Shared bills, IOUs & settlements",
          icon: "users",
          onPress: () => router.push("/(root)/(tabs)/Splits"),
        },
        {
          id: "categories",
          label: "Spending Categories",
          subtitle: "Create or remove custom categories",
          icon: "grid",
          rightText: `${categories.length}`,
          onPress: () => setCategoriesModalOpen(true),
        },
      ],
    },
    {
      title: "DATA, SYNC & SECURITY",
      items: [
        {
          id: "sync",
          label: syncing ? "Syncing Ledger..." : "Sync & Refresh Ledger",
          subtitle: "Re-verify balances & cloud records",
          icon: "refresh-cw",
          onPress: handleSyncLedger,
        },
        {
          id: "export",
          label: "Export Ledger Data (CSV)",
          subtitle: "Download spreadsheet-safe ledger history",
          icon: "download",
          onPress: handleExportData,
        },
        {
          id: "check_updates",
          label: checkingUpdate ? "Checking Updates..." : "Check for App Updates",
          subtitle: "Download over-the-air improvements & fixes",
          icon: "download-cloud",
          onPress: handleCheckForUpdates,
        },
        {
          id: "clear_data",
          label: clearingData ? "Resetting Data..." : "Clear All Data (Start Over)",
          subtitle: "Wipe all transactions, splits & budgets to start fresh",
          icon: "rotate-ccw",
          isDestructive: true,
          onPress: handleClearAllData,
        },
        {
          id: "sign_out",
          label: "Sign Out",
          subtitle: "Log out of your current device session",
          icon: "log-out",
          isDestructive: true,
          onPress: handleSignOut,
        },
        {
          id: "delete_account",
          label: "Delete Account",
          subtitle: "Permanently erase profile & all ledger data",
          icon: "trash-2",
          isDestructive: true,
          onPress: handleDeleteAccount,
        },
      ],
    },
    {
      title: "SUPPORT & CREATOR",
      items: [
        {
          id: "donate",
          label: "Support Saldo Development",
          subtitle: "Tip via Ko-fi (Global) or Direct IBAN (Pakistan)",
          icon: "heart",
          rightText: "Donate",
          badgeColor: "primary",
          onPress: () => setDonationModalOpen(true),
        },
      ],
    },
    {
      title: "ABOUT SALDO",
      items: [
        {
          id: "architecture",
          label: "Ledger Integrity",
          subtitle: "Append-only double-entry accounting",
          icon: "shield",
          rightText: "Verified",
          badgeColor: "primary",
        },
        {
          id: "github",
          label: "GitHub Repository",
          subtitle: "Source code & release notes",
          icon: "github",
          onPress: () =>
            Linking.openURL("https://github.com/saldo-app/saldo").catch(() => {}),
        },
        {
          id: "version",
          label: "App Version",
          subtitle: "Production build",
          icon: "info",
          rightText: "v1.0.0",
        },
      ],
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top"]}>
      {/* ── 1. TOP HEADER BAR ── */}
      <Animated.View
        entering={FadeInDown.duration(260)}
        className="px-6 pt-3 pb-3 border-b border-surface-border bg-surface"
      >
        <Text className="text-xl font-black text-ink tracking-tight">
          Profile & Settings
        </Text>
        <Text className="text-xs font-medium text-ink-muted mt-0.5">
          Account settings, preferences & financial controls
        </Text>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 130,
          paddingTop: 16,
        }}
      >
        {/* ── 2. HERO PROFILE & PORTFOLIO SUMMARY CARD ── */}
        <Animated.View
          entering={FadeInDown.duration(320).delay(40)}
          className="bg-surface rounded-3xl p-5 border border-surface-border mb-6 shadow-2xs"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3.5 flex-1 mr-3">
              <View className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 items-center justify-center">
                <Text className="text-lg font-black text-primary">
                  {initials}
                </Text>
              </View>

              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text
                    className="text-base font-black text-ink tracking-tight"
                    numberOfLines={1}
                  >
                    {fullName}
                  </Text>
                </View>
                <Text
                  className="text-xs font-medium text-ink-muted mt-0.5"
                  numberOfLines={1}
                >
                  {email}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setEditProfileModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Edit profile details"
              className="px-3.5 py-2 rounded-xl bg-surface-muted border border-surface-border flex-row items-center gap-1.5 active:scale-95"
            >
              <Feather name="edit-2" size={12} color="#22C55E" />
              <Text className="text-xs font-bold text-ink">Edit</Text>
            </Pressable>
          </View>

          {/* 3-Column Financial Snapshot */}
          <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-surface-divider">
            <Pressable
              onPress={() => router.push("/(root)/(tabs)/Accounts")}
              className="flex-1 items-start active:opacity-75"
            >
              <Text className="text-[10px] font-bold uppercase tracking-wider text-ink-whisper">
                Net Worth
              </Text>
              <Text
                numberOfLines={1}
                className="text-sm font-black text-ink mt-0.5 tabular-nums"
              >
                {formatCurrency(totalNetWorth, currency)}
              </Text>
            </Pressable>

            <View className="w-[1px] h-7 bg-surface-divider mx-2" />

            <Pressable
              onPress={() => router.push("/(root)/(tabs)/Accounts")}
              className="flex-1 items-center active:opacity-75"
            >
              <Text className="text-[10px] font-bold uppercase tracking-wider text-ink-whisper">
                Accounts
              </Text>
              <Text className="text-sm font-black text-ink mt-0.5 tabular-nums">
                {accounts.length} Active
              </Text>
            </Pressable>

            <View className="w-[1px] h-7 bg-surface-divider mx-2" />

            <Pressable
              onPress={() => router.push("/(root)/(tabs)/budgets")}
              className="flex-1 items-end active:opacity-75"
            >
              <Text className="text-[10px] font-bold uppercase tracking-wider text-ink-whisper">
                Budgets
              </Text>
              <Text className="text-sm font-black text-ink mt-0.5 tabular-nums">
                {budgets.length} Set
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* ── 3. GROUPED SETTINGS SECTIONS ── */}
        {sections.map((section, sectionIdx) => (
          <Animated.View
            key={section.title}
            entering={FadeInDown.duration(320).delay(90 + sectionIdx * 55)}
            className="mb-6"
          >
            <Text className="text-[11px] font-black text-ink-whisper tracking-wider uppercase mb-2 px-1">
              {section.title}
            </Text>

            <View className="bg-surface rounded-3xl border border-surface-border overflow-hidden">
              {section.items.map((item, idx) => {
                const isDestructive = item.isDestructive;
                const isLast = idx === section.items.length - 1;

                return (
                  <Pressable
                    key={item.id}
                    onPress={item.onPress}
                    disabled={
                      !item.onPress ||
                      loggingOut ||
                      (item.id === "check_updates" && checkingUpdate)
                    }
                    accessibilityRole={item.onPress ? "button" : "none"}
                    className={`flex-row items-center justify-between px-4 py-3.5 active:bg-surface-muted ${
                      !isLast ? "border-b border-surface-divider" : ""
                    }`}
                  >
                    <View className="flex-row items-center gap-3.5 flex-1 mr-3">
                      <View
                        className={`w-10 h-10 rounded-2xl border items-center justify-center ${
                          isDestructive
                            ? "bg-coral/10 border-coral/25"
                            : "bg-surface-muted border-surface-border"
                        }`}
                      >
                        <Feather
                          name={item.icon}
                          size={17}
                          color={
                            isDestructive
                              ? "#EF4444"
                              : item.badgeColor === "primary"
                                ? "#22C55E"
                                : isDark
                                  ? "#F5F5F3"
                                  : "#0A0A0B"
                          }
                        />
                      </View>

                      <View className="flex-1">
                        <Text
                          className={`text-sm font-bold ${
                            isDestructive ? "text-coral" : "text-ink"
                          }`}
                        >
                          {item.label}
                        </Text>
                        {item.subtitle && (
                          <Text
                            numberOfLines={1}
                            className="text-[11px] font-medium text-ink-muted mt-0.5"
                          >
                            {item.subtitle}
                          </Text>
                        )}
                      </View>
                    </View>

                    {isDestructive && loggingOut ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : item.id === "sync" && syncing ? (
                      <ActivityIndicator size="small" color="#22C55E" />
                    ) : item.id === "check_updates" && checkingUpdate ? (
                      <ActivityIndicator size="small" color="#22C55E" />
                    ) : item.rightText ? (
                      <View className="flex-row items-center gap-1.5">
                        <View
                          className={`px-2.5 py-1 rounded-xl border ${
                            item.badgeColor === "primary"
                              ? "bg-primary/10 border-primary/30"
                              : "bg-surface-muted border-surface-border"
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              item.badgeColor === "primary"
                                ? "text-primary"
                                : "text-ink"
                            }`}
                          >
                            {item.rightText}
                          </Text>
                        </View>
                        {item.onPress ? (
                          <Feather
                            name="chevron-right"
                            size={15}
                            color="#A0A0A3"
                          />
                        ) : null}
                      </View>
                    ) : item.onPress ? (
                      <Feather
                        name="chevron-right"
                        size={15}
                        color="#A0A0A3"
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      {/* ── MODAL 1: EDIT PERSONAL DETAILS ── */}
      <Modal
        visible={editProfileModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEditProfileModalOpen(false)}
      >
        <Pressable
          onPress={() => setEditProfileModalOpen(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-surface rounded-t-[32px] p-6 pb-10 border-t border-surface-border"
          >
            <View className="flex-row items-center justify-between pb-4 border-b border-surface-divider">
              <View>
                <Text className="text-base font-extrabold text-ink tracking-tight">
                  Personal Details
                </Text>
                <Text className="text-xs text-ink-muted mt-0.5">
                  Update your display name & view account info
                </Text>
              </View>
              <Pressable
                onPress={() => setEditProfileModalOpen(false)}
                hitSlop={8}
                className="w-8 h-8 rounded-full bg-surface-muted border border-surface-border items-center justify-center active:scale-95"
              >
                <Feather name="x" size={16} color="#6B6B6E" />
              </Pressable>
            </View>

            <View className="gap-3.5 mt-4">
              <View>
                <Text className="text-[11px] font-bold uppercase tracking-wider text-ink-whisper mb-1.5">
                  First Name
                </Text>
                <TextInput
                  value={firstNameInput}
                  onChangeText={setFirstNameInput}
                  placeholder="First name"
                  placeholderTextColor="#A0A0A3"
                  className="h-12 px-4 rounded-2xl bg-surface-muted border border-surface-border text-sm font-bold text-ink"
                />
              </View>

              <View>
                <Text className="text-[11px] font-bold uppercase tracking-wider text-ink-whisper mb-1.5">
                  Last Name
                </Text>
                <TextInput
                  value={lastNameInput}
                  onChangeText={setLastNameInput}
                  placeholder="Last name (optional)"
                  placeholderTextColor="#A0A0A3"
                  className="h-12 px-4 rounded-2xl bg-surface-muted border border-surface-border text-sm font-bold text-ink"
                />
              </View>

              <View>
                <Text className="text-[11px] font-bold uppercase tracking-wider text-ink-whisper mb-1.5">
                  Registered Email
                </Text>
                <View className="h-12 px-4 rounded-2xl bg-surface-muted border border-surface-border flex-row items-center justify-between opacity-75">
                  <Text className="text-sm font-semibold text-ink-muted">
                    {email}
                  </Text>
                  <Feather name="lock" size={14} color="#A0A0A3" />
                </View>
              </View>

              <Pressable
                onPress={handleSaveProfile}
                disabled={savingProfile}
                className="w-full h-13 rounded-2xl bg-primary items-center justify-center mt-2 active:scale-98 disabled:opacity-50"
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-sm font-black text-white">
                    Save Changes
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── MODAL 2: DEFAULT PAYMENT ACCOUNT PICKER ── */}
      <Modal
        visible={defaultAccountModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDefaultAccountModalOpen(false)}
      >
        <Pressable
          onPress={() => setDefaultAccountModalOpen(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-surface rounded-t-[32px] p-6 pb-10 max-h-[75%] border-t border-surface-border"
          >
            <View className="flex-row items-center justify-between pb-4 border-b border-surface-divider">
              <View>
                <Text className="text-base font-extrabold text-ink tracking-tight">
                  Default Payment Account
                </Text>
                <Text className="text-xs text-ink-muted mt-0.5">
                  Automatically selected when adding new transactions
                </Text>
              </View>
              <Pressable
                onPress={() => setDefaultAccountModalOpen(false)}
                hitSlop={8}
                className="w-8 h-8 rounded-full bg-surface-muted border border-surface-border items-center justify-center active:scale-95"
              >
                <Feather name="x" size={16} color="#6B6B6E" />
              </Pressable>
            </View>

            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              <View className="gap-2.5">
                {accounts.map((acc) => {
                  const isDefault = defaultAccount?.id === acc.id;
                  return (
                    <Pressable
                      key={acc.id}
                      onPress={async () => {
                        try {
                          await setDefaultAccountMutation.mutateAsync(acc.id);
                          setDefaultAccountModalOpen(false);
                        } catch (err: unknown) {
                          await alert({
                            title: "Could Not Set Default",
                            message: getErrorMessage(err),
                            variant: "warning",
                          });
                        }
                      }}
                      className={`flex-row items-center justify-between p-4 rounded-2xl border ${
                        isDefault
                          ? "bg-primary/10 border-primary"
                          : "bg-surface-muted border-surface-border"
                      } active:scale-[0.99]`}
                    >
                      <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 rounded-xl bg-surface border border-surface-border items-center justify-center">
                          <Ionicons
                            name={
                              acc.type === "cash"
                                ? "cash-outline"
                                : acc.type === "wallet"
                                  ? "wallet-outline"
                                  : "card-outline"
                            }
                            size={18}
                            color={isDefault ? "#22C55E" : "#6B6B6E"}
                          />
                        </View>
                        <View>
                          <Text className="text-sm font-bold text-ink">
                            {acc.name}
                          </Text>
                          <Text className="text-xs text-ink-muted capitalize">
                            {acc.type} • {formatCurrency(acc.balance, acc.currency)}
                          </Text>
                        </View>
                      </View>

                      {isDefault && (
                        <View className="px-2.5 py-1 rounded-full bg-primary">
                          <Text className="text-[10px] font-black text-white uppercase">
                            Default
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── MODAL 3: CATEGORIES MANAGER MODAL ── */}
      <Modal
        visible={categoriesModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCategoriesModalOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-canvas">
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-surface-border bg-surface">
            <View>
              <Text className="text-base font-extrabold text-ink">
                Spending Categories
              </Text>
              <Text className="text-xs text-ink-muted">
                {categories.length} active ledger categories
              </Text>
            </View>

            <Pressable
              onPress={() => setCategoriesModalOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close categories"
              hitSlop={12}
              className="w-10 h-10 rounded-full bg-surface-muted border border-surface-border items-center justify-center active:scale-95"
            >
              <Feather name="x" size={18} color="#6B6B6E" />
            </Pressable>
          </View>

          {/* Add New Category Bar */}
          <View className="px-5 pt-4 pb-2 flex-row items-center gap-2">
            <Pressable
              onPress={() => setIconPickerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Select category icon"
              className="w-12 h-12 rounded-2xl bg-surface border border-surface-border items-center justify-center active:scale-95"
            >
              <CategoryIcon icon={newCategoryIcon} size={22} color="#22C55E" />
            </Pressable>
            <TextInput
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="New category name..."
              placeholderTextColor="#A0A0A3"
              returnKeyType="done"
              onSubmitEditing={handleCreateCategory}
              className="flex-1 h-12 px-4 rounded-2xl bg-surface border border-surface-border text-xs font-bold text-ink"
            />
            <Pressable
              onPress={handleCreateCategory}
              disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Add category"
              className="h-12 px-5 rounded-2xl bg-primary items-center justify-center active:scale-95 disabled:opacity-40"
            >
              {createCategoryMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-xs font-black text-white">
                  Add
                </Text>
              )}
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 40,
            }}
          >
            <View className="gap-2.5">
              {categories.map((cat) => (
                <View
                  key={cat.id}
                  className="p-3.5 rounded-2xl bg-surface border border-surface-border flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3.5 flex-1 mr-2">
                    <View className="w-11 h-11 rounded-2xl bg-surface-muted border border-surface-border items-center justify-center">
                      <CategoryIcon icon={cat.icon} size={20} color="#22C55E" />
                    </View>
                    <View className="flex-1">
                      <Text
                        numberOfLines={1}
                        className="text-sm font-bold text-ink"
                      >
                        {cat.name}
                      </Text>
                      <Text className="text-xs text-ink-muted">
                        {cat.is_default ? "Default Category" : "Custom Category"}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => handleDeleteCategory(cat)}
                    disabled={deleteCategoryMutation.isPending}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${cat.name} category`}
                    className="w-10 h-10 rounded-xl bg-coral/10 border border-coral/25 items-center justify-center active:scale-95"
                  >
                    <Feather name="trash-2" size={15} color="#EF4444" />
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>

          <CategoryIconPickerModal
            visible={iconPickerOpen}
            selectedIcon={newCategoryIcon}
            onSelect={(icon) => setNewCategoryIcon(icon)}
            onClose={() => setIconPickerOpen(false)}
          />
        </SafeAreaView>
      </Modal>

      {/* ── MODAL 4: CURRENCY PICKER MODAL ── */}
      <CurrencyPicker
        visible={currencyPickerOpen}
        selectedCode={currency}
        onSelect={async (entry) => {
          setCurrency(entry.code);
          setCurrencyPickerOpen(false);
          if (user?.id) {
            const nowIso = new Date().toISOString();
            const [{ error: profileErr }, { error: accountsErr }] =
              await Promise.all([
                supabase.from("profiles").upsert(
                  {
                    id: user.id,
                    email,
                    name: fullName,
                    currency: entry.code,
                    updated_at: nowIso,
                  },
                  { onConflict: "id" },
                ),
                supabase
                  .from("accounts")
                  .update({
                    currency: entry.code,
                    updated_at: nowIso,
                  })
                  .eq("user_id", user.id),
              ]);

            await invalidateLedgerQueries(queryClient, user.id);

            const syncError = profileErr || accountsErr;
            if (syncError) {
              await alert({
                title: "Currency Sync Error",
                message: getErrorMessage(syncError),
                variant: "warning",
              });
            }
          }
        }}
        onClose={() => setCurrencyPickerOpen(false)}
      />

      {/* ── MODAL 5: DONATION / SUPPORT MODAL (KO-FI & PAKISTANI IBAN) ── */}
      <DonationModal
        visible={donationModalOpen}
        onClose={() => setDonationModalOpen(false)}
      />

      {/* ── MODAL 6: MONTH START MODE / ROLLOVER MODAL ── */}
      <MonthStartModeModal
        visible={monthStartModalOpen}
        onClose={() => setMonthStartModalOpen(false)}
        currentMode={monthStartMode}
        onSelectMode={(mode) => setMonthStartMode(mode)}
        onStartNewMonthNow={handleStartNewMonthNow}
      />
    </SafeAreaView>
  );
}
