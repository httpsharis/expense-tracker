import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CategoryIcon } from "@shared/components/CategoryIcon";
import { copyToClipboard } from "@shared/lib/clipboard";
import { formatCurrency } from "@shared/lib/currency";
import type { TransactionDetailModalProps } from "@shared/types/models";
import { canEditTransaction } from "../lib/buildTransactionPayload";

export function TransactionDetailModal({
  transaction,
  onClose,
  onDelete,
  onReverse,
  onEdit,
}: TransactionDetailModalProps) {
  if (!transaction) return null;

  const isCancelled = transaction.status === "cancelled";
  const isPending = transaction.status === "pending";
  const isTransfer = transaction.type === "transfer";
  const isPositive = transaction.amount > 0;
  const isReversal = Boolean(
    transaction.isReversal || transaction.name?.startsWith("[Reversal]"),
  );
  const canReverse = Boolean(onReverse && !isCancelled && !isReversal);
  const editEligibility = canEditTransaction(transaction);
  const canShowEdit = Boolean(onEdit && editEligibility.canEdit);

  const handleCopyId = async () => {
    if (transaction?.id) {
      await copyToClipboard(transaction.id);
    }
  };

  return (
    <Modal
      visible={Boolean(transaction)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} className="flex-1 bg-black/60 justify-end">
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-surface dark:bg-surface-dark rounded-t-[36px] max-h-[85%] border-t border-surface-border dark:border-surface-border-dark overflow-hidden shadow-2xl"
        >
          {/* Sheet Handle */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-surface-muted dark:bg-surface-muted-dark" />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          >
            {/* Header: Category Icon, Name, Amount */}
            <View className="items-center pt-3 pb-5 border-b border-surface-divider dark:border-surface-border-dark">
              <View className="w-16 h-16 rounded-3xl bg-surface-muted dark:bg-surface-muted-dark border border-surface-border dark:border-surface-border-dark items-center justify-center mb-3 shadow-2xs">
                <CategoryIcon
                  icon={transaction.categoryIcon}
                  size={28}
                  color={
                    isPositive
                      ? "#22C55E"
                      : isTransfer
                      ? "#3B82F6"
                      : "#10B981"
                  }
                />
              </View>

              <Text className="text-xl font-black text-ink dark:text-ink-light text-center tracking-tight">
                {transaction.name}
              </Text>

              <Text
                className={`text-3xl font-black mt-1 tabular-nums tracking-tight ${
                  isPositive
                    ? "text-emerald-600 dark:text-primary"
                    : isTransfer
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-ink dark:text-ink-light"
                }`}
              >
                {formatCurrency(transaction.amount, transaction.currency, {
                  showPositivePrefix: true,
                })}
              </Text>

              {/* Status & Method Badges */}
              <View className="flex-row items-center gap-1.5 mt-2.5 flex-wrap justify-center">
                {isPending && (
                  <View className="flex-row items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                    <Feather name="clock" size={10} color="#F59E0B" />
                    <Text className="text-[10px] font-black text-amber-500 uppercase">
                      Pending
                    </Text>
                  </View>
                )}

                {isCancelled && (
                  <View className="flex-row items-center gap-1 px-2.5 py-0.5 rounded-full bg-coral/10 border border-coral/30">
                    <Feather name="x-circle" size={10} color="#EF4444" />
                    <Text className="text-[10px] font-black text-coral uppercase">
                      Cancelled / Reversed
                    </Text>
                  </View>
                )}

                {isReversal && (
                  <View className="flex-row items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                    <Feather name="rotate-ccw" size={10} color="#F59E0B" />
                    <Text className="text-[10px] font-black text-amber-500">
                      Reversal Counter-Entry
                    </Text>
                  </View>
                )}

                {transaction.isGroup && (
                  <View className="flex-row items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25">
                    <Feather name="users" size={10} color="#3B82F6" />
                    <Text className="text-[10px] font-bold text-blue-500">
                      Split Bill
                    </Text>
                  </View>
                )}

                {transaction.inputMethod === "scan" && (
                  <View className="flex-row items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/25">
                    <Feather name="camera" size={10} color="#22C55E" />
                    <Text className="text-[10px] font-bold text-primary">
                      Receipt Scanned
                    </Text>
                  </View>
                )}

                {transaction.inputMethod === "voice" && (
                  <View className="flex-row items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25">
                    <Feather name="mic" size={10} color="#8B5CF6" />
                    <Text className="text-[10px] font-bold text-purple-500">
                      Voice Logged
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Comprehensive Detail Rows */}
            <View className="py-4 gap-3">
              {/* Type */}
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-ink-muted dark:text-ink-muted-dark font-medium">
                  Transaction Type
                </Text>
                <Text className="text-xs font-bold text-ink dark:text-ink-light capitalize">
                  {transaction.type}
                </Text>
              </View>

              {/* Account / Routing */}
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-ink-muted dark:text-ink-muted-dark font-medium">
                  {isTransfer ? "Transfer Path" : "Account"}
                </Text>
                {isTransfer ? (
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-xs font-bold text-ink dark:text-ink-light">
                      {transaction.accountName}
                    </Text>
                    <Feather name="arrow-right" size={11} color="#64748B" />
                    <Text className="text-xs font-black text-primary">
                      {transaction.transferAccountName || "Target Account"}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-xs font-bold text-ink dark:text-ink-light">
                    {transaction.accountName}
                  </Text>
                )}
              </View>

              {/* Category */}
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-ink-muted dark:text-ink-muted-dark font-medium">
                  Category
                </Text>
                <View className="flex-row items-center gap-1.5">
                  <CategoryIcon icon={transaction.categoryIcon} size={14} color="#22C55E" />
                  <Text className="text-xs font-bold text-ink dark:text-ink-light">
                    {transaction.categoryName}
                  </Text>
                </View>
              </View>

              {/* Date & Time */}
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-ink-muted dark:text-ink-muted-dark font-medium">
                  Date &amp; Time
                </Text>
                <Text className="text-xs font-bold text-ink dark:text-ink-light">
                  {transaction.fullDateStr || `${transaction.dateStr}, ${transaction.time}`}
                </Text>
              </View>

              {/* Tags */}
              {transaction.tags && transaction.tags.length > 0 && (
                <View className="flex-row items-start justify-between pt-1">
                  <Text className="text-xs text-ink-muted dark:text-ink-muted-dark font-medium mt-1">
                    Tags
                  </Text>
                  <View className="flex-row items-center gap-1.5 flex-wrap max-w-[220px] justify-end">
                    {transaction.tags.map((tag, idx) => (
                      <View
                        key={`${tag}-${idx}`}
                        className="px-2 py-0.5 rounded-md bg-surface-muted dark:bg-surface-muted-dark border border-surface-border dark:border-surface-border-dark"
                      >
                        <Text className="text-[10px] font-bold text-ink dark:text-ink-light">
                          #{tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Note / Memo */}
              {transaction.note && (
                <View className="pt-2 border-t border-surface-divider dark:border-surface-border-dark">
                  <Text className="text-xs text-ink-whisper dark:text-ink-whisper-dark font-medium mb-1">
                    Notes &amp; Memo
                  </Text>
                  <View className="p-3 rounded-2xl bg-surface-muted dark:bg-surface-muted-dark border border-surface-border dark:border-surface-border-dark">
                    <Text className="text-xs font-medium text-ink dark:text-ink-light leading-relaxed">
                      {transaction.note}
                    </Text>
                  </View>
                </View>
              )}

              {/* Reference ID */}
              <Pressable
                onPress={handleCopyId}
                className="flex-row items-center justify-between pt-2 border-t border-surface-divider dark:border-surface-border-dark active:opacity-75"
              >
                <Text className="text-[10px] text-ink-whisper dark:text-ink-whisper-dark uppercase font-black tracking-wider">
                  Reference ID
                </Text>
                <View className="flex-row items-center gap-1">
                  <Text className="text-[10px] font-mono text-ink-muted dark:text-ink-muted-dark">
                    {transaction.id.slice(0, 16)}...
                  </Text>
                  <Feather name="copy" size={11} color="#64748B" />
                </View>
              </Pressable>
            </View>

            {/* Lock Explanation if Amount is locked */}
            {editEligibility.lockReason ? (
              <View className="flex-row items-center gap-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 mb-2">
                <Feather name="info" size={14} color="#D97706" />
                <Text className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex-1">
                  {editEligibility.lockReason}
                </Text>
              </View>
            ) : null}

            {/* Double-Entry Ledger Callout */}
            <View className="bg-surface-muted dark:bg-surface-muted-dark border border-surface-border dark:border-surface-border-dark rounded-2xl p-3.5 my-2">
              <View className="flex-row items-center gap-1.5 mb-1">
                <Ionicons name="shield-checkmark-outline" size={14} color="#22C55E" />
                <Text className="text-xs font-black text-ink dark:text-ink-light">
                  Append-Only Double-Entry Ledger
                </Text>
              </View>
              <Text className="text-[11px] text-ink-muted dark:text-ink-muted-dark leading-relaxed">
                Transactions cannot be secretly altered or deleted. Reversing an entry writes an equal and opposite counter-entry, restoring your account balance while preserving audit history.
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="flex-row items-center gap-2.5 mt-3">
              {canReverse && (
                <Pressable
                  onPress={() => onReverse!(transaction)}
                  className="flex-1 h-12 rounded-2xl bg-coral/10 border border-coral/30 items-center justify-center active:scale-97 flex-row gap-1.5"
                >
                  <Feather name="rotate-ccw" size={14} color="#EF4444" />
                  <Text className="text-xs font-bold text-coral">
                    Post Reversal
                  </Text>
                </Pressable>
              )}

              {!canReverse && onDelete ? (
                <Pressable
                  onPress={() => onDelete(transaction)}
                  className="flex-1 h-12 rounded-2xl bg-coral/10 border border-coral/30 items-center justify-center active:scale-97"
                >
                  <Text className="text-xs font-bold text-coral">
                    Delete
                  </Text>
                </Pressable>
              ) : null}

              {canShowEdit ? (
                <Pressable
                  onPress={() => onEdit!(transaction)}
                  className="flex-1 h-12 rounded-2xl bg-surface-muted dark:bg-surface-muted-dark border border-surface-border dark:border-surface-border-dark items-center justify-center active:scale-97 shadow-2xs"
                >
                  <Text className="text-xs font-bold text-ink dark:text-ink-light">
                    Edit
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={onClose}
                className={`h-12 rounded-2xl bg-primary items-center justify-center active:scale-97 shadow-xs ${
                  canReverse || onDelete || canShowEdit ? "flex-1" : "w-full"
                }`}
              >
                <Text className="text-xs font-black text-white">
                  Done
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
