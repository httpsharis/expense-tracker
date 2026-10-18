import React from "react";
import { Text, View } from "react-native";

import { formatCurrency } from "@shared/lib/currency";
import type { AccountTotalBannerProps } from "../types";

export function AccountTotalBanner({
  totalBalance,
  accountsCount,
  currency,
}: AccountTotalBannerProps) {
  return (
    <View className="px-6 mt-2 mb-4">
      <View className="bg-surface rounded-3xl p-5 border border-surface-border shadow-2xs">
        {/* Top Header Row: Green Dot + Uppercase Label + Active Accounts Pill */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <View className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-primary" />
            <Text className="text-xs font-black uppercase tracking-wider text-[#525866] dark:text-ink-muted">
              Total Assets
            </Text>
          </View>

          <View className="px-3 py-1 rounded-full bg-[#EEF2F6] dark:bg-surface-muted border border-surface-border">
            <Text className="text-xs font-bold text-[#344054] dark:text-ink">
              {accountsCount} {accountsCount === 1 ? "Account" : "Accounts"} Active
            </Text>
          </View>
        </View>

        {/* Big Bold Readout */}
        <Text className="text-3xl font-black text-ink tracking-tight tabular-nums mt-1">
          {formatCurrency(totalBalance, currency)}
        </Text>

        <Text className="text-xs font-semibold text-[#667085] dark:text-ink-muted mt-1">
          Total liquid balance across all active ledgers
        </Text>
      </View>
    </View>
  );
}
