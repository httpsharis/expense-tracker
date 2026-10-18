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
          className="bg-surface dark:bg-surface-dark rounded-t-[32px] p-6 pb-10 max-h-[80%] border-t border-surface-border dark:border-surface-border-dark"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-surface-divider dark:border-surface-divider-dark">
            <View>
              <Text className="text-base font-extrabold text-ink dark:text-ink-light">
                Select Active Account
              </Text>
              <Text className="text-xs text-ink-muted dark:text-ink-muted-dark mt-0.5">
                Filter your dashboard and transactions
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="w-8 h-8 rounded-full bg-surface-muted dark:bg-surface-muted-dark border border-surface-border dark:border-surface-border-dark items-center justify-center active:opacity-70"
            >
              <Feather name="x" size={16} color="#6B6B6E" />
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
                    ? "border-primary bg-primary/10 dark:border-primary dark:bg-primary/15"
                    : "border-surface-border bg-surface-muted dark:border-surface-border-dark dark:bg-surface-muted-dark"
                } active:scale-[0.99]`}
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-xl bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-border-dark items-center justify-center shadow-xs">
                    <Feather name="layers" size={18} color="#22C55E" />
                  </View>
                  <View>
                    <Text className="text-sm font-bold text-ink dark:text-ink-light">
                      All Accounts Combined
                    </Text>
                    <Text className="text-xs text-ink-muted dark:text-ink-muted-dark">
                      Total Liquid Portfolio
                    </Text>
                  </View>
                </View>

                <Text className="text-sm font-black text-ink dark:text-ink-light tabular-nums">
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
                        ? "border-primary bg-primary/10 dark:border-primary dark:bg-primary/15"
                        : "border-surface-border bg-surface-muted dark:border-surface-border-dark dark:bg-surface-muted-dark"
                    } active:scale-[0.99]`}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-xl bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-border-dark items-center justify-center shadow-xs">
                        <Ionicons
                          name={
                            acc.type === "cash"
                              ? "cash-outline"
                              : acc.type === "wallet"
                                ? "wallet-outline"
                                : "card-outline"
                          }
                          size={19}
                          color={isSelected ? "#22C55E" : "#6B6B6E"}
                        />
                      </View>
                      <View>
                        <Text className="text-sm font-bold text-ink dark:text-ink-light">
                          {acc.name}
                        </Text>
                        <Text className="text-xs text-ink-muted dark:text-ink-muted-dark capitalize">
                          {acc.type} • {acc.currency}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-sm font-black text-ink dark:text-ink-light tabular-nums">
                      {formatCurrency(acc.balance, acc.currency)}
                    </Text>
                  </Pressable>
                );
              })}

              {/* Manage Accounts Action Button */}
              <Pressable
                onPress={() => {
                  onClose();
                  router.push("/(root)/(tabs)/Accounts");
                }}
                className="flex-row items-center justify-center gap-2 p-3.5 mt-2 rounded-2xl bg-primary active:opacity-85"
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
