import Feather from "@expo/vector-icons/Feather";
import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import type { PersonDebtSummary, SplitDetailItem } from "@services/splits";
import { formatCurrency } from "@shared/lib/currency";
import { fromMinorUnits, toMinorUnits } from "@shared/lib/money";
import { Text } from "@shared/ui/Text";

interface PersonDebtCardProps {
  person: PersonDebtSummary;
  currency: string;
  onSettleItem: (item: SplitDetailItem) => void;
  onAddBill?: (friendName: string) => void;
  onViewDetails?: (person: PersonDebtSummary) => void;
}

export function PersonDebtCard({
  person,
  currency,
  onSettleItem,
  onAddBill,
  onViewDetails,
}: PersonDebtCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const initial = (person.person_name?.[0] || "?").toUpperCase();

  const isNetOwedToMe = person.net_balance > 0;
  const isNetIOwe = person.net_balance < 0;
  const isClear = person.net_balance === 0;

  // Find first unsettled item for quick single-tap settle
  const firstUnsettled = person.items.find((i) => i.status !== "settled");

  // Comprehensive financial breakdown for this person
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
    let explanation = `All tabs with ${person.person_name} are balanced. Zero balance due.`;

    if (person.net_balance > 0) {
      relType = "lent";
      label = "YOU LENT";
      explanation = `${person.person_name} owes you a net total of ${formatCurrency(person.net_balance, currency)}. You have lent across ${person.items.length} outing${person.items.length === 1 ? "" : "s"} with ${pct}% settled.`;
    } else if (person.net_balance < 0) {
      relType = "borrowed";
      label = "YOU BORROWED";
      explanation = `You owe ${person.person_name} a net total of ${formatCurrency(Math.abs(person.net_balance), currency)}. You have borrowed across ${person.items.length} outing${person.items.length === 1 ? "" : "s"} with ${pct}% settled.`;
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
    <View className="mb-3 rounded-2xl border border-surface-border bg-surface shadow-2xs overflow-hidden">
      {/* ── Main Pressable Rectangular Card Surface ── */}
      <Pressable
        onPress={() => setIsExpanded((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel={`${person.person_name}, ${typeLabel}, ${formatCurrency(Math.abs(person.net_balance), currency)}`}
        className="p-4 active:bg-surface-muted/30 transition-all"
      >
        {/* Top: Avatar, Name, Type Badge & Tab Count */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-3 flex-1 mr-2">
            <View className="w-11 h-11 rounded-2xl bg-surface-muted border border-surface-border items-center justify-center">
              <Text className="text-sm font-black text-ink">{initial}</Text>
            </View>

            <View className="flex-1">
              <View className="flex-row items-center gap-1.5 flex-wrap">
                <Text className="text-base font-black text-ink" numberOfLines={1}>
                  {person.person_name}
                </Text>

                {/* Name of Type Badge (Lent, Borrowed, Settled) */}
                <View
                  className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full border ${
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
                    size={10}
                    color={
                      type === "lent"
                        ? "#22C55E"
                        : type === "borrowed"
                          ? "#EF4444"
                          : "#71717A"
                    }
                  />
                  <Text
                    className={`text-[9px] font-black uppercase tracking-wider ${
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
              </View>

              <View className="flex-row items-center gap-2 mt-0.5">
                <Text className="text-xs text-ink-muted">
                  {isClear
                    ? "All tabs settled"
                    : `${person.open_count} open ${person.open_count === 1 ? "bill" : "bills"}`}
                </Text>
                {person.has_overdue && (
                  <View className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    <Text className="text-[9px] font-bold text-amber-500">
                      Overdue
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Expand/Collapse Trigger */}
          <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-xl bg-surface-muted border border-surface-border">
            <Text className="text-[10px] font-bold text-ink-muted">
              {isExpanded ? "Close" : "Details"}
            </Text>
            <Feather
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={12}
              color="#A1A1AA"
            />
          </View>
        </View>

        {/* Middle: Main Amount & Average Percentage of Payments */}
        <View className="flex-row items-end justify-between mt-1 mb-2">
          <View>
            <Text className="text-[10px] font-bold text-ink-whisper uppercase tracking-wider mb-0.5">
              {isClear ? "Net Balance" : isNetOwedToMe ? "Net Owes You" : "Net You Owe"}
            </Text>
            <Text
              className={`text-2xl font-black tabular-nums tracking-tight ${
                isClear
                  ? "text-ink-whisper"
                  : isNetOwedToMe
                    ? "text-primary"
                    : "text-rose-500"
              }`}
            >
              {isClear
                ? "Rs 0"
                : `${isNetOwedToMe ? "+" : "-"}${formatCurrency(Math.abs(person.net_balance), currency)}`}
            </Text>
          </View>

          {/* Average Percentage Badge */}
          <View className="items-end">
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
            <Text className="text-[10px] font-medium text-ink-muted mt-1">
              {isClear
                ? "Clean ledger"
                : `${formatCurrency(totalRemaining, currency)} left to settle`}
            </Text>
          </View>
        </View>

        {/* Status Bar Measuring How Much Money is Left */}
        <View className="mt-1">
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
              Total Tab: <Text className="font-bold text-ink">{formatCurrency(totalVolume, currency)}</Text>
            </Text>
          </View>
        </View>

        {/* Collapsed Actions Bar */}
        {!isExpanded && (
          <View className="flex-row items-center gap-2 pt-3 mt-2 border-t border-surface-border">
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onAddBill?.(person.person_name);
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              className="flex-1 h-9 rounded-xl bg-surface-muted border border-surface-border flex-row items-center justify-center gap-1.5 active:scale-95"
            >
              <Feather name="plus" size={12} color="#22C55E" />
              <Text className="text-xs font-bold text-ink">+ Add Bill</Text>
            </Pressable>

            {!isClear && firstUnsettled && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onSettleItem(firstUnsettled);
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                className="h-9 px-4 rounded-xl bg-ink dark:bg-ink-light flex-row items-center justify-center gap-1.5 active:scale-95 shadow-2xs"
              >
                <Feather name="check-circle" size={12} color="#22C55E" />
                <Text className="text-xs font-bold text-surface dark:text-surface">
                  Settle
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onViewDetails?.(person);
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              className="h-9 px-3 rounded-xl bg-surface-muted border border-surface-border flex-row items-center justify-center gap-1 active:scale-95"
            >
              <Text className="text-xs font-bold text-ink">Ledger</Text>
              <Feather name="arrow-up-right" size={12} color="#A1A1AA" />
            </Pressable>
          </View>
        )}
      </Pressable>

      {/* ── Expanded Section: Debt Details & Rows of Transactions ── */}
      {isExpanded && (
        <View className="border-t border-surface-border bg-surface-muted/20 pb-4 pt-3">
          {/* 1. Debt Details Card: How That Person Owes Me or I Owe Him */}
          <View className="mx-4 mb-3.5 p-3.5 rounded-2xl bg-surface border border-surface-border shadow-2xs">
            <View className="flex-row items-center gap-1.5 mb-1.5">
              <Feather name="info" size={13} color="#22C55E" />
              <Text className="text-[11px] font-black uppercase tracking-wider text-ink">
                Position Breakdown
              </Text>
            </View>

            <Text className="text-xs text-ink-muted leading-relaxed">
              {relationDescription}
            </Text>

            {/* 3 Position Metrics */}
            <View className="flex-row gap-2 mt-3 pt-2.5 border-t border-surface-border">
              <View className="flex-1 p-2 rounded-xl bg-surface-muted border border-surface-border">
                <Text className="text-[9px] font-bold text-ink-whisper uppercase">
                  Total Lent
                </Text>
                <Text className="text-xs font-black text-primary tabular-nums mt-0.5">
                  +{formatCurrency(totalLent, currency)}
                </Text>
              </View>

              <View className="flex-1 p-2 rounded-xl bg-surface-muted border border-surface-border">
                <Text className="text-[9px] font-bold text-ink-whisper uppercase">
                  Total Borrowed
                </Text>
                <Text className="text-xs font-black text-rose-500 tabular-nums mt-0.5">
                  -{formatCurrency(totalBorrowed, currency)}
                </Text>
              </View>

              <View className="flex-1 p-2 rounded-xl bg-surface-muted border border-surface-border">
                <Text className="text-[9px] font-bold text-ink-whisper uppercase">
                  Total Settled
                </Text>
                <Text className="text-xs font-black text-ink tabular-nums mt-0.5">
                  {formatCurrency(totalSettled, currency)}
                </Text>
              </View>
            </View>
          </View>

          {/* 2. Rows of Transactions Under That Main Card */}
          <View className="mx-4 mb-3">
            <View className="flex-row items-center justify-between mb-2 px-1">
              <Text className="text-[11px] font-black uppercase tracking-wider text-ink-whisper">
                Transactions & Outings ({person.items.length})
              </Text>
              <Text className="text-[10px] font-bold text-ink-muted">
                {person.open_count} open
              </Text>
            </View>

            {person.items.length === 0 ? (
              <View className="p-4 rounded-xl bg-surface border border-surface-border items-center">
                <Text className="text-xs text-ink-muted">
                  No transactions recorded for {person.person_name} yet.
                </Text>
              </View>
            ) : (
              <View className="gap-2">
                {person.items.map((item) => {
                  const isItemOwedToMe = item.direction === "owed_to_me";
                  const itemShare = item.share_amount;
                  const itemRemaining =
                    item.remaining_amount ?? (item.status === "settled" ? 0 : itemShare);
                  const itemPaid =
                    item.paid_amount ?? (item.status === "settled" ? itemShare : 0);
                  const isSettled = item.status === "settled";
                  const isPartial =
                    item.status === "partial" || (itemPaid > 0 && !isSettled);
                  const itemPercent =
                    itemShare > 0
                      ? Math.min(100, Math.round((itemPaid / itemShare) * 100))
                      : isSettled
                        ? 100
                        : 0;

                  return (
                    <View
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-surface border border-surface-border shadow-2xs"
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1 mr-2">
                          <View className="flex-row items-center gap-1.5 flex-wrap">
                            <Text className="text-xs font-bold text-ink" numberOfLines={1}>
                              {item.transaction_description ||
                                (item.kind === "loan" ? "Direct Loan" : "Shared Outing")}
                            </Text>

                            {/* Direction Tag */}
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
                              <View className="px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 flex-row items-center gap-0.5">
                                <Feather name="check" size={8} color="#22C55E" />
                                <Text className="text-[8px] font-bold text-primary">Settled</Text>
                              </View>
                            ) : isPartial ? (
                              <View className="px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                                <Text className="text-[8px] font-bold text-amber-500">
                                  {itemPercent}% Paid
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          <Text className="text-[10px] text-ink-muted mt-1">
                            {item.transaction_date
                              ? new Date(item.transaction_date).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Recent"}{" "}
                            • Total share: {formatCurrency(itemShare, currency)}
                          </Text>
                        </View>

                        {/* Amounts & Settle Button */}
                        <View className="items-end gap-1">
                          <Text
                            className={`text-xs font-black tabular-nums ${
                              isSettled
                                ? "text-ink-muted"
                                : isItemOwedToMe
                                  ? "text-primary"
                                  : "text-rose-500"
                            }`}
                          >
                            {isSettled
                              ? "Paid"
                              : `${isItemOwedToMe ? "+" : "-"}${formatCurrency(itemRemaining, currency)}`}
                          </Text>

                          {!isSettled && (
                            <Pressable
                              onPress={() => onSettleItem(item)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              className="px-2.5 py-1 rounded-lg bg-ink dark:bg-ink-light active:scale-95 shadow-2xs"
                            >
                              <Text className="text-[9px] font-bold text-surface dark:text-surface">
                                Settle
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      </View>

                      {/* Mini Progress Bar for Partials */}
                      {isPartial && !isSettled && (
                        <View className="mt-2 pt-2 border-t border-surface-border">
                          <View className="h-1 w-full bg-surface-muted rounded-full overflow-hidden flex-row">
                            <View
                              style={{ width: `${itemPercent}%` }}
                              className="h-full bg-amber-500 rounded-full"
                            />
                          </View>
                          <View className="flex-row items-center justify-between mt-1">
                            <Text className="text-[9px] text-ink-whisper">
                              Paid: {formatCurrency(itemPaid, currency)}
                            </Text>
                            <Text className="text-[9px] text-ink-whisper">
                              Left: {formatCurrency(itemRemaining, currency)}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* 3. Expanded Footer Actions */}
          <View className="flex-row items-center gap-2 mx-4 pt-1">
            <Pressable
              onPress={() => onAddBill?.(person.person_name)}
              className="flex-1 h-9 rounded-xl bg-surface border border-surface-border flex-row items-center justify-center gap-1.5 active:scale-95"
            >
              <Feather name="plus" size={12} color="#22C55E" />
              <Text className="text-xs font-bold text-ink">+ Add Outing</Text>
            </Pressable>

            <Pressable
              onPress={() => onViewDetails?.(person)}
              className="flex-1 h-9 rounded-xl bg-surface-muted border border-surface-border flex-row items-center justify-center gap-1.5 active:scale-95"
            >
              <Feather name="file-text" size={12} color="#A1A1AA" />
              <Text className="text-xs font-bold text-ink">Full Ledger</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
