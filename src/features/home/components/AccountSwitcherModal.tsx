import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { formatCurrency } from "@shared/lib/currency";
import type { AccountSwitcherModalProps } from "../types";

export function AccountSwitcherModal({
  visible,
  accounts,
  selectedAccountId,
  totalBalance,
  baseCurrency,
  onSelectAccount,
  onClose,
}: AccountSwitcherModalProps) {
  const router = useRouter();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} className="flex-1 bg-black/40 justify-end">
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-white rounded-t-3xl p-6 pb-10 max-h-[80%]"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-gray-100">
            <View>
              <Text className="text-base font-extrabold text-[#0F172A]">
                Select Active Account
              </Text>
              <Text className="text-xs text-[#94A3B8] mt-0.5">
                Filter your dashboard and transactions
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center active:opacity-70"
            >
              <Feather name="x" size={16} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
            <View className="gap-2.5">
              {/* Option 1: All Accounts Combined */}
              <Pressable
                onPress={() => {
                  onSelectAccount(null);
                  onClose();
                }}
                className={`flex-row items-center justify-between p-4 rounded-2xl border ${
                  selectedAccountId === null
                    ? "border-[#D4F938] bg-[#D4F938]/15"
                    : "border-gray-100 bg-[#F8F9FB]"
                } active:scale-[0.99]`}
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-xl bg-white items-center justify-center shadow-xs">
                    <Feather name="layers" size={18} color="#0F172A" />
                  </View>
                  <View>
                    <Text className="text-sm font-bold text-[#0F172A]">
                      All Accounts Combined
                    </Text>
                    <Text className="text-xs text-[#64748B]">
                      Total Liquid Portfolio
                    </Text>
                  </View>
                </View>

                <Text className="text-sm font-black text-[#0F172A] tabular-nums">
                  {formatCurrency(totalBalance, baseCurrency)}
                </Text>
              </Pressable>

              {/* Individual Account Options */}
              {accounts.map((acc) => {
                const isSelected = selectedAccountId === acc.id;
                return (
                  <Pressable
                    key={acc.id}
                    onPress={() => {
                      onSelectAccount(acc.id);
                      onClose();
                    }}
                    className={`flex-row items-center justify-between p-4 rounded-2xl border ${
                      isSelected
                        ? "border-[#D4F938] bg-[#D4F938]/15"
                        : "border-gray-100 bg-[#F8F9FB]"
                    } active:scale-[0.99]`}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-xl bg-white items-center justify-center shadow-xs">
                        <Ionicons
                          name={
                            acc.type === "cash"
                              ? "cash-outline"
                              : acc.type === "wallet"
                                ? "wallet-outline"
                                : "card-outline"
                          }
                          size={19}
                          color="#0F172A"
                        />
                      </View>
                      <View>
                        <Text className="text-sm font-bold text-[#0F172A]">
                          {acc.name}
                        </Text>
                        <Text className="text-xs text-[#64748B] capitalize">
                          {acc.type} • {acc.currency}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-sm font-black text-[#0F172A] tabular-nums">
                      {formatCurrency(acc.balance, acc.currency)}
                    </Text>
                  </Pressable>
                );
              })}

              {/* Manage Accounts Action Button */}
              <Pressable
                onPress={() => {
                  onClose();
                  router.push("/(root)/Accounts" as any);
                }}
                className="flex-row items-center justify-center gap-2 p-3.5 mt-2 rounded-2xl bg-[#0F172A] active:opacity-85"
              >
                <Feather name="external-link" size={15} color="#FFFFFF" />
                <Text className="text-xs font-bold text-white">
                  Manage Bank, Cash & Wallets
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
