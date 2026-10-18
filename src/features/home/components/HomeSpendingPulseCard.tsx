import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { formatCurrency } from "@shared/lib/currency";

export interface HomeSpendingPulseCardProps {
  monthlyIncome: number;
  monthlyExpenses: number;
  currency: string;
  topOverBudgetCategory?: string;
  overBudgetAmount?: number;
  savingsRate: number;
  onOpenAnalytics: () => void;
}

export function HomeSpendingPulseCard({
  monthlyIncome,
  monthlyExpenses,
  currency,
  topOverBudgetCategory,
  overBudgetAmount,
  savingsRate,
  onOpenAnalytics,
}: HomeSpendingPulseCardProps) {
  const hasOverbudget = Boolean(topOverBudgetCategory && (overBudgetAmount ?? 0) > 0);

  return (
    <Pressable
      onPress={onOpenAnalytics}
      accessibilityRole="button"
      accessibilityLabel="View detailed financial analytics and charts"
      className="mx-5 mb-4 bg-surface dark:bg-surface-dark rounded-3xl p-4 border border-surface-border dark:border-surface-border-dark shadow-2xs active:scale-98"
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <View
            className={`w-7 h-7 rounded-xl items-center justify-center ${
              hasOverbudget ? "bg-coral/15" : "bg-primary/10"
            }`}
          >
            <Feather
              name={hasOverbudget ? "alert-triangle" : "trending-up"}
              size={15}
              color={hasOverbudget ? "#EF4444" : "#22C55E"}
            />
          </View>
          <View>
            <Text className="text-xs font-black text-ink dark:text-ink-light tracking-tight">
              {hasOverbudget ? "Spending Alert" : "Financial Pulse"}
            </Text>
            <Text className="text-[10px] font-semibold text-ink-whisper dark:text-ink-whisper-dark">
              {hasOverbudget
                ? `${topOverBudgetCategory} is over target`
                : `${savingsRate}% Monthly Savings Rate`}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-1">
          <Text className="text-xs font-bold text-primary">
            Analytics
          </Text>
          <Feather name="chevron-right" size={13} color="#22C55E" />
        </View>
      </View>

      {/* Progress / Pulse Ribbon */}
      <View className="mt-1 pt-2.5 border-t border-surface-divider dark:border-surface-border-dark flex-row items-center justify-between">
        <Text className="text-[11px] text-ink-muted dark:text-ink-muted-dark flex-1 mr-2">
          {hasOverbudget
            ? `Exceeded by ${formatCurrency(overBudgetAmount || 0, currency)}. Tap to inspect diagnostics.`
            : monthlyExpenses === 0
            ? "No expenses logged this cycle yet. Tap to view trends."
            : `Outflow: ${formatCurrency(monthlyExpenses, currency)} of ${formatCurrency(monthlyIncome, currency)} earned.`}
        </Text>

        <View className="px-2.5 py-0.5 rounded-full bg-surface-muted dark:bg-surface-muted-dark border border-surface-border dark:border-surface-border-dark">
          <Text className="text-[10px] font-black text-ink dark:text-ink-light tabular-nums">
            Charts & Reports
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

