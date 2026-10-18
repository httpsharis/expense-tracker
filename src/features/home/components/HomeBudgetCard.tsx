import Feather from "@expo/vector-icons/Feather";
import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { formatCurrency } from "@shared/lib/currency";
import type { CategoryAllocation } from "../types";

export interface HomeBudgetCardProps {
  budgetName?: string;
  monthlyExpenses: number;
  totalBudget: number;
  remainingBudget?: number;
  budgetProgressPercent: number;
  dailyAllowance: number;
  daysRemaining: number;
  cycleMonthName: string;
  categoryAllocations?: CategoryAllocation[];
  activeCurrency: string;
  onOpenBudgets: () => void;
}

export function HomeBudgetCard({
  budgetName = "MONTHLY BUDGET",
  monthlyExpenses,
  totalBudget,
  remainingBudget,
  budgetProgressPercent,
  dailyAllowance,
  daysRemaining,
  cycleMonthName,
  categoryAllocations = [],
  activeCurrency,
  onOpenBudgets,
}: HomeBudgetCardProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Focused category when user taps a specific category
  const focusedCategory = useMemo(
    () =>
      selectedCategoryId
        ? categoryAllocations.find((c) => c.id === selectedCategoryId) ?? null
        : null,
    [selectedCategoryId, categoryAllocations],
  );

  const displayTitle = focusedCategory ? focusedCategory.name : budgetName;
  const displaySpent = focusedCategory ? focusedCategory.spent : monthlyExpenses;
  const displayLimit = focusedCategory ? focusedCategory.budget : totalBudget;
  const displayPercent = focusedCategory
    ? focusedCategory.percent
    : budgetProgressPercent;

  const percentLeft = Math.max(0, 100 - displayPercent);

  // Month date pill: e.g. "Oct 2026"
  const currentYear = new Date().getFullYear();
  const monthShort = cycleMonthName.slice(0, 3);
  const periodBadgeLabel = `${monthShort} ${currentYear}`;

  // Top 3 categories for the 3-column mini cards deck
  const topCategories = useMemo(() => {
    return [...categoryAllocations]
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 3);
  }, [categoryAllocations]);

  return (
    <View className="mx-5 my-2.5 bg-surface rounded-3xl p-5 border border-surface-border shadow-2xs">
      {/* 1. TOP ROW: Green Dot + Uppercase Section Header + Month Pill Badge */}
      <View className="flex-row items-center justify-between mb-3.5">
        <Pressable
          onPress={onOpenBudgets}
          accessibilityRole="button"
          accessibilityLabel={`Budget: ${displayTitle}. Tap to manage budgets.`}
          className="flex-row items-center gap-2 flex-1 mr-2 active:opacity-75"
        >
          <View className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-primary" />
          <Text
            numberOfLines={1}
            className="text-xs font-black uppercase tracking-wider text-[#525866] dark:text-ink-muted"
          >
            {focusedCategory ? `${focusedCategory.name.toUpperCase()} BUDGET` : "MONTHLY BUDGET"}
          </Text>
          {focusedCategory && (
            <Pressable
              onPress={() => setSelectedCategoryId(null)}
              hitSlop={6}
              className="ml-1 px-1.5 py-0.5 rounded-md bg-surface-muted border border-surface-border"
            >
              <Text className="text-[9px] font-bold text-ink-muted">All</Text>
            </Pressable>
          )}
        </Pressable>

        {/* Date Pill: e.g. Oct 2026 */}
        <View className="px-3.5 py-1 rounded-full bg-[#EEF2F6] dark:bg-surface-muted border border-surface-border">
          <Text className="text-xs font-bold text-[#344054] dark:text-ink">
            {periodBadgeLabel}
          </Text>
        </View>
      </View>

      {/* 2. SPENT READOUT + PERCENT LEFT PILL */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-baseline flex-1 mr-2 flex-wrap">
          <Text className="text-2xl sm:text-3xl font-black text-ink tracking-tight tabular-nums">
            {formatCurrency(displaySpent, activeCurrency)}
          </Text>
          <Text className="text-sm font-semibold text-[#667085] dark:text-ink-muted ml-1.5">
            spent of {formatCurrency(displayLimit, activeCurrency)}
          </Text>
        </View>

        {/* Status Badge: e.g. "35% left" */}
        <View className="px-3 py-1 rounded-full bg-[#E8F7EE] dark:bg-emerald-950/40 border border-emerald-500/25">
          <Text className="text-xs font-black text-[#0D6B3A] dark:text-emerald-400 tabular-nums">
            {percentLeft}% left
          </Text>
        </View>
      </View>

      {/* 3. SMOOTH PROGRESS BAR */}
      <View className="h-2 w-full bg-[#EAECF0] dark:bg-surface-muted rounded-full overflow-hidden my-3.5">
        <View
          style={{ width: `${Math.min(displayPercent, 100)}%` }}
          className={`h-full rounded-full ${
            displayPercent > 100
              ? "bg-coral"
              : displayPercent >= 85
              ? "bg-amber-500"
              : "bg-emerald-500"
          }`}
        />
      </View>

      {/* 4. PACING & DAYS REMAINING SUB-ROW */}
      <View className="flex-row items-center justify-between pb-1">
        <View className="flex-row items-center gap-1.5">
          <Feather
            name={displayPercent > 100 ? "alert-circle" : "check-circle"}
            size={14}
            color={displayPercent > 100 ? "#EF4444" : "#0D6B3A"}
          />
          <Text
            className={`text-xs font-bold ${
              displayPercent > 100
                ? "text-coral"
                : "text-[#0D6B3A] dark:text-emerald-400"
            }`}
          >
            {displayPercent}% spent · {formatCurrency(dailyAllowance, activeCurrency)}/day safe pace
          </Text>
        </View>

        <Text className="text-xs font-semibold text-[#667085] dark:text-ink-muted tabular-nums">
          {daysRemaining} days remain
        </Text>
      </View>

      {/* 5. 3-COLUMN CATEGORY BREAKDOWN MINI CARDS */}
      {topCategories.length > 0 && (
        <View className="flex-row items-center gap-2.5 mt-3.5 pt-3.5 border-t border-surface-divider">
          {topCategories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() =>
                  setSelectedCategoryId((prev) => (prev === cat.id ? null : cat.id))
                }
                accessibilityRole="button"
                accessibilityLabel={`${cat.name}: ${formatCurrency(cat.spent, activeCurrency)} spent`}
                className={`flex-1 p-3 rounded-2xl border active:scale-95 transition-all ${
                  isSelected
                    ? "bg-primary/10 border-primary"
                    : "bg-[#F8FAFC] dark:bg-surface-muted border-[#E2E8F0] dark:border-surface-border"
                }`}
              >
                <Text
                  numberOfLines={1}
                  className="text-[11px] font-bold text-[#64748B] dark:text-ink-muted"
                >
                  {cat.name}
                </Text>
                <Text className="text-sm font-black text-ink mt-1 tabular-nums">
                  {formatCurrency(cat.spent, activeCurrency)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
