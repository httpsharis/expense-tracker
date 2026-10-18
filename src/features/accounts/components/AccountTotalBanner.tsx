import { Text, View } from "react-native";

import { formatCurrency } from "@shared/lib/currency";
import { AccountTotalBannerProps } from "../types";

export function AccountTotalBanner({
  totalBalance,
  accountsCount,
  currency,
}: AccountTotalBannerProps) {
  return (
    <View className="px-6 mt-2 mb-4">
      <View className="bg-white rounded-3xl p-5 border border-[#E4E7EC] shadow-xs">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-medium text-[#64748B]">
            Total balance
          </Text>
          <View className="flex-row items-center gap-1.5">
            <View className="w-2 h-2 rounded-full bg-emerald-500" />
            <Text className="text-xs font-medium text-[#64748B]">
              {accountsCount} {accountsCount === 1 ? "account" : "accounts"}
            </Text>
          </View>
        </View>

        <Text className="text-3xl font-black text-[#090D16] tracking-tight tabular-nums mt-1.5">
          {formatCurrency(totalBalance, currency)}
        </Text>
      </View>
    </View>
  );
}
