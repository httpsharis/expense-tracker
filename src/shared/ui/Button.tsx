import { useColorScheme } from "nativewind";
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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
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
        <View className="h-14 w-full rounded-2xl flex-row items-center justify-center bg-primary shadow-sm active:scale-98">
          {loading ? (
            <ActivityIndicator color={isDark ? "#0A0A0B" : "#FFFFFF"} />
          ) : (
            <Text
              className={`text-[15px] font-bold text-btn-text ${textClassName}`}
            >
              {label}
            </Text>
          )}
        </View>
      ) : (
        <View className="h-14 w-full rounded-2xl flex-row items-center justify-center bg-surface border border-surface-border px-4 gap-3 shadow-2xs active:scale-98">
          {loading ? (
            <ActivityIndicator color="#71717A" />
          ) : (
            <>
              {icon && (
                <View className="items-center justify-center">{icon}</View>
              )}
              <Text
                className={`text-[15px] font-semibold text-ink ${textClassName}`}
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
