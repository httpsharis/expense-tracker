import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    Extrapolation,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    AccountSwitcherModal,
    DetailedTransactionItem,
    TransactionDetailModal,
    TransactionRowItem,
    useHomeScreenData,
} from "@features/home";
import { formatCurrency } from "@shared/lib/currency";
import { useUserStore } from "../../../store/userStore";

export default function HomeScreen() {
  const router = useRouter();
  const storeCurrency = useUserStore((s) => s.currency);

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<DetailedTransactionItem | null>(
    null,
  );

  const {
    userName,
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    currentAccount,
    activeBalance,
    totalBalance,
    activeCurrency,
    accountLabel,
    monthlyIncome,
    monthlyExpenses,
    totalBudget,
    remainingBudget,
    budgetProgressPercent,
    dailyAllowance,
    daysRemaining,
    cycleMonthName,
    feedTransactions,
    isLoading,
    onRefresh,
    refreshing,
  } = useHomeScreenData();

  // ── Contextual Greeting ──
  const greetingTime = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const currentDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });
  }, []);

  // ── Left-Edge Pull Tab for Accounts ──
  const pullDistance = useSharedValue(0);

  const navigateToAccounts = () => {
    router.push("/(root)/Accounts" as any);
  };

  const edgeGesture = Gesture.Pan()
    .hitSlop({ left: 0, width: 32 })
    .activeOffsetX(15)
    .failOffsetY([-20, 20])
    .onUpdate((event) => {
      if (event.translationX > 0) {
        pullDistance.value = Math.min(event.translationX * 0.5, 90);
      }
    })
    .onEnd((event) => {
      if (event.translationX > 65) {
        pullDistance.value = withTiming(0, { duration: 160 });
        runOnJS(navigateToAccounts)();
      } else {
        pullDistance.value = withSpring(0, {
          damping: 20,
          stiffness: 240,
        });
      }
    });

  const animatedDrawerTabStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      pullDistance.value,
      [0, 65],
      [-140, 0],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      pullDistance.value,
      [0, 20, 50],
      [0, 0.85, 1],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ translateX }],
    };
  });

  return (
    <GestureDetector gesture={edgeGesture}>
      <SafeAreaView className="flex-1 bg-[#F8F9FB]" edges={["top"]}>
        {/* Sleek edge drawer pull tab */}
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 0,
              top: 180,
              zIndex: 100,
            },
            animatedDrawerTabStyle,
          ]}
          pointerEvents="none"
        >
          <View className="flex-row items-center gap-2 pl-4 pr-5 py-3 bg-[#090D16] rounded-r-2xl shadow-xl border-r-2 border-y border-[#D4F938]">
            <Feather name="credit-card" size={15} color="#D4F938" />
            <Text className="text-xs font-bold text-white tracking-tight">
              Payment accounts
            </Text>
            <Feather name="arrow-right" size={12} color="#D4F938" />
          </View>
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#090D16"
            />
          }
        >
          {/* 1. QUIET TOP UTILITY ROW */}
          <View className="flex-row items-center justify-between px-6 pt-3 pb-1">
            <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E4E7EC] shadow-2xs">
              <View className="w-2 h-2 rounded-full bg-emerald-500" />
              <Text className="text-xs font-semibold text-[#525866]">
                {currentDateFormatted}
              </Text>
            </View>

            <Pressable
              onPress={() => router.push("/(root)/Accounts" as any)}
              accessibilityRole="button"
              accessibilityLabel="Manage accounts"
              className="flex-row items-center gap-1.5 h-9 px-3.5 rounded-full bg-white border border-[#E4E7EC] active:bg-[#F4F5F7] shadow-2xs"
            >
              <Feather name="credit-card" size={13} color="#090D16" />
              <Text className="text-xs font-semibold text-[#090D16]">
                Accounts
              </Text>
            </Pressable>
          </View>

          {/* 2. ELEVATED STUDIO VAULT BALANCE CARD */}
          <View className="mx-6 mt-4 mb-5 bg-white rounded-3xl p-6 border border-[#E4E7EC] shadow-[0_8px_30px_rgba(9,13,22,0.06)] relative overflow-hidden">
            {/* Top Row: Greeting & Account Filter Switcher */}
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-1 mr-2">
                <Text className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  {greetingTime}
                </Text>
                <Text
                  numberOfLines={1}
                  className="text-lg font-black text-[#090D16] tracking-tight mt-0.5"
                >
                  {userName}
                </Text>
              </View>

              <Pressable
                onPress={() => setAccountModalOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`Current filter: ${accountLabel}. Tap to change account.`}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F4F5F7] border border-[#E4E7EC] active:scale-97 shadow-2xs"
              >
                <View className="w-2 h-2 rounded-full bg-emerald-500" />
                <Text
                  numberOfLines={1}
                  className="text-xs font-bold text-[#090D16] max-w-[130px]"
                >
                  {accountLabel}
                </Text>
                <Feather name="chevron-down" size={13} color="#64748B" />
              </Pressable>
            </View>

            {/* Monumental Liquid Balance */}
            <View className="items-center py-2">
              <Text className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1">
                Available Liquid Balance
              </Text>
              {isLoading ? (
                <ActivityIndicator color="#090D16" className="my-4" />
              ) : (
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  className="text-5xl font-black text-[#090D16] text-center tracking-tight leading-none my-1 tabular-nums"
                >
                  {formatCurrency(activeBalance, activeCurrency)}
                </Text>
              )}
            </View>

            {/* Inflow & Outflow Tactile Micro-Pills */}
            <View className="flex-row items-center justify-center gap-2.5 pt-4 mt-2 border-t border-[#F4F5F7]">
              <View className="flex-1 flex-row items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-emerald-50/80 border border-emerald-100 shadow-2xs">
                <View className="w-5 h-5 rounded-full bg-emerald-500/15 items-center justify-center">
                  <Feather name="arrow-down-left" size={11} color="#059669" />
                </View>
                <View>
                  <Text className="text-[9px] font-bold text-emerald-800/70 uppercase">Inflow</Text>
                  <Text className="text-xs font-black text-emerald-700 tabular-nums">
                    {formatCurrency(monthlyIncome, activeCurrency, {
                      showPositivePrefix: true,
                    })}
                  </Text>
                </View>
              </View>

              <View className="flex-1 flex-row items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-rose-50/80 border border-rose-100 shadow-2xs">
                <View className="w-5 h-5 rounded-full bg-rose-500/15 items-center justify-center">
                  <Feather name="arrow-up-right" size={11} color="#E11D48" />
                </View>
                <View>
                  <Text className="text-[9px] font-bold text-rose-800/70 uppercase">Outflow</Text>
                  <Text className="text-xs font-black text-rose-700 tabular-nums">
                    {formatCurrency(-monthlyExpenses, activeCurrency, {
                      showSign: true,
                    })}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 3. TACTILE FLOATING ACTION STRIP */}
          <View className="px-6 mb-5">
            <View className="flex-row items-center gap-2.5">
              {/* Primary Add Expense CTA */}
              <Pressable
                onPress={() =>
                  router.push("/(root)/(tabs)/AddTransactions" as any)
                }
                accessibilityRole="button"
                accessibilityLabel="Record new expense"
                className="flex-[1.5] h-12 bg-[#090D16] rounded-2xl flex-row items-center justify-center gap-2 active:scale-98 shadow-sm border border-[#232838]"
              >
                <Feather name="plus" size={16} color="#D4F938" />
                <Text className="text-xs font-black text-white tracking-wide">
                  Add expense
                </Text>
              </Pressable>

              {/* Fast Scan Receipt */}
              <Pressable
                onPress={() =>
                  router.push("/(root)/(tabs)/AddTransactions" as any)
                }
                accessibilityRole="button"
                accessibilityLabel="Scan paper receipt"
                className="flex-1 h-12 bg-white rounded-2xl border border-[#E4E7EC] flex-row items-center justify-center gap-1.5 active:scale-98 shadow-xs"
              >
                <Ionicons name="scan-outline" size={16} color="#090D16" />
                <Text className="text-xs font-bold text-[#090D16]">
                  Scan
                </Text>
              </Pressable>

              {/* Fast Voice Entry */}
              <Pressable
                onPress={() => router.push("/(root)/(tabs)/Assistant" as any)}
                accessibilityRole="button"
                accessibilityLabel="Log expense with voice assistant"
                className="flex-1 h-12 bg-white rounded-2xl border border-[#E4E7EC] flex-row items-center justify-center gap-1.5 active:scale-98 shadow-xs"
              >
                <Ionicons name="mic-outline" size={16} color="#090D16" />
                <Text className="text-xs font-bold text-[#090D16]">
                  Voice
                </Text>
              </Pressable>
            </View>
          </View>

          {/* 4. CASHEW-STYLE VELOCITY & SAFE DAILY SPEND CARD */}
          <View className="px-6 mb-6">
            <Pressable
              onPress={() => router.push("/(root)/(tabs)/budgets" as any)}
              accessibilityRole="button"
              accessibilityLabel="View budget details"
              className="bg-white rounded-3xl p-5 border border-[#E4E7EC] shadow-[0_4px_20px_-4px_rgba(9,13,22,0.06)] active:scale-99"
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-1.5">
                  <View className="w-6 h-6 rounded-lg bg-[#090D16] items-center justify-center">
                    <Feather name="zap" size={13} color="#D4F938" />
                  </View>
                  <Text className="text-xs font-black text-[#090D16] uppercase tracking-wider">
                    Daily Spend Pace
                  </Text>
                </View>

                <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-[#F4F5F7] border border-[#E4E7EC]">
                  <Feather name="clock" size={11} color="#64748B" />
                  <Text className="text-[11px] font-bold text-[#64748B]">
                    {daysRemaining}d left in {cycleMonthName}
                  </Text>
                  <Feather name="chevron-right" size={12} color="#64748B" />
                </View>
              </View>

              {totalBudget > 0 ? (
                <>
                  <View className="flex-row items-baseline justify-between mt-1 mb-3">
                    <View>
                      <Text className="text-[10px] font-bold text-[#64748B] uppercase">Safe Daily Burn</Text>
                      <Text className="text-2xl font-black text-[#090D16] tracking-tight tabular-nums mt-0.5">
                        {formatCurrency(dailyAllowance, activeCurrency)}
                        <Text className="text-xs font-medium text-[#64748B]">
                          {" "}
                          / day
                        </Text>
                      </Text>
                    </View>

                    <View className="items-end">
                      <Text className="text-[10px] font-bold text-[#64748B] uppercase">Budget Used</Text>
                      <View className={`px-2 py-0.5 rounded-md mt-0.5 ${
                        budgetProgressPercent >= 90
                          ? "bg-[#D4F938]"
                          : budgetProgressPercent >= 75
                          ? "bg-amber-100"
                          : "bg-[#F4F5F7]"
                      }`}>
                        <Text className="text-xs font-black text-[#090D16] tabular-nums">
                          {budgetProgressPercent}%
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Clean Hairline Progress Track with Depth */}
                  <View className="h-2 w-full bg-[#F4F5F7] rounded-full overflow-hidden border border-[#E4E7EC]/60">
                    <View
                      style={{ width: `${Math.min(budgetProgressPercent, 100)}%` }}
                      className={`h-full rounded-full ${
                        budgetProgressPercent >= 100
                          ? "bg-[#D4F938]"
                          : budgetProgressPercent >= 80
                          ? "bg-[#F59E0B]"
                          : "bg-[#090D16]"
                      }`}
                    />
                  </View>
                </>
              ) : (
                <View className="py-2 flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-[#64748B]">
                    Set a spending limit to track live daily pacing.
                  </Text>
                  <View className="flex-row items-center gap-1 bg-[#090D16] px-3 py-1.5 rounded-full">
                    <Text className="text-xs font-bold text-white">Set target</Text>
                    <Feather name="arrow-right" size={11} color="#D4F938" />
                  </View>
                </View>
              )}
            </Pressable>
          </View>

          {/* 5. RECENT ACTIVITY (CLEAN LEDGER FEED) */}
          <View className="px-6">
            <View className="flex-row items-center justify-between mb-3.5">
              <Text className="text-base font-bold text-[#090D16] tracking-tight">
                Recent activity
              </Text>
              <Pressable
                onPress={() =>
                  router.push("/(root)/(tabs)/Transactions" as any)
                }
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="See all transactions"
              >
                <Text className="text-xs font-semibold text-[#64748B]">
                  See all
                </Text>
              </Pressable>
            </View>

            {isLoading ? (
              <View className="py-10 items-center justify-center">
                <ActivityIndicator color="#090D16" />
              </View>
            ) : feedTransactions.length === 0 ? (
              <View className="bg-white rounded-3xl p-8 border border-[#E4E7EC] items-center justify-center shadow-xs">
                <Ionicons name="receipt-outline" size={24} color="#94A3B8" />
                <Text className="text-sm font-bold text-[#090D16] mt-2.5">
                  No activity recorded
                </Text>
                <Text className="text-xs text-[#64748B] text-center mt-1 max-w-[220px]">
                  Tap 'Add expense' to log your first transaction.
                </Text>
              </View>
            ) : (
              <View className="gap-2.5">
                {feedTransactions.map((tx) => (
                  <TransactionRowItem
                    key={tx.id}
                    item={tx}
                    onPress={setSelectedTx}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Modals */}
        <TransactionDetailModal
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
        />

        <AccountSwitcherModal
          visible={accountModalOpen}
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          totalBalance={totalBalance}
          baseCurrency={storeCurrency || "PKR"}
          onSelectAccount={(accId) => setSelectedAccountId(accId)}
          onClose={() => setAccountModalOpen(false)}
        />
      </SafeAreaView>
    </GestureDetector>
  );
}
