import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Pressable, View } from "react-native";

import type { SettlementHistoryItem } from "@services/splits";
import { formatCurrency } from "@shared/lib/currency";
import { Text } from "@shared/ui/Text";

interface SettlementHistoryCardProps {
  settlement: SettlementHistoryItem;
  currency: string;
  onPress?: () => void;
}

function formatSettlementDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeString = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (isToday) {
      return `Today, ${timeString}`;
    }

    const yesterday = new Date(now.getTime() - 86400000);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return `Yesterday, ${timeString}`;
    }

    return date.toLocaleDateString([], {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return dateStr;
  }
}

export function SettlementHistoryCard({
  settlement,
  currency,
  onPress,
}: SettlementHistoryCardProps) {
  const isReceived = settlement.type === "received";
  const dateFormatted = formatSettlementDate(settlement.created_at);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${isReceived ? "Received" : "Paid"} ${formatCurrency(
        settlement.amount,
        currency,
      )} with ${settlement.friend_name}`}
      className="p-4 rounded-3xl bg-surface border border-surface-border shadow-2xs mb-2.5 active:scale-[0.99]"
    >
      <View className="flex-row items-start justify-between">
        {/* Left: Direction Icon + Narrative Title */}
        <View className="flex-row items-start gap-3 flex-1 mr-3">
          <View
            className={`w-10 h-10 rounded-2xl items-center justify-center border ${
              isReceived
                ? "bg-primary/10 border-primary/20"
                : "bg-surface-muted border-surface-border"
            }`}
          >
            <Feather
              name={isReceived ? "arrow-down-left" : "arrow-up-right"}
              size={18}
              color={isReceived ? "#22C55E" : "#71717A"}
            />
          </View>

          <View className="flex-1">
            <View className="flex-row items-center gap-1.5 flex-wrap">
              <Text className="text-sm font-black text-ink tracking-tight">
                {isReceived
                  ? `${settlement.friend_name} paid you`
                  : `You paid ${settlement.friend_name}`}
              </Text>
            </View>

            {settlement.transaction_description ? (
              <Text
                className="text-xs font-medium text-ink-muted mt-0.5"
                numberOfLines={1}
              >
                For: {settlement.transaction_description}
              </Text>
            ) : null}

            {/* Metadata Pills: Account & Timing */}
            <View className="flex-row items-center gap-1.5 mt-2 flex-wrap">
              {/* Account / Off-ledger Pill */}
              <View className="px-2 py-0.5 rounded-md bg-surface-muted border border-surface-border flex-row items-center gap-1">
                <Feather
                  name={
                    settlement.settlement_mode === "from_balance"
                      ? "credit-card"
                      : "file-text"
                  }
                  size={10}
                  color="#71717A"
                />
                <Text className="text-[10px] font-semibold text-ink-muted">
                  {settlement.settlement_mode === "from_balance"
                    ? settlement.account_name || "Linked Account"
                    : "Off-ledger"}
                </Text>
              </View>

              {/* Group Pill if present */}
              {settlement.group_name && settlement.group_name !== "Direct Friends" ? (
                <View className="px-2 py-0.5 rounded-md bg-surface-muted border border-surface-border flex-row items-center gap-1">
                  <Feather name="users" size={9} color="#71717A" />
                  <Text
                    className="text-[10px] font-semibold text-ink-muted"
                    numberOfLines={1}
                  >
                    {settlement.group_name}
                  </Text>
                </View>
              ) : null}

              {/* Timestamp */}
              <Text className="text-[10px] font-medium text-ink-whisper ml-0.5">
                {dateFormatted}
              </Text>
            </View>
          </View>
        </View>

        {/* Right: Settled Amount + Completeness Badge */}
        <View className="items-end">
          <Text
            className={`text-base font-black tabular-nums tracking-tight ${
              isReceived ? "text-primary" : "text-ink"
            }`}
          >
            {isReceived ? "+" : "-"}
            {formatCurrency(settlement.amount, currency)}
          </Text>

          <View
            className={`mt-1.5 px-2 py-0.5 rounded-full border ${
              settlement.is_full_settlement
                ? "bg-primary/10 border-primary/20"
                : "bg-amber-500/10 border-amber-500/20"
            }`}
          >
            <Text
              className={`text-[9px] font-bold ${
                settlement.is_full_settlement ? "text-primary" : "text-amber-500"
              }`}
            >
              {settlement.is_full_settlement ? "Full Settle" : "Partial Pay"}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
