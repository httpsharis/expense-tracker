import Feather from "@expo/vector-icons/Feather";
import { useColorScheme } from "nativewind";
import React from "react";
import { Pressable, Text, View } from "react-native";

export interface HomeQuickDeckProps {
  onIncome: () => void;
  onExpense: () => void;
  onTransfer: () => void;
  onSplit: () => void;
  onScan: () => void;
}

export function HomeQuickDeck({
  onIncome,
  onExpense,
  onTransfer,
  onSplit,
  onScan,
}: HomeQuickDeckProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className="mx-5 mb-4 flex-row items-center gap-2">
      {/* 1. Income */}
      <Pressable
        onPress={onIncome}
        accessibilityRole="button"
        accessibilityLabel="Add income or deposit"
        className="flex-1 py-3 px-0.5 rounded-2xl bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-border-dark items-center justify-center active:scale-95 shadow-2xs"
      >
        <Feather name="arrow-down-left" size={18} color="#16A34A" />
        <Text className="text-[11px] font-bold text-ink dark:text-ink-light mt-1">
          Income
        </Text>
      </Pressable>

      {/* 2. Expense (Primary Green Action Button) */}
      <Pressable
        onPress={onExpense}
        accessibilityRole="button"
        accessibilityLabel="Add expense"
        className="flex-1 py-3 px-0.5 rounded-2xl bg-primary border border-primary items-center justify-center active:scale-95 shadow-xs"
      >
        <Feather
          name="arrow-up-right"
          size={18}
          color="#FFFFFF"
        />
        <Text className="text-[11px] font-black text-white mt-1">
          Expense
        </Text>
      </Pressable>

      {/* 3. Transfer */}
      <Pressable
        onPress={onTransfer}
        accessibilityRole="button"
        accessibilityLabel="Transfer funds between accounts"
        className="flex-1 py-3 px-0.5 rounded-2xl bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-border-dark items-center justify-center active:scale-95 shadow-2xs"
      >
        <Feather
          name="repeat"
          size={18}
          color="#2563EB"
        />
        <Text className="text-[11px] font-bold text-ink dark:text-ink-light mt-1">
          Transfer
        </Text>
      </Pressable>

      {/* 4. Split */}
      <Pressable
        onPress={onSplit}
        accessibilityRole="button"
        accessibilityLabel="Split bills"
        className="flex-1 py-3 px-0.5 rounded-2xl bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-border-dark items-center justify-center active:scale-95 shadow-2xs"
      >
        <Feather
          name="users"
          size={18}
          color={isDark ? "#F5F5F3" : "#0A0A0B"}
        />
        <Text className="text-[11px] font-bold text-ink dark:text-ink-light mt-1">
          Split
        </Text>
      </Pressable>

      {/* 5. Scan */}
      <Pressable
        onPress={onScan}
        accessibilityRole="button"
        accessibilityLabel="Scan receipt or AI assistant"
        className="flex-1 py-3 px-0.5 rounded-2xl bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-border-dark items-center justify-center active:scale-95 shadow-2xs"
      >
        <Feather
          name="camera"
          size={18}
          color={isDark ? "#F5F5F3" : "#0A0A0B"}
        />
        <Text className="text-[11px] font-bold text-ink dark:text-ink-light mt-1">
          Scan
        </Text>
      </Pressable>
    </View>
  );
}

