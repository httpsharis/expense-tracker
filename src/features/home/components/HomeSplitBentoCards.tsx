import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { formatCurrency } from "@shared/lib/currency";

interface HomeSplitBentoCardsProps {
  totalOwedToMe: number;
  totalIOwe: number;
  pendingOwedCount: number;
  pendingDebtors: string[];
  activeCurrency: string;
  onOpenSplits: () => void;
  onSettleUp: () => void;
}

export function HomeSplitBentoCards({
  totalOwedToMe,
  totalIOwe,
  pendingOwedCount,
  activeCurrency,
  onOpenSplits,
  onSettleUp,
}: HomeSplitBentoCardsProps) {
  // If there are no open splits or debts, stay completely unobtrusive
  if (totalOwedToMe === 0 && totalIOwe === 0) {
    return null;
  }

  return (
    <Pressable
      onPress={totalIOwe > 0 ? onSettleUp : onOpenSplits}
      accessibilityRole="button"
      accessibilityLabel={`Shared tabs: Owed to you ${formatCurrency(totalOwedToMe, activeCurrency)}, You owe ${formatCurrency(totalIOwe, activeCurrency)}. Tap to view.`}
      className="mx-5 my-1.5 bg-surface dark:bg-surface-dark rounded-2xl p-4 border border-surface-border dark:border-surface-border-dark flex-row items-center justify-between active:scale-98 shadow-2xs"
    >
      <View className="flex-1 mr-3">
        <View className="flex-row items-center gap-1.5 mb-1">
          <Text className="text-xs font-bold text-ink dark:text-ink-light">
            Shared Tabs
          </Text>
          {pendingOwedCount > 0 && (
            <View className="px-1.5 py-0.5 rounded-full bg-surface-muted dark:bg-surface-muted-dark border border-surface-border dark:border-surface-border-dark">
              <Text className="text-[10px] font-bold text-ink-muted dark:text-ink-muted-dark">
                {pendingOwedCount} open
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row items-center gap-3">
          {totalOwedToMe > 0 && (
            <Text className="text-xs text-ink-muted dark:text-ink-muted-dark">
              Owed to you:{" "}
              <Text className="font-bold text-emerald-600 dark:text-primary">
                {formatCurrency(totalOwedToMe, activeCurrency)}
              </Text>
            </Text>
          )}
          {totalIOwe > 0 && (
            <Text className="text-xs text-ink-muted dark:text-ink-muted-dark">
              You owe:{" "}
              <Text className="font-bold text-coral">
                {formatCurrency(totalIOwe, activeCurrency)}
              </Text>
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-surface-muted dark:bg-surface-muted-dark border border-surface-border dark:border-surface-border-dark">
        <Text className="text-xs font-bold text-ink dark:text-ink-light">
          {totalIOwe > 0 ? "Settle" : "View"}
        </Text>
        <Feather name="chevron-right" size={13} color="#6B6B6E" />
      </View>
    </Pressable>
  );
}
