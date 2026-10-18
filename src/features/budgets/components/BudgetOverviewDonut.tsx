import React from "react";
import { Text, View } from "react-native";
import { PieChart } from "react-native-gifted-charts";

import { formatCurrency } from "@shared/lib/currency";

export interface DonutSlice {
  value: number;
  color: string;
  label?: string;
  name?: string;
}

interface BudgetOverviewDonutProps {
  data: DonutSlice[];
  totalSpent: number;
  totalBudget: number;
  currency?: string;
}

export function BudgetOverviewDonut({
  data,
  totalSpent,
  totalBudget,
  currency = "USD",
}: BudgetOverviewDonutProps) {
  // If no spending or empty dataset, render subtle empty ring
  const hasData = totalSpent > 0 && data.some((d) => d.value > 0);
  const chartData = hasData
    ? data.filter((d) => d.value > 0)
    : [{ value: 1, color: "#E2E8F0" }];

  return (
    <View className="items-center justify-center py-2">
      <PieChart
        data={chartData}
        donut
        radius={88}
        innerRadius={68}
        innerCircleColor="#FFFFFF"
        centerLabelComponent={() => (
          <View className="items-center justify-center px-2">
            <Text className="text-[10px] font-bold text-[#64748B] tracking-wider uppercase">
              Total Spent
            </Text>
            <Text
              className="text-base font-black text-[#0F172A] tabular-nums mt-0.5"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCurrency(totalSpent, currency, { maximumFractionDigits: 0 })}
            </Text>
            <Text
              className="text-[10px] font-semibold text-[#94A3B8] mt-0.5"
              numberOfLines={1}
            >
              of {formatCurrency(totalBudget, currency, { maximumFractionDigits: 0 })}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
