import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { getBudgetThresholdStatus } from "@shared/lib/budgetCalculations";
import { formatCurrency } from "@shared/lib/currency";

export interface CategoryBudgetCardProps {
  id?: string;
  categoryId?: string;
  name: string;
  icon?: string | null;
  spent: number;
  cap: number;
  currency?: string;
  onPress?: () => void;
}

export function CategoryBudgetCard({
  name,
  icon,
  spent,
  cap,
  currency = "USD",
  onPress,
}: CategoryBudgetCardProps) {
  const { percent, isWarning, isExceeded, remaining, overspend } =
    getBudgetThresholdStatus(spent, cap);

  // Status-driven colors
  const statusColor = isExceeded
    ? "#EF4444"
    : isWarning
      ? "#F59E0B"
      : "#10B981";

  const statusBg = isExceeded
    ? "bg-rose-50 border-rose-200"
    : isWarning
      ? "bg-amber-50 border-amber-200"
      : "bg-emerald-50 border-emerald-200";

  const statusTextColor = isExceeded
    ? "text-rose-700"
    : isWarning
      ? "text-amber-700"
      : "text-emerald-700";

  const progressFillWidth = Math.min(percent, 100);

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-4 mb-2.5 border border-gray-100 shadow-xs active:opacity-90"
    >
      {/* Top Row: Category Meta & Status Pill */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-[#F8F9FB] border border-gray-100 items-center justify-center">
            <Text className="text-xl">{icon || "🏷️"}</Text>
          </View>
          <View>
            <Text className="text-sm font-extrabold text-[#0F172A] tracking-tight">
              {name}
            </Text>
            <Text className="text-xs text-[#64748B] mt-0.5">
              {formatCurrency(spent, currency, { maximumFractionDigits: 0 })}{" "}
              <Text className="text-[#94A3B8]">
                / {formatCurrency(cap, currency, { maximumFractionDigits: 0 })}
              </Text>
            </Text>
          </View>
        </View>

        <View className="items-end">
          <View className={`px-2.5 py-0.5 rounded-full border ${statusBg}`}>
            <Text className={`text-[10px] font-bold ${statusTextColor}`}>
              {isExceeded
                ? `+${formatCurrency(overspend, currency, { maximumFractionDigits: 0 })} over`
                : `${formatCurrency(remaining, currency, { maximumFractionDigits: 0 })} left`}
            </Text>
          </View>
          <Text className="text-[10px] font-bold text-[#94A3B8] mt-1">
            {percent}% used
          </Text>
        </View>
      </View>

      {/* Progress Track */}
      <View className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <View
          style={{
            width: `${progressFillWidth}%`,
            backgroundColor: statusColor,
          }}
          className="h-full rounded-full"
        />
      </View>

      {/* Micro Alert Notice if Over/Near Limit */}
      {(isWarning || isExceeded) && (
        <View className="flex-row items-center gap-1.5 mt-2">
          <Feather
            name="alert-circle"
            size={12}
            color={isExceeded ? "#EF4444" : "#F59E0B"}
          />
          <Text
            className={`text-[11px] font-medium ${
              isExceeded ? "text-rose-600" : "text-amber-600"
            }`}
          >
            {isExceeded
              ? "Exceeded assigned limit for this cycle"
              : "Spending pace has crossed 80% threshold"}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
