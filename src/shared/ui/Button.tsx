import React from "react";
import {
    ActivityIndicator,
    Pressable,
    PressableProps,
    Text,
    View,
} from "react-native";

export interface ButtonProps extends Omit<PressableProps, "style"> {
  label: string;
  variant?: "primary" | "secondary" | "social";
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
  textClassName?: string;
}

export function Button({
  label,
  variant = "primary",
  loading = false,
  icon,
  disabled,
  className = "",
  textClassName = "",
  ...pressableProps
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      className={`w-full active:opacity-80 ${isDisabled ? "opacity-50" : ""} ${className}`}
      {...pressableProps}
    >
      {variant === "primary" ? (
        <View className="h-[52px] w-full rounded-xl flex-row items-center justify-center bg-[#4E4E52] dark:bg-[#F2F2F7]">
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text
              className={`font-body-medium text-[16px] font-semibold text-white dark:text-neutral-900 ${textClassName}`}
            >
              {label}
            </Text>
          )}
        </View>
      ) : (
        <View className="h-[52px] w-full rounded-xl flex-row items-center justify-center bg-white dark:bg-[#18181B] border border-[#D1D1D6] dark:border-[#2C2C2E] px-4 gap-3">
          {loading ? (
            <ActivityIndicator color="#8E8E93" />
          ) : (
            <>
              {icon && (
                <View className="items-center justify-center">{icon}</View>
              )}
              <Text
                className={`font-body-medium text-[16px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] ${textClassName}`}
              >
                {label}
              </Text>
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}
