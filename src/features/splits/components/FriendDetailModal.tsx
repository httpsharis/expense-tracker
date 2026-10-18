import Feather from "@expo/vector-icons/Feather";
import React, { useMemo } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { PersonDebtSummary, SplitDetailItem } from "@services/splits";
import { formatCurrency } from "@shared/lib/currency";
import { fromMinorUnits, toMinorUnits } from "@shared/lib/money";
import { Text } from "@shared/ui/Text";

import { SettlementHistoryCard } from "./SettlementHistoryCard";

interface FriendDetailModalProps {
  visible: boolean;
  onClose: () => void;
  person: PersonDebtSummary | null;
  currency: string;
  onAddBillWithFriend: (friendName: string) => void;
  onSettleSplitItem: (item: SplitDetailItem) => void;
}

export function FriendDetailModal({
  visible,
  onClose,
  person,
  currency,
  onAddBillWithFriend,
  onSettleSplitItem,
}: FriendDetailModalProps) {
  if (!person) return null;

  const isNetOwedToMe = person.net_balance > 0;
  const isNetIOwe = person.net_balance < 0;
  const isClear = person.net_balance === 0;

  const firstUnsettled = person.items.find((i) => i.status !== "settled");
  const friendSettlements = person.settlements ?? [];

  // Compute comprehensive metrics for this person's ledger
  const {
    totalLent,
    totalBorrowed,
    totalSettled,
    totalRemaining,
    totalVolume,
    paymentPercent,
    type,
    typeLabel,
    relationDescription,
  } = useMemo(() => {
    let lentMinor = 0;
    let borrowedMinor = 0;
    let settledMinor = 0;
    let remainingMinor = 0;

    for (const item of person.items) {
      const shareMinor = toMinorUnits(item.share_amount || 0);
      const paidMinor = toMinorUnits(
        item.paid_amount || (item.status === "settled" ? item.share_amount || 0 : 0),
      );
      const itemRemainingMinor = toMinorUnits(
        item.remaining_amount ?? (item.status === "settled" ? 0 : item.share_amount || 0),
      );

      if (item.direction === "owed_to_me") {
        lentMinor += shareMinor;
      } else {
        borrowedMinor += shareMinor;
      }

      settledMinor += paidMinor;
      remainingMinor += itemRemainingMinor;
    }

    const volMinor = lentMinor + borrowedMinor;
    let pct = 100;
    if (volMinor > 0) {
      pct = Math.min(100, Math.max(0, Math.round((settledMinor / volMinor) * 100)));
    } else if (person.net_balance !== 0) {
      pct = 0;
    }

    let relType: "lent" | "borrowed" | "settled" = "settled";
    let label = "SETTLED";
    let explanation = `All shared tabs with ${person.person_name} are settled. You both are completely square.`;

    if (person.net_balance > 0) {
      relType = "lent";
      label = "YOU LENT";
      explanation = `${person.person_name} owes you ${formatCurrency(person.net_balance, currency)} net. You have covered expenses across ${person.items.length} outing${person.items.length === 1 ? "" : "s"} with ${pct}% settled so far.`;
    } else if (person.net_balance < 0) {
      relType = "borrowed";
      label = "YOU BORROWED";
      explanation = `You owe ${person.person_name} ${formatCurrency(Math.abs(person.net_balance), currency)} net. ${person.person_name} covered expenses across ${person.items.length} outing${person.items.length === 1 ? "" : "s"} with ${pct}% settled so far.`;
    }

    return {
      totalLent: fromMinorUnits(lentMinor),
      totalBorrowed: fromMinorUnits(borrowedMinor),
      totalSettled: fromMinorUnits(settledMinor),
      totalRemaining: fromMinorUnits(remainingMinor),
      totalVolume: fromMinorUnits(volMinor),
      paymentPercent: pct,
      type: relType,
      typeLabel: label,
      relationDescription: explanation,
    };
  }, [person, currency]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-canvas">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-surface-border bg-surface">
          <View className="flex-row items-center gap-3">
            <View className="w-11 h-11 rounded-2xl bg-surface-muted border border-surface-border items-center justify-center">
              <Text className="text-base font-black text-ink">
                {(person.person_name?.[0] || "?").toUpperCase()}
              </Text>
            </View>
            <View>
              <Text className="text-base font-black text-ink tracking-tight">
                {person.person_name}
              </Text>
              <Text className="text-xs font-medium text-ink-muted">
                Running Friend Ledger
              </Text>
            </View>
          </View>

          <Pressable
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close ledger"
            className="w-8 h-8 rounded-full bg-surface-muted border border-surface-border items-center justify-center active:scale-95 shadow-2xs"
          >
            <Feather name="x" size={16} color="#A1A1AA" />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        >
          {/* ── 1. Main Card: Details How Person Owes Me or I Owe Him ── */}
          <View className="p-5 rounded-3xl bg-surface border border-surface-border mb-4 shadow-xs">
            {/* Top Badge Strip: Type of Relation & Average Percentage */}
            <View className="flex-row items-center justify-between mb-3">
              {/* Type Badge: YOU LENT / YOU BORROWED / SETTLED */}
              <View
                className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                  type === "lent"
                    ? "bg-primary/10 border-primary/20"
                    : type === "borrowed"
                      ? "bg-rose-500/10 border-rose-500/20"
                      : "bg-surface-muted border-surface-border"
                }`}
              >
                <Feather
                  name={
                    type === "lent"
                      ? "arrow-down-left"
                      : type === "borrowed"
                        ? "arrow-up-right"
                        : "check"
                  }
                  size={12}
                  color={
                    type === "lent"
                      ? "#22C55E"
                      : type === "borrowed"
                        ? "#EF4444"
                        : "#71717A"
                  }
                />
                <Text
                  className={`text-[10px] font-black uppercase tracking-wider ${
                    type === "lent"
                      ? "text-primary"
                      : type === "borrowed"
                        ? "text-rose-500"
                        : "text-ink-muted"
                  }`}
                >
                  {typeLabel}
                </Text>
              </View>

              {/* Payment Percentage Pill */}
              <View
                className={`px-2.5 py-1 rounded-xl border ${
                  paymentPercent === 100
                    ? "bg-primary/10 border-primary/20"
                    : paymentPercent > 0
                      ? "bg-amber-500/10 border-amber-500/20"
                      : "bg-surface-muted border-surface-border"
                }`}
              >
                <Text
                  className={`text-xs font-black tabular-nums ${
                    paymentPercent === 100
                      ? "text-primary"
                      : paymentPercent > 0
                        ? "text-amber-500"
                        : "text-ink-whisper"
                  }`}
                >
                  {paymentPercent}% Settled
                </Text>
              </View>
            </View>

            {/* Main Net Amount */}
            <Text className="text-[11px] font-bold text-ink-whisper uppercase tracking-wider mb-1">
              {isClear ? "Net Balance" : isNetOwedToMe ? "Net Owes You" : "Net You Owe"}
            </Text>
            <Text
              className={`text-3xl font-black tabular-nums tracking-tight ${
                isClear
                  ? "text-ink-muted"
                  : isNetOwedToMe
                    ? "text-primary"
                    : "text-rose-500"
              }`}
            >
              {isClear
                ? "All Settled Up"
                : `${isNetOwedToMe ? "+" : "-"}${formatCurrency(Math.abs(person.net_balance), currency)}`}
            </Text>

            {/* Clear Narrative Explanation */}
            <Text className="text-xs text-ink-muted leading-relaxed mt-1.5">
              {relationDescription}
            </Text>

            {/* Status Bar Measuring How Much Money is Left */}
            <View className="mt-3.5 pt-3 border-t border-surface-border">
              <View className="h-2 w-full bg-surface-muted rounded-full overflow-hidden flex-row">
                <View
                  style={{ width: `${Math.max(4, paymentPercent)}%` }}
                  className={`h-full rounded-full ${
                    isClear || isNetOwedToMe ? "bg-primary" : "bg-rose-500"
                  }`}
                />
              </View>

              <View className="flex-row items-center justify-between mt-1.5">
                <Text className="text-[10px] font-medium text-ink-muted">
                  Paid: <Text className="font-bold text-ink">{formatCurrency(totalSettled, currency)}</Text>
                </Text>
                <Text className="text-[10px] font-medium text-ink-muted">
                  {isClear ? "Fully Settled" : `${formatCurrency(totalRemaining, currency)} left to settle`}
                </Text>
              </View>
            </View>

            {/* 3 Metric Breakdown Chips */}
            <View className="flex-row gap-2 mt-3 pt-3 border-t border-surface-border">
              <View className="flex-1 p-2.5 rounded-2xl bg-surface-muted border border-surface-border">
                <Text className="text-[9px] font-bold text-ink-whisper uppercase">
                  Total Lent
                </Text>
                <Text className="text-sm font-black text-primary tabular-nums mt-0.5">
                  +{formatCurrency(totalLent, currency)}
                </Text>
              </View>

              <View className="flex-1 p-2.5 rounded-2xl bg-surface-muted border border-surface-border">
                <Text className="text-[9px] font-bold text-ink-whisper uppercase">
                  Total Borrowed
                </Text>
                <Text className="text-sm font-black text-rose-500 tabular-nums mt-0.5">
                  -{formatCurrency(totalBorrowed, currency)}
                </Text>
              </View>

              <View className="flex-1 p-2.5 rounded-2xl bg-surface-muted border border-surface-border">
                <Text className="text-[9px] font-bold text-ink-whisper uppercase">
                  Total Settled
                </Text>
                <Text className="text-sm font-black text-ink tabular-nums mt-0.5">
                  {formatCurrency(totalSettled, currency)}
                </Text>
              </View>
            </View>

            {/* Quick Actions Bar */}
            <View className="flex-row gap-2 mt-4 pt-3.5 border-t border-surface-border">
              <Pressable
                onPress={() => {
                  onClose();
                  onAddBillWithFriend(person.person_name);
                }}
                className="flex-1 h-11 rounded-2xl bg-ink dark:bg-ink-light flex-row items-center justify-center gap-2 active:scale-95 shadow-2xs"
              >
                <Feather name="plus" size={14} color="#22C55E" />
                <Text className="text-xs font-bold text-surface dark:text-surface">
                  + Add Outing
                </Text>
              </Pressable>

              {!isClear && firstUnsettled && (
                <Pressable
                  onPress={() => {
                    onClose();
                    onSettleSplitItem(firstUnsettled);
                  }}
                  className="flex-1 h-11 rounded-2xl bg-surface-muted border border-surface-border flex-row items-center justify-center gap-1.5 active:scale-95"
                >
                  <Feather name="check-circle" size={14} color="#22C55E" />
                  <Text className="text-xs font-bold text-ink">
                    Settle Balance
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* ── 2. Under That Main Card: Rows of Transactions ── */}
          <Text className="text-[11px] font-bold text-ink-whisper tracking-wider uppercase mb-3 px-1">
            Shared Bills & Outings ({person.items.length})
          </Text>

          {person.items.length === 0 ? (
            <View className="p-6 rounded-2xl bg-surface border border-surface-border items-center">
              <Text className="text-xs font-medium text-ink-muted text-center">
                No shared bills recorded with {person.person_name} yet.
              </Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {person.items.map((item) => {
                const isItemOwedToMe = item.direction === "owed_to_me";
                const total = item.share_amount;
                const remaining =
                  item.remaining_amount ?? (item.status === "settled" ? 0 : total);
                const paid =
                  item.paid_amount ?? (item.status === "settled" ? total : 0);
                const isSettled = item.status === "settled";
                const isPartial =
                  item.status === "partial" || (paid > 0 && !isSettled);
                const percentPaid =
                  total > 0
                    ? Math.min(100, Math.round((paid / total) * 100))
                    : isSettled
                      ? 100
                      : 0;

                return (
                  <View
                    key={item.id}
                    className="p-4 rounded-2xl bg-surface border border-surface-border shadow-2xs"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 mr-3">
                        <View className="flex-row items-center gap-2 flex-wrap">
                          <Text className="text-sm font-bold text-ink" numberOfLines={1}>
                            {item.transaction_description ||
                              (item.kind === "loan" ? "Direct Loan" : "Shared Outing")}
                          </Text>

                          {/* Direction Pill */}
                          <View
                            className={`px-1.5 py-0.5 rounded-md border ${
                              isItemOwedToMe
                                ? "bg-primary/10 border-primary/20"
                                : "bg-rose-500/10 border-rose-500/20"
                            }`}
                          >
                            <Text
                              className={`text-[8px] font-black uppercase ${
                                isItemOwedToMe ? "text-primary" : "text-rose-500"
                              }`}
                            >
                              {isItemOwedToMe ? "You Lent" : "You Borrowed"}
                            </Text>
                          </View>

                          {/* Status Tag */}
                          {isSettled ? (
                            <View className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 flex-row items-center gap-1">
                              <Feather name="check" size={10} color="#22C55E" />
                              <Text className="text-[9px] font-bold text-primary">Settled</Text>
                            </View>
                          ) : isPartial ? (
                            <View className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                              <Text className="text-[9px] font-bold text-amber-500">
                                {percentPaid}% Paid
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <Text className="text-xs text-ink-muted mt-1">
                          {isItemOwedToMe ? "Owed to you" : "You owe"}:{" "}
                          <Text className="font-bold text-ink">
                            {formatCurrency(remaining, currency)}
                          </Text>
                          {isPartial && ` of ${formatCurrency(total, currency)}`}
                        </Text>
                      </View>

                      {!isSettled ? (
                        <Pressable
                          onPress={() => {
                            onClose();
                            onSettleSplitItem(item);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          className="px-3.5 py-1.5 rounded-xl bg-ink dark:bg-ink-light active:scale-95 shadow-2xs"
                        >
                          <Text className="text-xs font-bold text-surface dark:text-surface">
                            Settle
                          </Text>
                        </Pressable>
                      ) : (
                        <Text className="text-[10px] font-semibold text-ink-whisper">
                          Paid
                        </Text>
                      )}
                    </View>

                    {/* Fractional Progress Bar if Partial */}
                    {isPartial && !isSettled && (
                      <View className="mt-2.5 pt-2 border-t border-surface-border">
                        <View className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden flex-row">
                          <View
                            style={{ width: `${percentPaid}%` }}
                            className="h-full bg-primary rounded-full"
                          />
                        </View>
                        <View className="flex-row items-center justify-between mt-1">
                          <Text className="text-[9px] text-ink-whisper">
                            {formatCurrency(paid, currency)} paid
                          </Text>
                          <Text className="text-[9px] text-ink-whisper">
                            {formatCurrency(remaining, currency)} left
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* ── 3. Past Settlements History with this Friend ── */}
          <View className="mt-6 mb-2">
            <View className="flex-row items-center justify-between mb-2 px-1">
              <Text className="text-[11px] font-bold text-ink-whisper tracking-wider uppercase">
                Settlement History ({friendSettlements.length})
              </Text>
              {(person.total_received > 0 || person.total_settled > 0) && (
                <View className="flex-row items-center gap-2">
                  {person.total_received > 0 && (
                    <Text className="text-[10px] font-bold text-primary">
                      Got: +{formatCurrency(person.total_received, currency)}
                    </Text>
                  )}
                  {person.total_settled > 0 && (
                    <Text className="text-[10px] font-bold text-ink-muted">
                      Paid: -{formatCurrency(person.total_settled, currency)}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {friendSettlements.length === 0 ? (
              <View className="p-5 rounded-2xl bg-surface border border-surface-border items-center">
                <Text className="text-xs font-medium text-ink-muted text-center">
                  No past settlements recorded with {person.person_name} yet.
                </Text>
              </View>
            ) : (
              <View className="gap-2">
                {friendSettlements.map((settlement) => (
                  <SettlementHistoryCard
                    key={settlement.id}
                    settlement={settlement}
                    currency={currency}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
