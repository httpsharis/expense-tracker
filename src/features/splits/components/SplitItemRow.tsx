import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Pressable, View } from "react-native";

import type { SplitDetailItem } from "@services/splits";
import { formatCurrency } from "@shared/lib/currency";
import { Surface } from "@shared/ui/Surface";
import { Text } from "@shared/ui/Text";

interface SplitItemRowProps {
  split: SplitDetailItem;
  currency: string;
  onSettlePress?: (split: SplitDetailItem) => void;
}

export function SplitItemRow({ split, currency, onSettlePress }: SplitItemRowProps) {
  const isOwedToMe = split.direction === "owed_to_me";
  const isSettled = split.status === "settled";
  const isPartial = split.status === "partial" || ((split.paid_amount ?? 0) > 0 && !isSettled);

  const totalOriginal = split.share_amount;
  const currentRemaining = split.remaining_amount ?? split.share_amount;
  const paidAmount = split.paid_amount ?? 0;

  const percentPaid =
    totalOriginal > 0 ? Math.min(100, Math.round((paidAmount / totalOriginal) * 100)) : 0;

  return (
    <Surface
      variant="flat"
      className="p-4 rounded-2xl border border-surface-border bg-surface mb-2.5 shadow-2xs"
    >
      <View className="flex-row items-center justify-between">
        {/* Left: Avatar & Meta */}
        <View className="flex-row items-center gap-3.5 flex-1 mr-3">
          <View className="w-10 h-10 rounded-2xl bg-surface-muted border border-surface-border items-center justify-center">
            <Text className="text-xs font-black text-ink">
              {(split.member_name?.[0] || "?").toUpperCase()}
            </Text>
          </View>

          <View className="flex-1">
            <View className="flex-row items-center gap-1.5 flex-wrap">
              <Text className="text-sm font-bold text-ink" numberOfLines={1}>
                {split.member_name}
              </Text>

              {/* Status Tag */}
              {isSettled ? (
                <View className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 flex-row items-center gap-1">
                  <Feather name="check" size={10} color="#22C55E" />
                  <Text className="text-[9px] font-bold text-primary">SETTLED</Text>
                </View>
              ) : isPartial ? (
                <View className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <Text className="text-[9px] font-bold text-amber-500">
                    PARTIAL ({percentPaid}%)
                  </Text>
                </View>
              ) : (
                <View className="w-1.5 h-1.5 rounded-full bg-[#C9A24B]" />
              )}
            </View>

            <Text className="text-[11px] text-ink-muted mt-0.5" numberOfLines={1}>
              {split.transaction_description || (split.kind === "loan" ? "1-on-1 Loan" : "Split Item")}
            </Text>
          </View>
        </View>

        {/* Right: Amounts & Quick Action */}
        <View className="items-end gap-1.5">
          <Text
            className={`text-sm font-black tabular-nums ${
              isSettled
                ? "text-ink-muted"
                : isOwedToMe
                  ? "text-primary"
                  : "text-rose-500"
            }`}
          >
            {isSettled
              ? formatCurrency(totalOriginal, currency)
              : `${isOwedToMe ? "+" : "-"}${formatCurrency(currentRemaining, currency)}`}
          </Text>

          {!isSettled ? (
            <Pressable
              onPress={() => onSettlePress?.(split)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={`Settle split with ${split.member_name}`}
              className="px-3 py-1.5 rounded-xl bg-ink dark:bg-ink-light active:scale-95 shadow-2xs"
            >
              <Text className="text-[10px] font-bold text-surface dark:text-surface">
                Settle
              </Text>
            </Pressable>
          ) : (
            <Text className="text-[10px] font-semibold text-ink-whisper">
              Fully paid
            </Text>
          )}
        </View>
      </View>

      {/* If Partially Settled: Show progress bar and fraction stats */}
      {isPartial && !isSettled && (
        <View className="mt-3 pt-2.5 border-t border-surface-border">
          <View className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden flex-row">
            <View
              style={{ width: `${percentPaid}%` }}
              className="h-full bg-primary"
            />
          </View>
          <View className="flex-row items-center justify-between mt-1.5">
            <Text className="text-[10px] text-ink-muted">
              Paid: <Text className="font-bold text-primary">{formatCurrency(paidAmount, currency)}</Text>
            </Text>
            <Text className="text-[10px] text-ink-muted">
              Remaining: <Text className="font-bold text-ink">{formatCurrency(currentRemaining, currency)}</Text>
            </Text>
          </View>
        </View>
      )}
    </Surface>
  );
}
