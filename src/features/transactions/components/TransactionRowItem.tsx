import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { memo } from "react";
import { Pressable, Text, View } from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";

import { formatCurrency } from "@shared/lib/currency";
import type { TransactionRowItemProps } from "@shared/types/models";

interface VisualCategoryConfig {
  bg: string;
  border: string;
  iconColor: string;
  renderIcon: () => React.ReactNode;
}

function resolveVisualTheme(
  categoryName?: string,
  txType?: string,
  isPositive?: boolean,
): VisualCategoryConfig {
  if (isPositive || txType === "income") {
    return {
      bg: "bg-[#E8F7EE] dark:bg-emerald-950/40",
      border: "border-emerald-500/20",
      iconColor: "#0D6B3A",
      renderIcon: () => <Feather name="dollar-sign" size={20} color="#0D6B3A" />,
    };
  }

  if (txType === "transfer") {
    return {
      bg: "bg-[#EEF4FF] dark:bg-blue-950/40",
      border: "border-blue-500/20",
      iconColor: "#2563EB",
      renderIcon: () => <Feather name="repeat" size={19} color="#2563EB" />,
    };
  }

  const lower = (categoryName || "").toLowerCase();

  // 1. Food & Drinks / Coffee / Bakery / Dining
  if (
    lower.includes("food") ||
    lower.includes("coffee") ||
    lower.includes("bakery") ||
    lower.includes("drink") ||
    lower.includes("dining") ||
    lower.includes("restaurant") ||
    lower.includes("cafe")
  ) {
    return {
      bg: "bg-[#FEF6EE] dark:bg-amber-950/40",
      border: "border-amber-500/20",
      iconColor: "#D97706",
      renderIcon: () => <Feather name="coffee" size={19} color="#D97706" />,
    };
  }

  // 2. Groceries / Market / Shopping
  if (
    lower.includes("grocer") ||
    lower.includes("market") ||
    lower.includes("shop") ||
    lower.includes("supermarket") ||
    lower.includes("store")
  ) {
    return {
      bg: "bg-[#E8F7EE] dark:bg-emerald-950/40",
      border: "border-emerald-500/20",
      iconColor: "#0D6B3A",
      renderIcon: () => <Feather name="shopping-bag" size={19} color="#0D6B3A" />,
    };
  }

  // 3. Housing / Rent / Home / Utilities / Bills
  if (
    lower.includes("house") ||
    lower.includes("rent") ||
    lower.includes("home") ||
    lower.includes("apartment") ||
    lower.includes("util") ||
    lower.includes("bill")
  ) {
    return {
      bg: "bg-[#EEF4FF] dark:bg-blue-950/40",
      border: "border-blue-500/20",
      iconColor: "#2563EB",
      renderIcon: () => <Feather name="home" size={19} color="#2563EB" />,
    };
  }

  // 4. Transit / Transport / Travel / Fuel / Commute
  if (
    lower.includes("transit") ||
    lower.includes("transport") ||
    lower.includes("travel") ||
    lower.includes("fuel") ||
    lower.includes("uber") ||
    lower.includes("commute") ||
    lower.includes("car")
  ) {
    return {
      bg: "bg-[#F0F9FF] dark:bg-sky-950/40",
      border: "border-sky-500/20",
      iconColor: "#0284C7",
      renderIcon: () => <Feather name="navigation" size={19} color="#0284C7" />,
    };
  }

  // 5. Entertainment / Movies / Games / Streaming
  if (
    lower.includes("entertain") ||
    lower.includes("movie") ||
    lower.includes("game") ||
    lower.includes("music") ||
    lower.includes("subscrip")
  ) {
    return {
      bg: "bg-[#FDF2F8] dark:bg-pink-950/40",
      border: "border-pink-500/20",
      iconColor: "#DB2777",
      renderIcon: () => <Feather name="film" size={19} color="#DB2777" />,
    };
  }

  // Default Fallback
  return {
    bg: "bg-surface-muted dark:bg-surface-muted",
    border: "border-surface-border",
    iconColor: "#6B6B6E",
    renderIcon: () => <Feather name="credit-card" size={19} color="#6B6B6E" />,
  };
}

