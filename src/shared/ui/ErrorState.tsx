import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { getErrorMessage } from "../lib/errors";

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: unknown;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Unable to load data",
  message,
  error,
  onRetry,
}: ErrorStateProps) {
  const resolvedMessage =
    message ??
    (error
      ? getErrorMessage(error, "Please check your connection and try again.")
      : "Please check your connection and try again.");

  return (
    <View className="py-12 px-6 items-center justify-center">
      <View className="w-12 h-12 rounded-2xl bg-rose-500/10 items-center justify-center mb-3">
        <Feather name="alert-circle" size={22} color="#EF4444" />
      </View>
      <Text className="text-sm font-bold text-ink text-center">
        {title}
      </Text>
      <Text className="text-xs text-ink-muted text-center mt-1 max-w-xs">
        {resolvedMessage}
      </Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry loading data"
          className="mt-4 px-4 py-2 rounded-xl bg-primary flex-row items-center gap-1.5 active:opacity-85 shadow-sm"
        >
          <Feather name="refresh-cw" size={13} color="#FFFFFF" />
          <Text className="text-xs font-bold text-white">
            Retry
          </Text>
        </Pressable>
      )}
    </View>
  );
}

