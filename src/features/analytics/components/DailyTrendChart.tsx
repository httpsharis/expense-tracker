import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Text, View } from "react-native";

import { formatCurrency } from "@shared/lib/currency";
import type { DaySpendItem } from "../types";

export interface DailyTrendChartProps {
  trend: DaySpendItem[];
  currency: string;
}

export function DailyTrendChart({ trend, currency }: DailyTrendChartProps) {
  const maxAmount = Math.max(...trend.map((d) => d.amount), 1);

  return (
    <View className="mx-5 mb-4 bg-surface dark:bg-surface-dark rounded-3xl p-5 border border-surface-border dark:border-surface-border-dark shadow-2xs">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-surface-divider dark:border-surface-border-dark">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-full bg-blue-500/10 items-center justify-center">
            <Feather name="bar-chart-2" size={16} color="#3B82F6" />
          </View>
          <View>
            <Text className="text-sm font-black text-ink dark:text-ink-light tracking-tight">
              7-Day Spend Velocity
            </Text>
            <Text className="text-[10px] font-semibold text-ink-whisper dark:text-ink-whisper-dark">
              Daily Distribution
            </Text>
          </View>
        </View>

        <Text className="text-[10px] font-black text-ink-muted dark:text-ink-muted-dark uppercase tracking-wider">
          Peak: {formatCurrency(maxAmount, currency)}
        </Text>
      </View>

      {/* Histogram Bars */}
      <View className="h-32 flex-row items-end justify-between pt-2 pb-1 px-1">
        {trend.map((day) => {
          const heightPercent = Math.max(Math.round((day.amount / maxAmount) * 100), 4);
          const isPeak = day.amount === maxAmount && maxAmount > 0;

          return (
            <View key={day.date} className="flex-1 items-center gap-1.5 h-full justify-end">
              {/* Optional Amount Tooltip */}
              {day.amount > 0 && (
                <Text
                  numberOfLines={1}
                  className={`text-[8px] font-bold tabular-nums ${
                    isPeak ? "text-primary" : "text-ink-whisper dark:text-ink-whisper-dark"
                  }`}
                >
                  {day.amount >= 1000
                    ? `${Math.round(day.amount / 1000)}k`
                    : Math.round(day.amount)}
                </Text>
              )}

              {/* Bar Fill */}
              <View className="w-5/6 max-w-[28px] h-20 justify-end rounded-t-lg bg-surface-muted dark:bg-surface-muted-dark overflow-hidden">
                <View
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-lg ${
                    isPeak
                      ? "bg-primary"
                      : day.amount > 0
                      ? "bg-emerald-500/50 dark:bg-primary/50"
                      : "bg-surface-border dark:bg-surface-border-dark"
                  }`}
                />
              </View>

              {/* Day Label */}
              <Text
                className={`text-[10px] font-bold ${
                  isPeak
                    ? "text-primary font-black"
                    : "text-ink-muted dark:text-ink-muted-dark"
                }`}
              >
                {day.dayLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

