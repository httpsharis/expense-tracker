import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { formatCurrency } from "@shared/lib/currency";
import { BudgetHeroCardProps } from "../types";

export function BudgetHeroCard({
  metrics,
  currency = "PKR",
  activeFilter,
  onSelectFilter,
}: BudgetHeroCardProps) {
  const {
    totalExpenseBudget,
    totalExpenseSpent,
    remainingExpenseBudget,
    overallExpensePercent,
    isOverallWarning,
    isOverallExceeded,
    expenseCount,
    totalSavingsTarget,
    totalSavingsSaved,
    savingsPercent,
    savingsCount,
    safeDailySpend,
    totalCount,
  } = metrics;

  // Empty state when user hasn't set any budget yet
  if (totalCount === 0) {
    return (
      <View className="bg-white rounded-3xl p-6 border border-[#E4E7EC] shadow-xs mb-4">
        <View className="flex-row items-center gap-3">
          <View className="w-12 h-12 rounded-2xl bg-[#EDE9FE] items-center justify-center">
            <Feather name="target" size={24} color="#6366F1" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-black text-[#090D16] tracking-tight">
              No budgets configured
            </Text>
            <Text className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
              Set monthly spending limits for expenses and monthly savings targets to reach your financial goals.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const expenseStatusColor = isOverallExceeded
    ? "#E11D48"
    : isOverallWarning
      ? "#D97706"
      : "#059669";

  const expenseStatusBg = isOverallExceeded
    ? "bg-rose-50 border-rose-200"
    : isOverallWarning
      ? "bg-amber-50 border-amber-200"
      : "bg-emerald-50 border-emerald-200";

  const expenseStatusText = isOverallExceeded
    ? "text-rose-700"
    : isOverallWarning
      ? "text-amber-700"
      : "text-emerald-700";

  const expenseStatusLabel = isOverallExceeded
    ? "Over budget"
    : isOverallWarning
      ? "Near limit"
      : "On track";

  const expenseFillWidth = Math.min(overallExpensePercent, 100);
  const savingsFillWidth = Math.min(savingsPercent, 100);

  return (
    <View className="mb-4">
      {/* 1. Filter Chips (All, Spending, Savings) */}
      <View className="flex-row items-center gap-2 mb-3">
        <Pressable
          onPress={() => onSelectFilter("all")}
          accessibilityRole="button"
          accessibilityLabel="Show all budgets"
          className={`px-3.5 py-1.5 rounded-full border active:scale-98 ${
            activeFilter === "all"
              ? "bg-[#090D16] border-[#090D16]"
              : "bg-white border-[#E4E7EC]"
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              activeFilter === "all" ? "text-white" : "text-[#525866]"
            }`}
          >
            All ({totalCount})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onSelectFilter("expense")}
          accessibilityRole="button"
          accessibilityLabel="Show spending caps"
          className={`px-3.5 py-1.5 rounded-full border active:scale-98 ${
            activeFilter === "expense"
              ? "bg-[#090D16] border-[#090D16]"
              : "bg-white border-[#E4E7EC]"
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              activeFilter === "expense" ? "text-white" : "text-[#525866]"
            }`}
          >
            Spending caps ({expenseCount})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onSelectFilter("savings")}
          accessibilityRole="button"
          accessibilityLabel="Show savings goals"
          className={`px-3.5 py-1.5 rounded-full border active:scale-98 ${
            activeFilter === "savings"
              ? "bg-[#090D16] border-[#090D16]"
              : "bg-white border-[#E4E7EC]"
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              activeFilter === "savings" ? "text-white" : "text-[#525866]"
            }`}
          >
            Savings goals ({savingsCount})
          </Text>
        </Pressable>
      </View>

      {/* 2. Main Hero Card */}
      <View className="bg-white rounded-3xl p-5 border border-[#E4E7EC] shadow-xs">
        {/* A. Spending Section */}
        {totalExpenseBudget > 0 && (
          <View className={totalSavingsTarget > 0 ? "mb-5 pb-5 border-b border-[#F4F5F7]" : ""}>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-semibold text-[#64748B]">
                {isOverallExceeded ? "Total overspending" : "Remaining to spend"}
              </Text>

              <View className={`flex-row items-center gap-1.5 px-2.5 py-0.5 rounded-full border ${expenseStatusBg}`}>
                <View
                  style={{ backgroundColor: expenseStatusColor }}
                  className="w-1.5 h-1.5 rounded-full"
                />
                <Text className={`text-[10px] font-bold ${expenseStatusText}`}>
                  {expenseStatusLabel}
                </Text>
              </View>
            </View>

            <View className="flex-row items-baseline justify-between mb-3">
              <Text className="text-3xl font-black text-[#090D16] tracking-tight tabular-nums">
                {isOverallExceeded
                  ? formatCurrency(totalExpenseSpent - totalExpenseBudget, currency, { maximumFractionDigits: 0 })
                  : formatCurrency(remainingExpenseBudget, currency, { maximumFractionDigits: 0 })}
              </Text>
              <Text className="text-xs font-medium text-[#64748B] tabular-nums">
                of {formatCurrency(totalExpenseBudget, currency, { maximumFractionDigits: 0 })} cap
              </Text>
            </View>

            {/* Hairline Progress Bar */}
            <View className="h-2 w-full bg-[#F4F5F7] rounded-full overflow-hidden mb-2">
              <View
                style={{
                  width: `${expenseFillWidth}%`,
                  backgroundColor: expenseStatusColor,
                }}
                className="h-full rounded-full"
              />
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] font-semibold text-[#64748B] tabular-nums">
                Spent: {formatCurrency(totalExpenseSpent, currency, { maximumFractionDigits: 0 })}
              </Text>
              <Text className="text-[11px] font-black text-[#090D16] tabular-nums">
                {overallExpensePercent}% used
              </Text>
            </View>

            {/* Safe Daily Spend Velocity */}
            <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-[#F4F5F7]">
              <Text className="text-[11px] font-medium text-[#64748B]">
                Safe to spend per day
              </Text>
              <Text className="text-xs font-black text-[#090D16] tabular-nums">
                {formatCurrency(safeDailySpend, currency, { maximumFractionDigits: 0 })}
                <Text className="text-[10px] font-semibold text-[#64748B]"> / day</Text>
              </Text>
            </View>
          </View>
        )}

        {/* B. Savings Goals Section */}
        {totalSavingsTarget > 0 && (
          <View>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-semibold text-[#64748B]">
                Monthly savings progress
              </Text>
              <View className="flex-row items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                <Text className="text-[10px] font-bold text-emerald-700 tabular-nums">
                  {savingsPercent}% achieved
                </Text>
              </View>
            </View>

            <View className="flex-row items-baseline justify-between mb-3">
              <Text className="text-3xl font-black text-[#059669] tracking-tight tabular-nums">
                {formatCurrency(totalSavingsSaved, currency, { maximumFractionDigits: 0 })}
              </Text>
              <Text className="text-xs font-medium text-[#64748B] tabular-nums">
                of {formatCurrency(totalSavingsTarget, currency, { maximumFractionDigits: 0 })} target
              </Text>
            </View>

            {/* Savings Progress Bar */}
            <View className="h-2 w-full bg-[#F4F5F7] rounded-full overflow-hidden mb-2">
              <View
                style={{
                  width: `${savingsFillWidth}%`,
                  backgroundColor: "#059669",
                }}
                className="h-full rounded-full"
              />
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] font-medium text-[#64748B] tabular-nums">
                {totalSavingsSaved >= totalSavingsTarget
                  ? "Monthly target exceeded! 🎉"
                  : `${formatCurrency(totalSavingsTarget - totalSavingsSaved, currency, { maximumFractionDigits: 0 })} remaining to goal`}
              </Text>
              <Text className="text-[11px] font-bold text-[#059669] tabular-nums">
                {savingsCount} {savingsCount === 1 ? "goal" : "goals"}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