function TransactionRowItemComponent({
  item,
  onPress,
  onDelete,
}: TransactionRowItemProps) {
  const isPositive = item.amount > 0 || item.type === "income";
  const isTransfer = item.type === "transfer";
  const isPending = item.status === "pending";
  const isCancelled = item.status === "cancelled";

  const visual = resolveVisualTheme(item.categoryName, item.type, isPositive);

  // Subtitle: e.g. "Groceries · Today, 10:14 AM" or "Contract · Yesterday"
  const dateFormatted = item.time ? `${item.dateStr}, ${item.time}` : item.dateStr;
  const subtitle = `${item.categoryName || "General"} · ${dateFormatted}`;

  // Payment method / Account label in uppercase: e.g. "DEBIT CARD", "DIRECT DEPOSIT", "APPLE PAY", "TRANSFER"
  const methodLabel = isTransfer
    ? "TRANSFER"
    : isPositive
    ? item.accountName?.toUpperCase() || "DIRECT DEPOSIT"
    : item.accountName?.toUpperCase() || "DEBIT CARD";

  const renderRightActions = () => {
    if (!onDelete) return null;
    return (
      <Pressable
        onPress={() => onDelete(item)}
        accessibilityRole="button"
        accessibilityLabel={`Delete or reverse transaction ${item.name}`}
        className="bg-rose-500 justify-center items-center w-20 rounded-2xl ml-2 active:opacity-90"
      >
        <Feather name="trash-2" size={18} color="#FFFFFF" />
        <Text className="text-[10px] font-bold text-white mt-1">Delete</Text>
      </Pressable>
    );
  };

  const content = (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.categoryName}, ${
        isTransfer ? "Transfer" : isPositive ? "Income" : "Expense"
      } of ${Math.abs(item.amount)} ${item.currency}`}
      className="bg-surface rounded-2xl p-4 border border-surface-border shadow-2xs mb-2.5 active:scale-[0.99]"
    >
      <View className="flex-row items-center justify-between">
        {/* Left: Category Squircle Icon Badge & Title / Subtitle */}
        <View className="flex-row items-center gap-3.5 flex-1 mr-3">
          {/* Squircle Icon Box */}
          <View
            className={`w-12 h-12 rounded-2xl ${visual.bg} border ${visual.border} items-center justify-center`}
          >
            {visual.renderIcon()}
          </View>

          {/* Name & Subtitle */}
          <View className="flex-1">
            <Text
              numberOfLines={1}
              className="text-[15px] font-black text-ink tracking-tight"
            >
              {item.name}
            </Text>

            <View className="flex-row items-center gap-1 mt-0.5 flex-wrap">
              <Text
                numberOfLines={1}
                className="text-xs font-semibold text-[#667085] dark:text-ink-muted"
              >
                {subtitle}
              </Text>

              {isPending && (
                <Text className="text-[10px] font-bold text-amber-500 uppercase">
                  · Pending
                </Text>
              )}

              {isCancelled && (
                <Text className="text-[10px] font-bold text-coral uppercase">
                  · Cancelled
                </Text>
              )}

              {item.isGroup && (
                <Text className="text-[10px] font-bold text-blue-500 uppercase">
                  · Split
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Right: Amount & Uppercase Payment Method Tag */}
        <View className="items-end pl-2">
          <Text
            className={`text-base font-black tracking-tight tabular-nums text-right ${
              isPositive
                ? "text-[#0D6B3A] dark:text-emerald-400"
                : "text-ink"
            }`}
          >
            {isPositive ? "+" : "-"}
            {formatCurrency(Math.abs(item.amount), item.currency)}
          </Text>

          <Text
            numberOfLines={1}
            className={`text-[10px] font-black uppercase tracking-wider text-right mt-1 ${
              isPositive
                ? "text-[#0D6B3A] dark:text-emerald-400"
                : "text-[#475467] dark:text-ink-muted"
            }`}
          >
            {methodLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  if (onDelete) {
    return (
      <Swipeable
        renderRightActions={renderRightActions}
        overshootRight={false}
        containerStyle={{ overflow: "hidden" }}
      >
        {content}
      </Swipeable>
    );
  }

  return content;
}

export const TransactionRowItem = memo(TransactionRowItemComponent);
