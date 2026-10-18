import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CategoryBreakdownChart,
  DailyTrendChart,
  DiagnosticsCard,
  TopExpensesList,
  useAnalyticsData,
  type AnalyticsPeriod,
} from "@features/analytics";
import { formatCurrency } from "@shared/lib/currency";
import { ErrorState } from "@shared/ui/ErrorState";

const PERIOD_OPTIONS: Array<{ key: AnalyticsPeriod; label: string }> = [
  { key: "this_month", label: "This Month" },
  { key: "last_30_days", label: "30 Days" },
  { key: "last_month", label: "Last Month" },
  { key: "all_time", label: "All Time" },
];

export default function AnalyticsScreen() {
  const router = useRouter();
  const {
    period,
    setPeriod,
    selectedAccountId,
    setSelectedAccountId,
    accounts,
    summary,
    isLoading,
    isError,
    refetch,
  } = useAnalyticsData();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const selectedAccountName = selectedAccountId
    ? accounts.find((a) => a.id === selectedAccountId)?.name || "Selected Account"
    : "All Accounts";

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={["top"]}
    >
      {/* 1. Header Bar */}
      <View className="flex-row items-center justify-between px-6 pt-3 pb-2 bg-transparent">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/(root)/(tabs)")
            }
            accessibilityRole="button"
            accessibilityLabel="Back to home"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="w-10 h-10 rounded-full bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-border-dark items-center justify-center active:scale-95 shadow-2xs"
          >
            <Feather name="arrow-left" size={18} color="#64748B" />
          </Pressable>

          <View>
            <Text className="text-xl font-black text-ink dark:text-ink-light tracking-tight">
              Analytics
            </Text>
            <Text className="text-[10px] font-semibold text-ink-whisper dark:text-ink-whisper-dark">
              Financial Diagnosis & Health
            </Text>
          </View>
        </View>

        {/* Quick View Ledger Button */}
        <Pressable
          onPress={() => router.push("/(root)/(tabs)/Transactions")}
          accessibilityRole="button"
          accessibilityLabel="View full transaction ledger"
          className="h-9 px-3.5 rounded-full bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-border-dark flex-row items-center gap-1.5 active:scale-95 shadow-2xs"
        >
          <Feather name="list" size={14} color="#64748B" />
          <Text className="text-xs font-bold text-ink dark:text-ink-light">
            Ledger
          </Text>
        </Pressable>
      </View>

      {/* 2. Period Filter Chips */}
      <View className="pt-2 pb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
        >
          {PERIOD_OPTIONS.map((opt) => {
            const isActive = period === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setPeriod(opt.key)}
                accessibilityRole="button"
                accessibilityLabel={`Select period ${opt.label}`}
                className={`px-4 py-2 rounded-full border active:scale-95 shadow-2xs ${
                  isActive
                    ? "bg-primary border-primary"
                    : "bg-surface dark:bg-surface-dark border-surface-border dark:border-surface-border-dark"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isActive
                      ? "text-white"
                      : "text-ink-muted dark:text-ink-muted-dark"
                  }`}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Account Filter Pills (If more than 1 account exists) */}
      {accounts.length > 1 && (
        <View className="pb-3">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 6 }}
          >
            <Pressable
              onPress={() => setSelectedAccountId(null)}
              className={`px-3 py-1 rounded-full border active:scale-95 ${
                selectedAccountId === null
                  ? "bg-ink dark:bg-ink-light border-ink dark:border-ink-light"
                  : "bg-surface dark:bg-surface-dark border-surface-border dark:border-surface-border-dark"
              }`}
            >
              <Text
                className={`text-[10px] font-bold ${
                  selectedAccountId === null
                    ? "text-canvas dark:text-canvas-dark font-black"
                    : "text-ink-muted dark:text-ink-muted-dark"
                }`}
              >
                All Accounts
              </Text>
            </Pressable>

            {accounts.map((acc) => {
              const isSelected = selectedAccountId === acc.id;
              return (
                <Pressable
                  key={acc.id}
                  onPress={() => setSelectedAccountId(isSelected ? null : acc.id)}
                  className={`px-3 py-1 rounded-full border active:scale-95 ${
                    isSelected
                      ? "bg-ink dark:bg-ink-light border-ink dark:border-ink-light"
                      : "bg-surface dark:bg-surface-dark border-surface-border dark:border-surface-border-dark"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      isSelected
                        ? "text-canvas dark:text-canvas-dark font-black"
                        : "text-ink-muted dark:text-ink-muted-dark"
                    }`}
                  >
                    {acc.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* 3. Main Analytics Scroll View */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#22C55E" />
          <Text className="text-xs font-semibold text-ink-muted dark:text-ink-muted-dark mt-3">
            Computing financial analytics...
          </Text>
        </View>
      ) : isError ? (
        <View className="px-6 pt-6">
          <ErrorState
            title="Analytics Unavailable"
            message="Could not calculate financial analytics. Please pull to refresh."
            onRetry={handleRefresh}
          />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#22C55E"
            />
          }
        >
          {/* Executive Cashflow & Savings Card */}
          <View className="mx-5 mb-4 bg-surface dark:bg-surface-dark rounded-3xl p-5 border border-surface-border dark:border-surface-border-dark shadow-2xs">
            {/* Top row */}
            <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-surface-divider dark:border-surface-border-dark">
              <View>
                <Text className="text-[10px] font-black uppercase text-ink-whisper dark:text-ink-whisper-dark tracking-wider">
                  Net Cashflow
                </Text>
                <Text
                  className={`text-2xl font-black tracking-tight tabular-nums mt-0.5 ${
                    summary.netSavings >= 0
                      ? "text-emerald-600 dark:text-primary"
                      : "text-coral"
                  }`}
                >
                  {summary.netSavings >= 0 ? "+" : ""}
                  {formatCurrency(summary.netSavings, summary.currency)}
                </Text>
              </View>

              {/* Savings Rate Badge */}
              <View className="items-end">
                <Text className="text-[10px] font-black uppercase text-ink-whisper dark:text-ink-whisper-dark tracking-wider">
                  Savings Rate
                </Text>
                <View className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 mt-0.5">
                  <Text className="text-xs font-black text-primary tabular-nums">
                    {summary.savingsRate}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Inflow vs Outflow Mini Pillars */}
            <View className="flex-row items-center gap-3">
              {/* Income */}
              <View className="flex-1 p-3 rounded-2xl bg-surface-muted dark:bg-surface-muted-dark border border-surface-border dark:border-surface-border-dark">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <View className="w-4 h-4 rounded-full bg-emerald-500/15 items-center justify-center">
                    <Feather name="arrow-down-left" size={10} color="#16A34A" />
                  </View>
                  <Text className="text-[9px] font-bold text-ink-whisper dark:text-ink-whisper-dark uppercase">
                    Inflow
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  className="text-sm font-black text-emerald-600 dark:text-primary tabular-nums"
                >
                  +{formatCurrency(summary.totalIncome, summary.currency)}
                </Text>
              </View>

              {/* Expenses */}
              <View className="flex-1 p-3 rounded-2xl bg-surface-muted dark:bg-surface-muted-dark border border-surface-border dark:border-surface-border-dark">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <View className="w-4 h-4 rounded-full bg-coral/15 items-center justify-center">
                    <Feather name="arrow-up-right" size={10} color="#EF4444" />
                  </View>
                  <Text className="text-[9px] font-bold text-ink-whisper dark:text-ink-whisper-dark uppercase">
                    Outflow
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  className="text-sm font-black text-coral tabular-nums"
                >
                  -{formatCurrency(summary.totalExpenses, summary.currency)}
                </Text>
              </View>
            </View>

            {/* Daily Burn Rate Footer */}
            <View className="mt-3 pt-3 border-t border-surface-divider dark:border-surface-border-dark flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="speedometer-outline" size={14} color="#64748B" />
                <Text className="text-xs font-semibold text-ink-muted dark:text-ink-muted-dark">
                  Daily Burn Rate:
                </Text>
              </View>
              <Text className="text-xs font-black text-ink dark:text-ink-light tabular-nums">
                {formatCurrency(summary.dailyAvgSpend, summary.currency)}/day
              </Text>
            </View>
          </View>

          {/* 4. Automated Diagnostics ("What's Going Wrong") */}
          <DiagnosticsCard
            insights={summary.insights}
            currency={summary.currency}
          />

          {/* 5. Category Breakdown with Visual Ribbon */}
          <CategoryBreakdownChart
            categories={summary.categoryBreakdown}
            totalExpenses={summary.totalExpenses}
            currency={summary.currency}
          />

          {/* 6. 7-Day Spending Velocity Histogram */}
          <DailyTrendChart
            trend={summary.dailyTrend}
            currency={summary.currency}
          />

          {/* 7. Largest Single Outflows */}
          <TopExpensesList
            expenses={summary.largestExpenses}
            currency={summary.currency}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

