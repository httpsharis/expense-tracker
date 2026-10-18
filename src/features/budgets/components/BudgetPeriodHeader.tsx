import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { BudgetPeriodHeaderProps } from "../types";

export function BudgetPeriodHeader({
  activeDate,
  daysRemaining,
  onAddBudget,
}: BudgetPeriodHeaderProps) {
  const monthLabel = activeDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <View className="flex-row items-center justify-between px-6 pt-3 pb-3 bg-white border-b border-[#E4E7EC]">
      <View>
        <Text className="text-xl font-black text-[#090D16] tracking-tight">
          Budgets
        </Text>
        <Text className="text-xs font-semibold text-[#64748B] mt-0.5">
          {monthLabel} Cycle
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EDE9FE] border border-[#DDD6FE]">
          <Feather name="clock" size={12} color="#6366F1" />
          <Text className="text-[11px] font-bold text-[#6366F1]">
            {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
          </Text>
        </View>

        <Pressable
          onPress={onAddBudget}
          accessibilityRole="button"
          accessibilityLabel="Add new budget cap"
          className="h-9 px-3 rounded-full bg-[#090D16] flex-row items-center gap-1.5 shadow-xs active:opacity-85"
        >
          <Feather name="plus" size={15} color="#D4F938" />
          <Text className="text-xs font-bold text-white">Add</Text>
        </Pressable>
      </View>
    </View>
  );
}
