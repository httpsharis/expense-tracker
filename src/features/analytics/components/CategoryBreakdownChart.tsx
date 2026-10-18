import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Text, View } from "react-native";

import { CategoryIcon } from "@shared/components/CategoryIcon";
import { formatCurrency } from "@shared/lib/currency";
import type { CategorySpendBreakdown } from "../types";

export interface CategoryBreakdownChartProps {
  categories: CategorySpendBreakdown[];
  totalExpenses: number;
  currency: string;
}

export function CategoryBreakdownChart({
  categories,
  totalExpenses,
  currency,
}: CategoryBreakdownChartProps) {
  if (categories.length === 0) {
    return (
      <View className="mx-5 mb-4 bg-surface dark:bg-surface-dark rounded-3xl p-5 border border-surface-border dark:border-surface-border-dark shadow-2xs items-center justify-center py-8">
        <Text className="text-xs font-semibold text-ink-muted dark:text-ink-muted-dark">
          No category expenses recorded in this period.
        </Text>
      </View>
    );
  }

  return (
    <View className="mx-5 mb-4 bg-surface dark:bg-surface-dark rounded-3xl p-5 border border-surface-border dark:border-surface-border-dark shadow-2xs">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3 pb-3 border-b border-surface-divider dark:border-surface-border-dark">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
            <Feather name="pie-chart" size={16} color="#22C55E" />
          </View>
          <View>
            <Text className="text-sm font-black text-ink dark:text-ink-light tracking-tight">
              Spending Breakdown
            </Text>
            <Text className="text-[10px] font-semibold text-ink-whisper dark:text-ink-whisper-dark">
              Category Distribution & Volume
            </Text>
          </View>
        </View>

        <Text className="text-xs font-black text-ink dark:text-ink-light tabular-nums">
          {formatCurrency(totalExpenses, currency)}
        </Text>
      </View>

      {/* Proportional Stacked Color Ribbon */}
      <View className="w-full h-3 rounded-full overflow-hidden flex-row bg-surface-muted dark:bg-surface-muted-dark mb-4">
        {categories.map((cat) => {
          if (cat.percentage <= 0) return null;
          return (
            <View
              key={cat.id}
              style={{
                width: `${Math.max(cat.percentage, 2)}%`,
                backgroundColor: cat.color,
              }}
              className="h-full"
            />
          );
        })}
      </View>

      {/* Category List */}
      <View className="gap-3">
        {categories.map((cat) => (
          <View key={cat.id} className="gap-1.5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                <View
                  style={{ backgroundColor: `${cat.color}20` }}
                  className="w-7 h-7 rounded-xl items-center justify-center"
                >
                  <CategoryIcon icon={cat.icon} size={14} color={cat.color} />
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text
                      numberOfLines={1}
                      className="text-xs font-bold text-ink dark:text-ink-light"
                    >
                      {cat.name}
                    </Text>
                    {cat.isOverBudget && (
                      <View className="px-1.5 py-0.2 rounded bg-coral/10 border border-coral/30">
                        <Text className="text-[8px] font-black text-coral">
                          OVER
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-[10px] text-ink-whisper dark:text-ink-whisper-dark">
                    {cat.count} {cat.count === 1 ? "transaction" : "transactions"}
                  </Text>
                </View>
              </View>

              <View className="items-end">
                <Text className="text-xs font-black text-ink dark:text-ink-light tabular-nums">
                  {formatCurrency(cat.amount, currency)}
                </Text>
                <Text
                  style={{ color: cat.color }}
                  className="text-[10px] font-black tabular-nums"
                >
                  {cat.percentage}%
                </Text>
              </View>
            </View>

            {/* Individual Progress Track */}
            <View className="w-full h-1.5 rounded-full bg-surface-muted dark:bg-surface-muted-dark overflow-hidden">
              <View
                style={{
                  width: `${Math.min(cat.percentage, 100)}%`,
                  backgroundColor: cat.color,
                }}
                className="h-full rounded-full"
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
