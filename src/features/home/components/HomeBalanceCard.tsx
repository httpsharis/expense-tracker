import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { formatCurrency, getCurrencySymbol } from "@shared/lib/currency";

export interface HomeBalanceCardProps {
  accountLabel: string;
  onOpenAccountPicker: () => void;
  isBalanceHidden: boolean;
  onToggleBalanceHidden: () => void;
  activeBalance: number;
  activeCurrency: string;
  monthlyIncome: number;
  monthlyExpenses?: number;
  daysRemaining?: number;
  monthStartMode?: "remaining" | "zero";
}

export function HomeBalanceCard({
  accountLabel,
  onOpenAccountPicker,
  isBalanceHidden,
  onToggleBalanceHidden,
  activeBalance,
  activeCurrency,
  monthlyIncome,
  monthlyExpenses = 0,
  monthStartMode = "remaining",
}: HomeBalanceCardProps) {
  const symbol = getCurrencySymbol(activeCurrency);
  const absoluteAmount = Math.abs(activeBalance);
  const [integerPart, decimalPart] = absoluteAmount
    .toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    .split(".");

  return (
    <View className="px-6 pt-5 pb-8 items-center justify-center">
      {/* 1. Account Selector Pill & Privacy Toggle — Centered with Generous Spacing */}
      <View className="flex-row items-center justify-center gap-2.5 mb-5">
        <Pressable
          onPress={onOpenAccountPicker}
          accessibilityRole="button"
          accessibilityLabel={`Active ledger: ${accountLabel}. Tap to change account.`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="flex-row items-center gap-2 px-4 py-2 rounded-full bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-border-dark active:scale-97 shadow-2xs"
        >
          <View className="w-2 h-2 rounded-full bg-primary" />
          <Text
            numberOfLines={1}
            className="text-xs font-bold text-ink dark:text-ink-light max-w-[220px]"
          >
            {accountLabel}
          </Text>
          <Feather name="chevron-down" size={13} color="#6B6B6E" />
        </Pressable>

        <Pressable
          onPress={onToggleBalanceHidden}
          accessibilityRole="button"
          accessibilityLabel={isBalanceHidden ? "Show balance" : "Hide balance"}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="w-8 h-8 rounded-full bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-border-dark items-center justify-center active:scale-95 shadow-2xs"
        >
          <Feather
            name={isBalanceHidden ? "eye-off" : "eye"}
            size={14}
            color="#6B6B6E"
          />
        </Pressable>
      </View>

      {/* 1b. Zero-Based Month Indicator Badge */}
      {monthStartMode === "zero" && (
        <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 mb-1">
          <View className="w-1.5 h-1.5 rounded-full bg-primary" />
          <Text className="text-[10px] font-bold text-primary tracking-wide uppercase">
            Month Net (Zero-Based)
          </Text>
        </View>
      )}

      {/* 2. Monumental Hero Balance Readout (Massive Scale, Airy Spacing) */}
      <View className="items-center justify-center py-4">
        {isBalanceHidden ? (
          <Text className="text-[52px] font-black text-ink dark:text-ink-light tracking-widest my-3">
            ••••••••
          </Text>
        ) : (
          <View className="flex-row items-baseline justify-center">
            {activeBalance < 0 && (
              <Text className="text-4xl font-black text-coral mr-1.5 self-center pb-2">-</Text>
            )}
            <Text className="text-3xl font-extrabold text-ink-whisper dark:text-ink-whisper-dark mr-2 self-center pb-2">
              {symbol}
            </Text>
            <Text className="text-[62px] leading-[68px] sm:text-[68px] sm:leading-[74px] font-black text-ink dark:text-ink-light tracking-tight tabular-nums">
              {integerPart}
            </Text>
            <Text className="text-3xl font-bold text-ink-whisper dark:text-ink-whisper-dark tabular-nums self-center pb-2">
              .{decimalPart}
            </Text>
          </View>
        )}

        {/* 3. Inflow & Outflow Bulbs (Spacious & Clean Under Balance) */}
        <View className="flex-row items-center justify-center gap-3 mt-6">
          {/* Inflow Bulb */}
          <View className="flex-row items-center gap-1.5 px-4 py-1.5 rounded-full bg-lime/10 dark:bg-lime/15 border border-lime/25">
            <Feather name="arrow-down-left" size={13} color="#16A34A" />
            <Text className="text-xs font-bold text-emerald-600 dark:text-lime tabular-nums">
              +{formatCurrency(monthlyIncome, activeCurrency)}
            </Text>
          </View>

          {/* Outflow Bulb */}
          <View className="flex-row items-center gap-1.5 px-4 py-1.5 rounded-full bg-coral/10 dark:bg-coral/15 border border-coral/25">
            <Feather name="arrow-up-right" size={13} color="#EF4444" />
            <Text className="text-xs font-bold text-coral tabular-nums">
              -{formatCurrency(monthlyExpenses, activeCurrency)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
