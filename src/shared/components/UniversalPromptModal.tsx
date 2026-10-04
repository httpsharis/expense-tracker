import Feather from "@expo/vector-icons/Feather";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";

import { PromptVariant, usePromptStore } from "../../../store/promptStore";

interface VariantConfig {
  iconName: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBg: string;
  confirmBtnBg: string;
}

const VARIANT_CONFIGS: Record<PromptVariant, VariantConfig> = {
  danger: {
    iconName: "trash-2",
    iconColor: "#E11D48",
    iconBg: "bg-rose-50 border border-rose-100",
    confirmBtnBg: "bg-rose-600 active:bg-rose-700",
  },
  warning: {
    iconName: "alert-triangle",
    iconColor: "#D97706",
    iconBg: "bg-amber-50 border border-amber-100",
    confirmBtnBg: "bg-[#090D16] active:opacity-85",
  },
  info: {
    iconName: "info",
    iconColor: "#2563EB",
    iconBg: "bg-blue-50 border border-blue-100",
    confirmBtnBg: "bg-[#090D16] active:opacity-85",
  },
  success: {
    iconName: "check",
    iconColor: "#059669",
    iconBg: "bg-emerald-50 border border-emerald-100",
    confirmBtnBg: "bg-[#090D16] active:opacity-85",
  },
  default: {
    iconName: "help-circle",
    iconColor: "#090D16",
    iconBg: "bg-gray-100 border border-gray-200",
    confirmBtnBg: "bg-[#090D16] active:opacity-85",
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
          className="w-full max-w-[340px] bg-white rounded-[28px] p-6 shadow-2xl border border-gray-100"
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
          <Text className="text-lg font-black text-[#090D16] tracking-tight">
            {options.title}
          </Text>

          {/* Message Description */}
          {options.message ? (
            <Text className="text-sm font-medium text-[#525866] leading-relaxed mt-2">
              {options.message}
            </Text>
          ) : null}

          {/* Action Buttons */}
          {options.isAlert ? (
            <Pressable
              onPress={() => close(true)}
              accessibilityRole="button"
              accessibilityLabel={options.confirmText || "Understood"}
              className="w-full h-12 rounded-2xl bg-[#090D16] items-center justify-center mt-6 active:opacity-85 shadow-xs"
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
                className="flex-1 h-12 rounded-2xl bg-[#F4F5F7] border border-[#E4E7EC] items-center justify-center active:bg-gray-200"
              >
                <Text className="text-sm font-bold text-[#525866]">
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
