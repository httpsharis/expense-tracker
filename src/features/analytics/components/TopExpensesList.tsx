import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Text, View } from "react-native";

import { formatCurrency } from "@shared/lib/currency";

export interface TopExpensesListProps {
  expenses: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    categoryName: string;
    accountName: string;
  }>;
  currency: string;
}

export function TopExpensesList({ expenses, currency }: TopExpensesListProps) {
  if (expenses.length === 0) return null;

  return (
    <View className="mx-5 mb-8 bg-surface dark:bg-surface-dark rounded-3xl p-5 border border-surface-border dark:border-surface-border-dark shadow-2xs">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3 pb-3 border-b border-surface-divider dark:border-surface-border-dark">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-full bg-purple-500/10 items-center justify-center">
            <Feather name="trending-down" size={16} color="#8B5CF6" />
          </View>
          <View>
            <Text className="text-sm font-black text-ink dark:text-ink-light tracking-tight">
              Largest Single Outflows
            </Text>
            <Text className="text-[10px] font-semibold text-ink-whisper dark:text-ink-whisper-dark">
              Significant Impact Purchases
            </Text>
          </View>
        </View>

        <Text className="text-[10px] font-black text-ink-muted dark:text-ink-muted-dark uppercase tracking-wider">
          Top {expenses.length}
        </Text>
      </View>

      <View className="gap-2.5">
        {expenses.map((item, index) => (
          <View
            key={item.id}
            className="flex-row items-center justify-between py-2 px-3 rounded-2xl bg-surface-muted/60 dark:bg-surface-muted-dark/50"
          >
            <View className="flex-row items-center gap-2.5 flex-1 mr-2">
              <View className="w-6 h-6 rounded-full bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-border-dark items-center justify-center">
                <Text className="text-[10px] font-black text-ink-whisper dark:text-ink-whisper-dark">
                  #{index + 1}
                </Text>
              </View>

              <View className="flex-1">
                <Text
                  numberOfLines={1}
                  className="text-xs font-bold text-ink dark:text-ink-light"
                >
                  {item.description}
                </Text>
                <Text className="text-[10px] text-ink-whisper dark:text-ink-whisper-dark">
                  {item.categoryName} • {item.accountName}
                </Text>
              </View>
            </View>

            <View className="items-end">
              <Text className="text-xs font-black text-coral tabular-nums">
                -{formatCurrency(item.amount, currency)}
              </Text>
              <Text className="text-[9px] text-ink-whisper dark:text-ink-whisper-dark">
                {item.date.slice(0, 10)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

