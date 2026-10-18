import { memo } from "react";
import { Pressable, Text, View } from "react-native";

import { formatCurrency } from "@shared/lib/currency";
import type { TransactionRowItemProps } from "../types";

function TransactionRowItemComponent({
  item,
  onPress,
}: TransactionRowItemProps) {
  const isPositive = item.amount > 0;

  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.categoryName}, ${item.amount > 0 ? "Income" : "Expense"} of ${Math.abs(item.amount)} ${item.currency}`}
      className="bg-white rounded-2xl p-3.5 border border-[#E4E7EC] shadow-2xs active:scale-[0.99] active:bg-[#F9FAFC]"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1 mr-3">
          <View className="w-11 h-11 rounded-xl bg-[#F4F5F7] border border-[#E4E7EC]/80 items-center justify-center">
            <Text className="text-lg">{item.categoryIcon || "🏷️"}</Text>
          </View>
          <View className="flex-1">
            <Text
              numberOfLines={1}
              className="text-sm font-bold text-[#090D16] tracking-tight"
            >
              {item.name}
            </Text>
            <View className="flex-row items-center gap-1.5 mt-0.5">
              <Text className="text-xs font-medium text-[#64748B]">
                {item.categoryName}
              </Text>
              <Text className="text-[10px] text-[#94A3B8]">·</Text>
              <Text className="text-xs font-semibold text-[#64748B]">
                {item.accountName}
              </Text>
            </View>
          </View>
        </View>

        <View className="items-end">
          <Text
            className={`text-sm font-black tracking-tight tabular-nums ${
              isPositive ? "text-[#059669]" : "text-[#090D16]"
            }`}
          >
            {formatCurrency(item.amount, item.currency, {
              showPositivePrefix: true,
            })}
          </Text>
          <Text className="text-[10px] font-semibold text-[#94A3B8] mt-0.5">
            {item.dateStr}
          </Text>
        </View>
      </View>

      {item.note ? (
        <View className="mt-2 pt-2 border-t border-[#F2F4F7]">
          <Text numberOfLines={1} className="text-xs text-[#64748B]">
            {item.note}
          </Text>
        </View>
      ) : null}
    </Pressable>

  );
}

export const TransactionRowItem = memo(TransactionRowItemComponent);
