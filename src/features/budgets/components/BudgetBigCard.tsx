import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { formatCurrency } from "@shared/lib/currency";
import type { BudgetWithDerived } from "../types";

export interface BudgetBigCardProps {
  item: BudgetWithDerived;
  currency?: string;
  onPress: () => void;
  onEdit?: () => void;
}

export function BudgetBigCard({
  item,
  currency = "PKR",
  onPress,
  onEdit,
}: BudgetBigCardProps) {
  const {
    name,
    amount,
    spent,
    remaining,
    percent,
    isExceeded,
    periodLabel,
    matchingTransactionCount,
    daysRemaining,
    daysTotal,
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
      accessibilityLabel={`View ${name} budget details`}
      className="bg-surface rounded-3xl p-5 mb-4 border border-surface-border shadow-2xs overflow-hidden active:scale-[0.99]"
    >
      {/* 1. TOP ROW: Accent Dot + Scope / Budget Title + Month Pill & Edit Action */}
      <View className="flex-row items-center justify-between mb-3.5">
        <View className="flex-row items-center gap-2 flex-1 mr-2">
          <View
            className={`w-2.5 h-2.5 rounded-full ${
              isExceeded ? "bg-coral" : percent >= 85 ? "bg-amber-500" : "bg-emerald-600 dark:bg-primary"
            }`}
          />
          <Text
            numberOfLines={1}
            className="text-xs font-black uppercase tracking-wider text-[#525866] dark:text-ink-muted"
          >
            {category ? `${category.name.toUpperCase()} BUDGET` : account ? `${account.name.toUpperCase()} BUDGET` : `${name.toUpperCase()}`}
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          {/* Period Pill Badge */}
          <View className="px-3.5 py-1 rounded-full bg-[#EEF2F6] dark:bg-surface-muted border border-surface-border">
            <Text className="text-xs font-bold text-[#344054] dark:text-ink">
              {periodLabel}
            </Text>
          </View>

          {onEdit && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Edit budget"
              className="w-8 h-8 rounded-full bg-[#EEF2F6] dark:bg-surface-muted border border-surface-border items-center justify-center active:scale-95"
            >
              <Feather name="edit-2" size={13} color="#64748B" />
            </Pressable>
          )}
        </View>
      </View>

      {/* 2. SPENT HERO READOUT + PERCENT LEFT PILL */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-baseline flex-1 mr-2 flex-wrap">
          <Text className="text-2xl sm:text-3xl font-black text-ink tracking-tight tabular-nums">
            {formatCurrency(spent, currency, { maximumFractionDigits: 0 })}
          </Text>
          <Text className="text-sm font-semibold text-[#667085] dark:text-ink-muted ml-1.5">
            spent of {formatCurrency(amount, currency, { maximumFractionDigits: 0 })}
          </Text>
        </View>

        {/* Status Pill Badge: Mint if remaining, Coral if exceeded */}
        <View
          className={`px-3 py-1 rounded-full border ${
            isExceeded
              ? "bg-[#FEF3F2] dark:bg-rose-950/40 border-rose-500/25"
              : "bg-[#E8F7EE] dark:bg-emerald-950/40 border-emerald-500/25"
          }`}
        >
          <Text
            className={`text-xs font-black tabular-nums ${
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
      <View className="h-2 w-full bg-[#EAECF0] dark:bg-surface-muted rounded-full overflow-hidden my-3.5">
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

      {/* 4. PACING & DAYS REMAINING SUB-ROW */}
      <View className="flex-row items-center justify-between pb-1">
        <View className="flex-row items-center gap-1.5 flex-1 mr-2">
          <Feather
            name={isExceeded ? "alert-circle" : "check-circle"}
            size={14}
            color={isExceeded ? "#EF4444" : "#0D6B3A"}
          />
          <Text
            numberOfLines={1}
            className={`text-xs font-bold ${
              isExceeded
                ? "text-coral"
                : "text-[#0D6B3A] dark:text-emerald-400"
            }`}
          >
            {isExceeded
              ? `Exceeded limit by ${formatCurrency(spent - amount, currency, { maximumFractionDigits: 0 })}`
              : `${percent}% spent · ${formatCurrency(safeDailySpend, currency, { maximumFractionDigits: 0 })}/day safe pace`}
          </Text>
        </View>

        <Text className="text-xs font-semibold text-[#667085] dark:text-ink-muted tabular-nums">
          {daysRemaining} {daysRemaining === 1 ? "day remains" : "days remain"}
        </Text>
      </View>

      {/* 5. 3-TILE METRICS DASHBOARD DECK */}
      <View className="flex-row items-center gap-2.5 mt-3.5 pt-3.5 border-t border-surface-divider">
        {/* Tile 1: Days Left */}
        <View className="flex-1 bg-[#F8FAFC] dark:bg-surface-muted rounded-2xl p-3 border border-surface-border">
          <View className="flex-row items-center gap-1 mb-1">
            <Feather name="clock" size={11} color="#64748B" />
            <Text className="text-[10px] font-bold text-[#64748B] dark:text-ink-muted uppercase">
              Days Left
            </Text>
          </View>
          <Text className="text-sm font-black text-ink tabular-nums">
            {daysRemaining}d{" "}
            <Text className="text-[10px] font-semibold text-[#94A3B8] dark:text-ink-whisper">
              / {daysTotal}d
            </Text>
          </Text>
        </View>

        {/* Tile 2: Safe Daily Allowance */}
        <View className="flex-1 bg-[#F8FAFC] dark:bg-surface-muted rounded-2xl p-3 border border-surface-border">
          <View className="flex-row items-center gap-1 mb-1">
            <Feather
              name="zap"
              size={11}
              color={isExceeded ? "#EF4444" : "#0D6B3A"}
            />
            <Text className="text-[10px] font-bold text-[#64748B] dark:text-ink-muted uppercase">
              Daily Pace
            </Text>
          </View>
          <Text
            className={`text-sm font-black tabular-nums ${
              isExceeded ? "text-coral" : "text-ink"
            }`}
          >
            {isExceeded
              ? "0/d"
              : `${formatCurrency(safeDailySpend, currency, { maximumFractionDigits: 0 })}/d`}
          </Text>
        </View>

        {/* Tile 3: Activity Entries */}
        <View className="flex-1 bg-[#F8FAFC] dark:bg-surface-muted rounded-2xl p-3 border border-surface-border">
          <View className="flex-row items-center gap-1 mb-1">
            <Feather name="activity" size={11} color="#64748B" />
            <Text className="text-[10px] font-bold text-[#64748B] dark:text-ink-muted uppercase">
              Activity
            </Text>
          </View>
          <Text className="text-sm font-black text-ink tabular-nums">
            {matchingTransactionCount}{" "}
            <Text className="text-[10px] font-semibold text-[#94A3B8] dark:text-ink-whisper">
              {matchingTransactionCount === 1 ? "entry" : "entries"}
            </Text>
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
