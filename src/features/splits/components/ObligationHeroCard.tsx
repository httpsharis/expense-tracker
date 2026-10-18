import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Pressable, View } from "react-native";

import type { SplitsFinancialSummary } from "@services/splits";
import { formatCurrency } from "@shared/lib/currency";
import { Text } from "@shared/ui/Text";

interface ObligationHeroCardProps {
  summary: SplitsFinancialSummary;
  currency: string;
  hasOverdue?: boolean;
  onSplitPress?: () => void;
  onGroupPress?: () => void;
}

export function ObligationHeroCard({
  summary,
  currency,
  hasOverdue,
  onSplitPress,
  onGroupPress,
}: ObligationHeroCardProps) {
  const isNetPositive = summary.netBalance > 0;
  const isNetNegative = summary.netBalance < 0;
  const isClear = summary.netBalance === 0;

  return (
    <View className="mx-6 mb-5 p-5 rounded-3xl bg-surface border border-surface-border shadow-xs">
      {/* 1. Header & Active Count */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-1.5">
          <View
            className={`w-2 h-2 rounded-full ${
              isNetPositive
                ? "bg-primary"
                : isNetNegative
                  ? "bg-rose-500"
                  : "bg-ink-whisper"
            }`}
          />
          <Text className="text-[11px] font-bold uppercase tracking-wider text-ink-whisper">
            Shared Balance
          </Text>
        </View>

        {summary.openCount > 0 ? (
          <View className="px-2.5 py-0.5 rounded-full bg-surface-muted border border-surface-border">
            <Text className="text-[10px] font-bold text-ink-muted">
              {summary.openCount} {summary.openCount === 1 ? "Active Tab" : "Active Tabs"}
            </Text>
          </View>
        ) : (
          <View className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 flex-row items-center gap-1">
            <Feather name="check" size={10} color="#22C55E" />
            <Text className="text-[10px] font-bold text-primary">All Even</Text>
          </View>
        )}
      </View>

      {/* 2. Main Balance */}
      <View className="my-1">
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          className={`text-4xl font-black tracking-tight tabular-nums ${
            isNetPositive
              ? "text-primary"
              : isNetNegative
                ? "text-rose-500"
                : "text-ink"
          }`}
        >
          {isNetPositive ? "+" : isNetNegative ? "-" : ""}
          {formatCurrency(Math.abs(summary.netBalance), currency, {
            showPositivePrefix: false,
          })}
        </Text>
        <Text className="text-xs font-medium text-ink-muted mt-0.5">
          {isClear
            ? "You are completely even with everyone"
            : isNetPositive
              ? "Friends owe you this total amount"
              : "You owe friends this total amount"}
        </Text>
      </View>

      {/* 3. Direct Telemetry Badges */}
      <View className="flex-row gap-2 mt-4 pt-3.5 border-t border-surface-border">
        {/* Incoming */}
        <View className="flex-1 p-2.5 rounded-2xl bg-surface-muted border border-surface-border">
          <View className="flex-row items-center gap-1 mb-0.5">
            <Feather name="arrow-down-left" size={12} color="#22C55E" />
            <Text className="text-[10px] font-bold uppercase tracking-wider text-ink-whisper">
              You are owed
            </Text>
          </View>
          <Text className="text-sm font-black text-primary tabular-nums">
            {formatCurrency(summary.totalOwedToMe, currency)}
          </Text>
        </View>

        {/* Outgoing */}
        <View className="flex-1 p-2.5 rounded-2xl bg-surface-muted border border-surface-border">
          <View className="flex-row items-center gap-1 mb-0.5">
            <Feather name="arrow-up-right" size={12} color="#EF4444" />
            <Text className="text-[10px] font-bold uppercase tracking-wider text-ink-whisper">
              You owe
            </Text>
          </View>
          <Text className="text-sm font-black text-rose-500 tabular-nums">
            {formatCurrency(summary.totalIOwe, currency)}
          </Text>
        </View>
      </View>

      {/* 4. Action Buttons (No Loans! Only Split Bill and Groups) */}
      <View className="flex-row items-center gap-2 mt-3.5">
        {onSplitPress && (
          <Pressable
            onPress={onSplitPress}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            className="flex-1 h-12 rounded-2xl bg-ink dark:bg-ink-light flex-row items-center justify-center gap-2 active:scale-95 shadow-2xs"
          >
            <Feather name="scissors" size={14} color="#22C55E" />
            <Text className="text-xs font-bold text-surface dark:text-surface">
              + Split a Bill
            </Text>
          </Pressable>
        )}

        {onGroupPress && (
          <Pressable
            onPress={onGroupPress}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            className="h-12 px-4 rounded-2xl bg-surface-muted border border-surface-border flex-row items-center justify-center gap-1.5 active:scale-95"
          >
            <Feather name="users" size={14} color="#22C55E" />
            <Text className="text-xs font-bold text-ink">
              New Group
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
