import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { formatCurrency } from "@shared/lib/currency";
import type { BudgetCardProps } from "../types";

export function BudgetCard({
  item,
  currency = "PKR",
  onPress,
  onEdit,
}: BudgetCardProps) {
  const {
    name,
    amount,
    spent,
    remaining,
    percent,
    isExceeded,
    periodLabel,
    daysRemaining,
    safeDailySpend,
    category,
    account,
  } = item;

  const displayPercent = Math.min(percent, 100);
  const percentLeft = Math.max(0, 100 - percent);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View details for ${name} budget`}
      className="bg-surface rounded-2xl p-4 mb-3 border border-surface-border shadow-2xs overflow-hidden active:scale-[0.99]"
    >
      {/* 1. TOP ROW: Indicator Dot + Title/Scope + Period Badge + Edit Button */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2 flex-1 mr-2">
          <View
            className={`w-2 h-2 rounded-full ${
              isExceeded
                ? "bg-coral"
                : percent >= 85
                ? "bg-amber-500"
                : "bg-emerald-600 dark:bg-primary"
            }`}
          />
          <Text
            numberOfLines={1}
            className="text-xs font-black uppercase tracking-wider text-[#525866] dark:text-ink-muted"
          >
            {category?.name || account?.name || name}
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <View className="px-2.5 py-0.5 rounded-full bg-[#EEF2F6] dark:bg-surface-muted border border-surface-border">
            <Text className="text-[11px] font-bold text-[#344054] dark:text-ink">
              {periodLabel}
            </Text>
          </View>

          {onEdit && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${name} budget`}
              className="w-7 h-7 rounded-full bg-[#EEF2F6] dark:bg-surface-muted border border-surface-border items-center justify-center active:scale-95"
            >
              <Feather name="edit-2" size={12} color="#64748B" />
            </Pressable>
          )}
        </View>
      </View>

      {/* 2. SPENT HERO READOUT + PERCENT LEFT BADGE */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-baseline flex-1 mr-2 flex-wrap">
          <Text className="text-xl sm:text-2xl font-black text-ink tracking-tight tabular-nums">
            {formatCurrency(spent, currency, { maximumFractionDigits: 0 })}
          </Text>
          <Text className="text-xs font-semibold text-[#667085] dark:text-ink-muted ml-1.5">
            spent of {formatCurrency(amount, currency, { maximumFractionDigits: 0 })}
          </Text>
        </View>

        {/* Pill Badge: Mint if remaining, Coral if exceeded */}
        <View
          className={`px-2.5 py-0.5 rounded-full border ${
            isExceeded
              ? "bg-[#FEF3F2] dark:bg-rose-950/40 border-rose-500/25"
              : "bg-[#E8F7EE] dark:bg-emerald-950/40 border-emerald-500/25"
          }`}
        >
          <Text
            className={`text-[11px] font-black tabular-nums ${
              isExceeded
                ? "text-[#B42318] dark:text-rose-400"
                : "text-[#0D6B3A] dark:text-emerald-400"
            }`}
          >
            {isExceeded ? `+${percent - 100}% over` : `${percentLeft}% left`}
          </Text>
        </View>
      </View>

      {/* 3. SMOOTH PROGRESS BAR */}
      <View className="h-1.5 w-full bg-[#EAECF0] dark:bg-surface-muted rounded-full overflow-hidden my-3">
        <View
          style={{ width: `${displayPercent}%` }}
          className={`h-full rounded-full ${
            isExceeded
              ? "bg-coral"
              : percent >= 85
              ? "bg-amber-500"
              : "bg-emerald-500"
          }`}
        />
      </View>

      {/* 4. PACING & REMAINING DAYS SUB-ROW */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5 flex-1 mr-2">
          <Feather
            name={isExceeded ? "alert-circle" : "check-circle"}
            size={13}
            color={isExceeded ? "#EF4444" : "#0D6B3A"}
          />
          <Text
            numberOfLines={1}
            className={`text-[11px] font-bold ${
              isExceeded
                ? "text-coral"
                : "text-[#0D6B3A] dark:text-emerald-400"
            }`}
          >
            {isExceeded
              ? `Exceeded limit by ${formatCurrency(spent - amount, currency, { maximumFractionDigits: 0 })}`
              : `${percent}% spent · ${formatCurrency(safeDailySpend, currency, { maximumFractionDigits: 0 })}/d safe`}
          </Text>
        </View>

        <Text className="text-[11px] font-semibold text-[#667085] dark:text-ink-muted tabular-nums">
          {daysRemaining} {daysRemaining === 1 ? "day left" : "days left"}
        </Text>
      </View>
    </Pressable>
  );
}
