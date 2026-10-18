import { Modal, Pressable, Text, View } from "react-native";

import { formatCurrency } from "@shared/lib/currency";
import type { TransactionDetailModalProps } from "../types";

export function TransactionDetailModal({
  transaction,
  onClose,
  onDelete,
  onEdit,
}: TransactionDetailModalProps) {
  if (!transaction) return null;

  return (
    <Modal
      visible={Boolean(transaction)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} className="flex-1 bg-black/40 justify-end">
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-white rounded-t-3xl p-6 pb-10"
        >
          {/* Header */}
          <View className="items-center pb-4 border-b border-gray-100">
            <View className="w-16 h-16 rounded-2xl bg-[#F8F9FB] border border-gray-200/80 items-center justify-center mb-3">
              <Text className="text-3xl">{transaction.categoryIcon}</Text>
            </View>
            <Text className="text-lg font-extrabold text-[#0F172A] text-center">
              {transaction.name}
            </Text>
            <Text className="text-2xl font-black text-[#0F172A] mt-1 tabular-nums">
              {formatCurrency(transaction.amount, transaction.currency, {
                showPositivePrefix: true,
              })}
            </Text>
          </View>

          {/* Details Table */}
          <View className="py-4 gap-3">
            <View className="flex-row justify-between">
              <Text className="text-xs text-[#64748B]">Type</Text>
              <Text className="text-xs font-bold text-[#0F172A] capitalize">
                {transaction.type}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-[#64748B]">Category</Text>
              <Text className="text-xs font-bold text-[#0F172A]">
                {transaction.categoryName}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-[#64748B]">Account</Text>
              <Text className="text-xs font-bold text-[#0F172A]">
                {transaction.accountName}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-[#64748B]">Input Method</Text>
              <Text className="text-xs font-bold text-[#0F172A] capitalize">
                {transaction.inputMethod}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-[#64748B]">Date &amp; Time</Text>
              <Text className="text-xs font-bold text-[#0F172A]">
                {transaction.dateStr}, {transaction.time}
              </Text>
            </View>
            {transaction.note ? (
              <View className="pt-2 border-t border-gray-50">
                <Text className="text-xs text-[#64748B] mb-1">Note</Text>
                <Text className="text-xs font-medium text-[#0F172A]">
                  {transaction.note}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Action Buttons */}
          <View className="flex-row items-center gap-2.5 mt-2">
            {onDelete ? (
              <Pressable
                onPress={() => onDelete(transaction)}
                className="flex-1 h-12 rounded-2xl bg-rose-50 border border-rose-200 items-center justify-center active:opacity-75"
              >
                <Text className="text-xs font-bold text-rose-600">Delete</Text>
              </Pressable>
            ) : null}
            {onEdit ? (
              <Pressable
                onPress={() => onEdit(transaction)}
                className="flex-1 h-12 rounded-2xl bg-white border border-[#E4E7EC] items-center justify-center active:opacity-75 shadow-2xs"
              >
                <Text className="text-xs font-bold text-[#0F172A]">Edit</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onClose}
              className={`h-12 rounded-2xl bg-[#0F172A] items-center justify-center active:opacity-85 ${
                onDelete || onEdit ? "flex-1" : "w-full"
              }`}
            >
              <Text className="text-xs font-bold text-white">Done</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
