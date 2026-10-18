import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";

import { formatCurrency } from "@shared/lib/currency";
import { ACCOUNT_CONFIGS, AccountCardProps } from "../types";

export function AccountCard({
  account,
  storeCurrency,
  onEdit,
  onDelete,
  onSetDefault,
}: AccountCardProps) {
  const config =
    ACCOUNT_CONFIGS[account.type as keyof typeof ACCOUNT_CONFIGS] ||
    ACCOUNT_CONFIGS.bank;
  const currencyCode = account.currency || storeCurrency || "PKR";

  return (
    <View
      className={`rounded-[28px] p-6 shadow-md overflow-hidden ${config.bgGradient}`}
    >
      {/* Top Header Row: Type Badge + Actions */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2 px-3 py-1.5 rounded-full bg-white/10">
          <Ionicons name={config.icon} size={15} color={config.accentColor} />
          <Text className="text-xs font-semibold text-white tracking-wide">
            {config.label}
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          {/* Primary Badge or Make Primary Action */}
          {account.is_default ? (
            <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4F938]">
              <View className="w-1.5 h-1.5 rounded-full bg-[#090D16]" />
              <Text className="text-[10px] font-black text-[#090D16]">
                Primary
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={() => onSetDefault(account)}
              accessibilityRole="button"
              accessibilityLabel={`Set ${account.name} as primary account`}
              className="px-3 py-1 rounded-full bg-white/10 active:bg-white/20"
            >
              <Text className="text-[10px] font-semibold text-white/80">
                Make primary
              </Text>
            </Pressable>
          )}

          {/* Edit Account Icon Button */}
          <Pressable
            onPress={() => onEdit(account)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${account.name}`}
            className="w-8 h-8 rounded-full bg-white/10 items-center justify-center active:bg-white/25"
          >
            <Feather name="edit-2" size={13} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Account Title */}
      <Text
        numberOfLines={1}
        className="text-2xl font-black text-white tracking-tight mt-1"
      >
        {account.name}
      </Text>

      <Text className="text-xs font-medium text-white/60 mt-0.5">
        {currencyCode} Account
      </Text>

      {/* Account Live Balance */}
      <View className="mt-5 mb-2">
        <Text className="text-xs text-white/60 font-medium">
          Current balance
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          className="text-3xl font-black text-white tracking-tight tabular-nums mt-0.5"
        >
          {formatCurrency(account.balance, currencyCode)}
        </Text>
      </View>

      {/* Card Footer: Context & Delete Action */}
      <View className="flex-row items-center justify-between pt-3 border-t border-white/10 mt-2">
        <Text className="text-xs text-white/60 font-medium">
          {account.is_default
            ? "Default account for expenses"
            : "Secondary account"}
        </Text>

        <Pressable
          onPress={() => onDelete(account)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${account.name}`}
          className="flex-row items-center gap-1 active:opacity-75"
        >
          <Feather name="trash-2" size={12} color="rgba(255,255,255,0.6)" />
          <Text className="text-xs font-medium text-white/60">Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}
