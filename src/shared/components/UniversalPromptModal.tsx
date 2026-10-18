import Feather from "@expo/vector-icons/Feather";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";

import { PromptVariant, usePromptStore } from "@store/promptStore";

interface VariantConfig {
  iconName: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBg: string;
  confirmBtnBg: string;
}

const VARIANT_CONFIGS: Record<PromptVariant, VariantConfig> = {
  danger: {
    iconName: "trash-2",
    iconColor: "#EF4444",
    iconBg: "bg-rose-500/10 border border-rose-500/20",
    confirmBtnBg: "bg-rose-600 active:bg-rose-700",
  },
  warning: {
    iconName: "alert-triangle",
    iconColor: "#F59E0B",
    iconBg: "bg-amber-500/10 border border-amber-500/20",
    confirmBtnBg: "bg-primary active:opacity-85",
  },
  info: {
    iconName: "info",
    iconColor: "#3B82F6",
    iconBg: "bg-blue-500/10 border border-blue-500/20",
    confirmBtnBg: "bg-primary active:opacity-85",
  },
  success: {
    iconName: "check",
    iconColor: "#22C55E",
    iconBg: "bg-primary/10 border border-primary/20",
    confirmBtnBg: "bg-primary active:opacity-85",
  },
  default: {
    iconName: "help-circle",
    iconColor: "#71717A",
    iconBg: "bg-surface-muted border border-surface-border",
    confirmBtnBg: "bg-primary active:opacity-85",
  },
};

export function UniversalPromptModal() {
  const isOpen = usePromptStore((s) => s.isOpen);
  const options = usePromptStore((s) => s.options);
  const isProcessing = usePromptStore((s) => s.isProcessing);
  const close = usePromptStore((s) => s.close);

  if (!isOpen) return null;

  const variant = options.variant || "default";
  const config = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.default;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!isProcessing) {
          close(options.isAlert ? true : false);
        }
      }}
    >
      <Pressable
        onPress={() => {
          if (!isProcessing) {
            close(options.isAlert ? true : false);
          }
        }}
        className="flex-1 bg-black/60 items-center justify-center px-6"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-[340px] bg-surface rounded-[28px] p-6 shadow-2xl border border-surface-border"
        >
          {/* Top Badge Icon */}
          <View
            className={`w-12 h-12 rounded-2xl items-center justify-center mb-4 ${config.iconBg}`}
          >
            <Feather
              name={config.iconName}
              size={22}
              color={config.iconColor}
            />
          </View>

          {/* Title */}
          <Text className="text-lg font-bold text-ink tracking-tight">
            {options.title}
          </Text>

          {/* Message Description */}
          {options.message ? (
            <Text className="text-sm font-normal text-ink-muted leading-relaxed mt-2">
              {options.message}
            </Text>
          ) : null}

          {/* Action Buttons */}
          {options.isAlert ? (
            <Pressable
              onPress={() => close(true)}
              accessibilityRole="button"
              accessibilityLabel={options.confirmText || "Understood"}
              className="w-full h-12 rounded-2xl bg-primary items-center justify-center mt-6 active:opacity-85 shadow-xs"
            >
              <Text className="text-sm font-bold text-white">
                {options.confirmText || "Understood"}
              </Text>
            </Pressable>
          ) : (
            <View className="flex-row items-center gap-3 mt-6">
              <Pressable
                onPress={() => close(false)}
                disabled={isProcessing}
                accessibilityRole="button"
                accessibilityLabel={options.cancelText || "Cancel"}
                className="flex-1 h-12 rounded-2xl bg-surface-muted border border-surface-border items-center justify-center active:opacity-80"
              >
                <Text className="text-sm font-semibold text-ink-muted">
                  {options.cancelText || "Cancel"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => close(true)}
                disabled={isProcessing}
                accessibilityRole="button"
                accessibilityLabel={options.confirmText || "Confirm"}
                className={`flex-1 h-12 rounded-2xl items-center justify-center shadow-xs ${config.confirmBtnBg}`}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-sm font-bold text-white">
                    {options.confirmText || "Confirm"}
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
