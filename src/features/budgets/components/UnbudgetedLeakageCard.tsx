import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { formatCurrency } from "@shared/lib/currency";
import { UnbudgetedLeakageCardProps } from "../types";

export function UnbudgetedLeakageCard({
  unbudgetedList,
  currency = "PKR",
  onCapCategory,
}: UnbudgetedLeakageCardProps) {
  if (unbudgetedList.length === 0) return null;

  return (
    <View className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 mb-4">
      {/* Alert Header */}
      <View className="flex-row items-center gap-2 mb-1.5">
        <Feather name="alert-triangle" size={15} color="#D97706" />
        <Text className="text-xs font-black text-amber-900 tracking-tight">
          Unbudgeted spending detected
        </Text>
      </View>
      <Text className="text-[11px] text-amber-800 leading-4 mb-3">
        Expenses occurred in categories without a monthly target. Assign a limit to track them:
      </Text>

      {/* Categories Row List */}
      <View className="gap-2">
        {unbudgetedList.map((uncat) => (
          <View
            key={uncat.id}
            className="flex-row items-center justify-between bg-white/95 p-2.5 rounded-xl border border-amber-100"
          >
            <View className="flex-row items-center gap-2 flex-1 mr-2">
              <Text className="text-base">{uncat.icon || "🏷️"}</Text>
              <Text
                numberOfLines={1}
                className="text-xs font-bold text-[#090D16]"
              >
                {uncat.name}
              </Text>
            </View>

            <View className="flex-row items-center gap-2.5">
              <Text className="text-xs font-black text-rose-600 tabular-nums">
                {formatCurrency(uncat.spent, currency, { maximumFractionDigits: 0 })}
              </Text>

              <Pressable
                onPress={() => onCapCategory(uncat.id)}
                accessibilityRole="button"
                accessibilityLabel={`Set budget for ${uncat.name}`}
                className="bg-amber-100 px-2.5 py-1 rounded-lg active:bg-amber-200"
              >
                <Text className="text-[10px] font-bold text-amber-900">
                  + Cap it
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
