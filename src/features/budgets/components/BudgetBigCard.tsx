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
    timePercent,
    pacingStatus,
    category,
    account,
  } = item;

  const progressWidth = Math.min(percent, 100);
  const progressBarColor = isExceeded
    ? "#D4F938"
    : percent >= 90
    ? "#F59E0B"
    : "#090D16";

  const pacingBadge = isExceeded
    ? {
        label: "Exceeded",
        bg: "bg-[#D4F938]",
        text: "text-[#090D16]",
        border: "border-[#C5EB27]",
      }
    : pacingStatus === "warning"
    ? {
        label: "Pacing High",
        bg: "bg-amber-50",
        text: "text-amber-800",
        border: "border-amber-200",
      }
    : pacingStatus === "under"
    ? {
        label: "Under Budget",
        bg: "bg-emerald-50",
        text: "text-emerald-800",
        border: "border-emerald-200",
      }
    : {
        label: "On Track",
        bg: "bg-[#F4F5F7]",
        text: "text-[#090D16]",
        border: "border-[#E4E7EC]",
      };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${name} budget details`}
      className="bg-white rounded-3xl p-5 mb-4 border border-[#E4E7EC] shadow-[0_8px_30px_rgba(9,13,22,0.06)] relative overflow-hidden active:scale-[0.99]"
    >
      {/* Top Accent Edge */}
      <View
        className={`absolute top-0 left-0 right-0 h-1.5 ${
          isExceeded ? "bg-[#D4F938]" : "bg-[#090D16]"
        }`}
      />

      {/* 1. Header Row: Scope Chip, Pacing Pill, Edit Affordance */}
      <View className="flex-row items-center justify-between mb-4 pt-1">
        <View className="flex-row items-center gap-2 flex-1 mr-2">
          {category ? (
            <View className="flex-row items-center gap-1.5 bg-[#F4F5F7] px-2.5 py-1 rounded-xl border border-[#E4E7EC] shadow-2xs">
              <Text className="text-xs">{category.icon || "🏷️"}</Text>
              <Text
                className="text-xs font-bold text-[#090D16]"
                numberOfLines={1}
              >
                {category.name}
              </Text>
            </View>
          ) : account ? (
            <View className="flex-row items-center gap-1.5 bg-[#F4F5F7] px-2.5 py-1 rounded-xl border border-[#E4E7EC] shadow-2xs">
              <Text className="text-xs">🏦</Text>
              <Text
                className="text-xs font-bold text-[#090D16]"
                numberOfLines={1}
              >
                {account.name}
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-1.5 bg-[#F4F5F7] px-2.5 py-1 rounded-xl border border-[#E4E7EC] shadow-2xs">
              <Text className="text-xs">🌐</Text>
              <Text className="text-xs font-bold text-[#090D16]">
                All Spending
              </Text>
            </View>
          )}

          <Text
            numberOfLines={1}
            className="text-xs font-semibold text-[#64748B] flex-1"
          >
            {name}
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <View
            className={`px-2.5 py-0.5 rounded-full border ${pacingBadge.bg} ${pacingBadge.border}`}
          >
            <Text
              className={`text-[10px] font-black uppercase tracking-wider ${pacingBadge.text}`}
            >
              {pacingBadge.label}
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
              className="w-8 h-8 rounded-full bg-[#F4F5F7] items-center justify-center active:scale-95 shadow-2xs"
            >
              <Feather name="edit-2" size={13} color="#090D16" />
            </Pressable>
          )}
        </View>
      </View>

      {/* 2. Main Tracking Hero Row */}
      <View className="flex-row items-end justify-between mb-4">
        <View className="flex-1 mr-2">
          <Text className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-0.5">
            Spent so far
          </Text>
          <Text className="text-3xl font-black text-[#090D16] tracking-tight tabular-nums">
            {formatCurrency(spent, currency, { maximumFractionDigits: 0 })}
          </Text>
          <Text className="text-xs font-medium text-[#64748B] mt-0.5">
            of {formatCurrency(amount, currency, { maximumFractionDigits: 0 })}{" "}
            limit
          </Text>
        </View>

        {/* Elevated Tactile Remaining / Overspend Card */}
        <View
          className={`px-3.5 py-2 rounded-2xl border shadow-2xs items-end ${
            isExceeded
              ? "bg-rose-50/90 border-rose-200/80"
              : "bg-emerald-50/90 border-emerald-200/80"
          }`}
        >
          <Text
            className={`text-[9px] font-bold uppercase tracking-wider ${
              isExceeded ? "text-rose-800/80" : "text-emerald-800/80"
            }`}
          >
            {isExceeded ? "Over Budget" : "Remaining"}
          </Text>
          <Text
            className={`text-lg font-black tracking-tight tabular-nums ${
              isExceeded ? "text-[#E11D48]" : "text-[#059669]"
            }`}
          >
            {isExceeded
              ? `+${formatCurrency(spent - amount, currency, { maximumFractionDigits: 0 })}`
              : formatCurrency(remaining, currency, {
                  maximumFractionDigits: 0,
                })}
          </Text>
          <Text
            className={`text-[10px] font-bold ${
              isExceeded ? "text-rose-700" : "text-emerald-700"
            }`}
          >
            {percent}% used
          </Text>
        </View>
      </View>

      {/* 3. Visual Tracking Progress Bar with Timeline Comparison */}
      <View className="mb-4">
        {/* Recessed Progress Track */}
        <View className="h-2.5 w-full bg-[#F0F2F6] rounded-full overflow-hidden border border-[#E2E5EA]/70 relative">
          <View
            style={{
              width: `${progressWidth}%`,
              backgroundColor: progressBarColor,
            }}
            className="h-full rounded-full"
          />
        </View>

        {/* Timeline Marker Indicator */}
        <View className="flex-row justify-between items-center mt-1.5 px-0.5">
          <Text className="text-[10px] font-medium text-[#64748B]">
            {periodLabel} ({timePercent}% of period passed)
          </Text>
          <Text className="text-[10px] font-bold text-[#090D16]">
            {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
          </Text>
        </View>
      </View>

      {/* 4. Tracking Metrics Elevated 3-Tile Dashboard */}
      <View className="flex-row items-center gap-2.5 pt-3 mt-1 border-t border-[#F4F5F7]">
        {/* Tile 1: Days Left */}
        <View className="flex-1 bg-[#F8F9FB] rounded-2xl p-2.5 border border-[#E4E7EC]/70 shadow-2xs">
          <View className="flex-row items-center gap-1 mb-0.5">
            <Feather name="clock" size={10} color="#64748B" />
            <Text className="text-[9px] font-bold text-[#64748B] uppercase">
              Days Left
            </Text>
          </View>
          <Text className="text-sm font-black text-[#090D16] tabular-nums">
            {daysRemaining}d{" "}
            <Text className="text-[10px] font-semibold text-[#94A3B8]">
              / {daysTotal}d
            </Text>
          </Text>
        </View>

        {/* Tile 2: Safe Daily Allowance */}
        <View className="flex-1 bg-[#F8F9FB] rounded-2xl p-2.5 border border-[#E4E7EC]/70 shadow-2xs">
          <View className="flex-row items-center gap-1 mb-0.5">
            <Feather
              name="zap"
              size={10}
              color={isExceeded ? "#E11D48" : "#059669"}
            />
            <Text className="text-[9px] font-bold text-[#64748B] uppercase">
              Daily Pace
            </Text>
          </View>
          <Text
            className={`text-sm font-black tabular-nums ${
              isExceeded ? "text-[#E11D48]" : "text-[#090D16]"
            }`}
          >
            {isExceeded
              ? "0/d"
              : `${formatCurrency(safeDailySpend, currency, { maximumFractionDigits: 0 })}/d`}
          </Text>
        </View>

        {/* Tile 3: Activity Entries */}
        <View className="flex-1 bg-[#F8F9FB] rounded-2xl p-2.5 border border-[#E4E7EC]/70 shadow-2xs">
          <View className="flex-row items-center gap-1 mb-0.5">
            <Feather name="activity" size={10} color="#64748B" />
            <Text className="text-[9px] font-bold text-[#64748B] uppercase">
              Activity
            </Text>
          </View>
          <Text className="text-sm font-black text-[#090D16] tabular-nums">
            {matchingTransactionCount}{" "}
            <Text className="text-[10px] font-semibold text-[#94A3B8]">
              {matchingTransactionCount === 1 ? "entry" : "entries"}
            </Text>
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
