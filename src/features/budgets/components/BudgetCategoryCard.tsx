import Feather from "@expo/vector-icons/Feather";
import { formatCurrency } from "@shared/lib/currency";
import { Pressable, Text, View } from "react-native";
import type { BudgetCardProps } from "../types";

export function BudgetCard({
  item,
  currency = "PKR",
  onPress,
  onEdit,
}: BudgetCardProps) {
  const {
    name,
    amount,
    spent,
    remaining,
    percent,
    isExceeded,
    periodLabel,
    category,
    account,
  } = item;

  // Thin progress bar along bottom edge
  // Filling left to right as spending approaches limit, going gold (#D4F938) when exceeded
  const progressWidth = Math.min(percent, 100);
  const progressBarColor = isExceeded ? "#D4F938" : "#090D16";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View details for ${name} budget`}
      className="bg-white rounded-2xl p-4 mb-3 border border-[#E4E7EC] shadow-xs active:bg-[#F9FAFC] overflow-hidden relative"
    >
      {/* Single row split in two */}
      <View className="flex-row items-center justify-between pb-1.5">
        {/* Left Side: Large spent amount text & limit subtext */}
        <View className="flex-1 mr-3">
          <Text className="text-2xl font-black text-[#090D16] tracking-tight tabular-nums">
            {formatCurrency(spent, currency, { maximumFractionDigits: 0 })}
          </Text>
          <Text
            className="text-xs font-semibold text-[#64748B] mt-0.5"
            numberOfLines={1}
          >
            of {formatCurrency(amount, currency, { maximumFractionDigits: 0 })}{" "}
            limit • {name}
          </Text>
          <Text
            className="text-[11px] font-bold text-[#64748B] mt-1"
            numberOfLines={1}
          >
            {isExceeded ? (
              <Text className="text-[#E11D48]">
                +
                {formatCurrency(spent - amount, currency, {
                  maximumFractionDigits: 0,
                })}{" "}
                over limit
              </Text>
            ) : (
              `${formatCurrency(remaining, currency, { maximumFractionDigits: 0 })} left`
            )}{" "}
            • {item.daysRemaining}d left •{" "}
            {formatCurrency(item.safeDailySpend, currency, {
              maximumFractionDigits: 0,
            })}
            /d
          </Text>
        </View>

        {/* Right Side: Period label in smaller text above or below scope tag */}
        <View className="items-end gap-1.5">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-xs font-bold text-[#64748B]">
              {periodLabel}
            </Text>
            {onEdit && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                hitSlop={8}
                className="w-6 h-6 rounded-full bg-[#F4F5F7] items-center justify-center active:bg-gray-200"
              >
                <Feather name="edit-2" size={11} color="#090D16" />
              </Pressable>
            )}
          </View>

          {/* Scope badges (Category / Account / All) */}
          <View className="flex-row items-center gap-1">
            {category ? (
              <View className="flex-row items-center gap-1 bg-[#F4F5F7] px-2 py-0.5 rounded-md">
                <Text className="text-[10px]">{category.icon || "🏷️"}</Text>
                <Text
                  className="text-[10px] font-bold text-[#090D16]"
                  numberOfLines={1}
                >
                  {category.name}
                </Text>
              </View>
            ) : account ? (
              <View className="flex-row items-center gap-1 bg-[#F4F5F7] px-2 py-0.5 rounded-md">
                <Text className="text-[10px]">🏦</Text>
                <Text
                  className="text-[10px] font-bold text-[#090D16]"
                  numberOfLines={1}
                >
                  {account.name}
                </Text>
              </View>
            ) : (
              <View className="bg-[#F4F5F7] px-2 py-0.5 rounded-md">
                <Text className="text-[10px] font-bold text-[#64748B]">
                  All Spending
                </Text>
              </View>
            )}

            {isExceeded ? (
              <View className="bg-[#D4F938] px-1.5 py-0.5 rounded-md">
                <Text className="text-[9px] font-black text-[#090D16]">
                  EXCEEDED
                </Text>
              </View>
            ) : (
              <Text className="text-[10px] font-semibold text-[#64748B] tabular-nums">
                {percent}%
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Thin progress bar running along the bottom edge of the card */}
      <View className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#F4F5F7]">
        <View
          style={{
            width: `${progressWidth}%`,
            backgroundColor: progressBarColor,
          }}
          className="h-full"
        />
      </View>
    </Pressable>
  );
}

// Backward-compatible alias
export const BudgetCategoryCard = BudgetCard;
