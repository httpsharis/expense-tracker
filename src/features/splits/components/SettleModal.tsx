import Feather from "@expo/vector-icons/Feather";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";

import type { SplitDetailItem } from "@services/splits";
import { formatCurrency } from "@shared/lib/currency";
import { fromMinorUnits, subtractMoney, toMinorUnits } from "@shared/lib/money";
import { Button } from "@shared/ui/Button";
import { Text } from "@shared/ui/Text";
import { TextField } from "@shared/ui/TextField";
import { useAccountsWithBalancesQuery } from "@store/hooks";

interface SettleModalProps {
  split: SplitDetailItem | null;
  currency: string;
  onClose: () => void;
  onConfirm: (
    splitId: string,
    amount: number,
    accountId?: string | null,
    settlementMode?: "account_impact" | "off_ledger"
  ) => Promise<void>;
  isSubmitting?: boolean;
}

export function SettleModal({
  split,
  currency,
  onClose,
  onConfirm,
  isSubmitting,
}: SettleModalProps) {
  const [settlementMode, setSettlementMode] = useState<"account_impact" | "off_ledger">("off_ledger");
  const [customAmount, setCustomAmount] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const { data: accounts = [] } = useAccountsWithBalancesQuery();
  const activeAccount =
    accounts.find((a) => a.id === selectedAccountId) ??
    accounts.find((a) => a.is_default) ??
    accounts[0];

  useEffect(() => {
    if (split) {
      const rem = split.remaining_amount ?? split.share_amount;
      setCustomAmount(rem.toString());
    }
  }, [split]);

  if (!split) return null;

  const totalOriginal = split.share_amount;
  const currentRemaining = split.remaining_amount ?? split.share_amount;
  const alreadyPaid = Math.max(0, subtractMoney(totalOriginal, currentRemaining));
  const isOwedToMe = split.direction === "owed_to_me";

  const rawInput = parseFloat(customAmount) || 0;
  const parsedAmount = fromMinorUnits(toMinorUnits(rawInput));
  const remainingAfterRepay = Math.max(0, subtractMoney(currentRemaining, parsedAmount));
  const isFullSettle = remainingAfterRepay === 0;

  const isValid =
    toMinorUnits(parsedAmount) > 0 &&
    toMinorUnits(parsedAmount) <= toMinorUnits(currentRemaining);

  const presets = [
    { label: "25%", factor: 0.25 },
    { label: "50%", factor: 0.5 },
    { label: "75%", factor: 0.75 },
    { label: "Full (100%)", factor: 1.0 },
  ];

  const handlePreset = (fraction: number) => {
    const val = fromMinorUnits(Math.round(toMinorUnits(currentRemaining) * fraction));
    setCustomAmount(val.toString());
  };

  // Visual calculation of bar percentages
  const alreadyPaidPercent = totalOriginal > 0 ? Math.min(100, Math.round((alreadyPaid / totalOriginal) * 100)) : 0;
  const payingNowPercent = totalOriginal > 0 ? Math.min(100 - alreadyPaidPercent, Math.round((parsedAmount / totalOriginal) * 100)) : 0;
  const remainingPercent = Math.max(0, 100 - alreadyPaidPercent - payingNowPercent);

  const handleConfirm = async () => {
    if (submittingRef.current || isSubmitting || !isValid || !split) return;
    submittingRef.current = true;
    try {
      const accId = settlementMode === "account_impact" ? activeAccount?.id : null;
      await onConfirm(split.id, parsedAmount, accId, settlementMode);
      onClose();
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <Modal
      visible={Boolean(split)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} className="flex-1 bg-black/60 justify-center p-5">
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-surface rounded-3xl p-6 border border-surface-border shadow-2xl max-h-[92%]"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3.5 border-b border-surface-border">
            <View className="flex-row items-center gap-2.5">
              <View className="w-9 h-9 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center">
                <Feather name="check-circle" size={17} color="#22C55E" />
              </View>
              <View>
                <Text className="text-base font-black text-ink tracking-tight">
                  Record Settlement
                </Text>
                <Text className="text-xs font-medium text-ink-muted">
                  {isOwedToMe
                    ? `Payment from ${split.member_name}`
                    : `Repayment to ${split.member_name}`}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close settlement modal"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="w-8 h-8 rounded-full bg-surface-muted border border-surface-border items-center justify-center active:scale-95"
            >
              <Feather name="x" size={15} color="#A1A1AA" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 12 }}
          >
            {/* 1. Monolith Amount & Settlement Progress Card */}
            <View className="p-4 rounded-2xl bg-surface-muted border border-surface-border mb-4">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-[11px] font-bold text-ink-whisper uppercase tracking-wider">
                  Remaining Open Debt
                </Text>
                {alreadyPaid > 0 && (
                  <View className="px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30">
                    <Text className="text-[10px] font-bold text-primary">
                      {alreadyPaidPercent}% Settled So Far
                    </Text>
                  </View>
                )}
              </View>

              <Text className="text-3xl font-black text-ink tabular-nums">
                {formatCurrency(currentRemaining, currency)}
              </Text>

              {/* Progress Visualizer */}
              <View className="mt-3">
                <View className="h-2 w-full bg-surface rounded-full overflow-hidden flex-row border border-surface-border">
                  {/* Segment 1: Already Paid */}
                  {alreadyPaidPercent > 0 && (
                    <View
                      style={{ width: `${alreadyPaidPercent}%` }}
                      className="h-full bg-zinc-400 dark:bg-zinc-600"
                    />
                  )}
                  {/* Segment 2: Paying Now */}
                  {payingNowPercent > 0 && (
                    <View
                      style={{ width: `${payingNowPercent}%` }}
                      className="h-full bg-primary"
                    />
                  )}
                  {/* Segment 3: Remaining */}
                  {remainingPercent > 0 && (
                    <View
                      style={{ width: `${remainingPercent}%` }}
                      className="h-full bg-transparent"
                    />
                  )}
                </View>

                {/* Progress Legend */}
                <View className="flex-row items-center justify-between mt-2 pt-1">
                  <Text className="text-[10px] font-medium text-ink-muted">
                    Total Tab: <Text className="font-bold text-ink">{formatCurrency(totalOriginal, currency)}</Text>
                  </Text>
                  {alreadyPaid > 0 && (
                    <Text className="text-[10px] font-medium text-ink-muted">
                      Paid: <Text className="font-bold text-primary">{formatCurrency(alreadyPaid, currency)}</Text>
                    </Text>
                  )}
                  <Text className="text-[10px] font-medium text-ink-muted">
                    Paying: <Text className="font-bold text-ink">{formatCurrency(parsedAmount, currency)}</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* 2. Quick Fraction Selector (1-Tap Automation) */}
            <Text className="text-[11px] font-bold text-ink-whisper tracking-wider uppercase mb-2 px-1">
              Select Settlement Portion
            </Text>
            <View className="flex-row gap-2 mb-3">
              {presets.map((preset) => {
                const presetVal = fromMinorUnits(Math.round(toMinorUnits(currentRemaining) * preset.factor));
                const isSelected = parsedAmount === presetVal;
                return (
                  <Pressable
                    key={preset.label}
                    onPress={() => handlePreset(preset.factor)}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    className={`flex-1 py-2 rounded-xl border items-center active:scale-95 ${
                      isSelected
                        ? "bg-primary border-primary"
                        : "bg-surface border-surface-border"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? "text-white" : "text-ink"
                      }`}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* 3. Custom Amount Input */}
            <Text className="text-[11px] font-bold text-ink-whisper tracking-wider uppercase mb-1.5 px-1">
              Custom Amount ({currency})
            </Text>
            <TextField
              value={customAmount}
              onChangeText={setCustomAmount}
              placeholder="0.00"
              keyboardType="numeric"
              className="mb-3"
            />

            {/* 4. Real-time Consequence Card */}
            <View
              className={`p-3.5 rounded-2xl border mb-4 ${
                isFullSettle
                  ? "bg-primary/10 border-primary/25"
                  : "bg-surface-muted border-surface-border"
              }`}
            >
              <View className="flex-row items-center gap-2">
                <Feather
                  name={isFullSettle ? "check-circle" : "clock"}
                  size={14}
                  color={isFullSettle ? "#22C55E" : "#EAB308"}
                />
                <Text
                  className={`text-xs font-bold ${
                    isFullSettle ? "text-primary" : "text-ink"
                  }`}
                >
                  {isFullSettle
                    ? "Full Settlement (Closes this tab completely)"
                    : `Partial Settlement (${formatCurrency(remainingAfterRepay, currency)} will remain open)`}
                </Text>
              </View>
            </View>

            {/* 5. Simplified Payment Route (2 Clear Pills — No Jargon) */}
            <Text className="text-[11px] font-bold text-ink-whisper tracking-wider uppercase mb-2 px-1">
              Payment Method
            </Text>
            <View className="flex-row gap-2 mb-4">
              <Pressable
                onPress={() => setSettlementMode("off_ledger")}
                className={`flex-1 p-3 rounded-2xl border active:scale-98 ${
                  settlementMode === "off_ledger"
                    ? "bg-zinc-900 dark:bg-zinc-100 border-transparent shadow-xs"
                    : "bg-surface border-surface-border"
                }`}
              >
                <View className="flex-row items-center gap-2 mb-0.5">
                  <Feather
                    name="dollar-sign"
                    size={14}
                    color={settlementMode === "off_ledger" ? (settlementMode === "off_ledger" ? "#22C55E" : "#A1A1AA") : "#A1A1AA"}
                  />
                  <Text
                    className={`text-xs font-bold ${
                      settlementMode === "off_ledger"
                        ? "text-white dark:text-zinc-900"
                        : "text-ink"
                    }`}
                  >
                    Direct / Cash
                  </Text>
                </View>
                <Text
                  className={`text-[10px] ${
                    settlementMode === "off_ledger"
                      ? "text-zinc-300 dark:text-zinc-600"
                      : "text-ink-muted"
                  }`}
                >
                  Handed in person
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSettlementMode("account_impact")}
                className={`flex-1 p-3 rounded-2xl border active:scale-98 ${
                  settlementMode === "account_impact"
                    ? "bg-zinc-900 dark:bg-zinc-100 border-transparent shadow-xs"
                    : "bg-surface border-surface-border"
                }`}
              >
                <View className="flex-row items-center gap-2 mb-0.5">
                  <Feather
                    name="credit-card"
                    size={14}
                    color={settlementMode === "account_impact" ? "#22C55E" : "#A1A1AA"}
                  />
                  <Text
                    className={`text-xs font-bold ${
                      settlementMode === "account_impact"
                        ? "text-white dark:text-zinc-900"
                        : "text-ink"
                    }`}
                  >
                    Bank / Wallet
                  </Text>
                </View>
                <Text
                  className={`text-[10px] ${
                    settlementMode === "account_impact"
                      ? "text-zinc-300 dark:text-zinc-600"
                      : "text-ink-muted"
                  }`}
                >
                  Update balance
                </Text>
              </Pressable>
            </View>

            {/* Optional Account Picker (Only if Bank / Wallet selected) */}
            {settlementMode === "account_impact" && (
              <View className="mb-4">
                <Text className="text-[11px] font-bold text-ink-whisper tracking-wider uppercase mb-1.5 px-1">
                  {isOwedToMe ? "Deposit Into Account" : "Pay From Account"}
                </Text>
                <View className="gap-1.5">
                  {accounts.map((acc) => {
                    const isSelected = activeAccount?.id === acc.id;
                    return (
                      <Pressable
                        key={acc.id}
                        onPress={() => setSelectedAccountId(acc.id)}
                        className={`p-3 rounded-xl border flex-row items-center justify-between ${
                          isSelected
                            ? "bg-surface-muted border-primary"
                            : "bg-surface border-surface-border"
                        }`}
                      >
                        <Text className="text-xs font-bold text-ink">
                          {acc.name}
                        </Text>
                        {isSelected && (
                          <Feather name="check" size={14} color="#22C55E" />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 6. Action Buttons */}
            <View className="gap-2.5 mt-2">
              <Button
                label={`Confirm ${formatCurrency(parsedAmount, currency)} ${
                  isFullSettle ? "(Full Settlement)" : "(Partial)"
                }`}
                onPress={handleConfirm}
                disabled={!isValid || Boolean(isSubmitting)}
                loading={isSubmitting}
              />
              <Button
                label="Cancel"
                variant="secondary"
                onPress={onClose}
                disabled={isSubmitting}
              />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
