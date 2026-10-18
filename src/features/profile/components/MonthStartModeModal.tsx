import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import type { MonthStartMode } from "@store/userStore";

interface MonthStartModeModalProps {
  visible: boolean;
  onClose: () => void;
  currentMode: MonthStartMode;
  onSelectMode: (mode: MonthStartMode) => void;
  onStartNewMonthNow: (mode: MonthStartMode) => Promise<void> | void;
}

export function MonthStartModeModal({
  visible,
  onClose,
  currentMode,
  onSelectMode,
  onStartNewMonthNow,
}: MonthStartModeModalProps) {
  const [selected, setSelected] = useState<MonthStartMode>(currentMode);
  const [isStartingNow, setIsStartingNow] = useState(false);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Sync state when opened
  React.useEffect(() => {
    if (visible) {
      setSelected(currentMode);
      setSuccessFeedback(null);
    }
  }, [visible, currentMode]);

  const handleSave = () => {
    onSelectMode(selected);
    onClose();
  };

  const handleStartNow = async () => {
    setIsStartingNow(true);
    try {
      await onStartNewMonthNow(selected);
      setSuccessFeedback(
        selected === "zero"
          ? "Started new month cycle at 0.00!"
          : "Started new month with carried-forward balance!"
      );
      setTimeout(() => {
        onClose();
      }, 1400);
    } finally {
      setIsStartingNow(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} className="flex-1 bg-black/60 justify-end">
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-surface rounded-t-[32px] p-6 pb-10 max-h-[90%] border-t border-surface-border shadow-2xl"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-surface-divider">
            <View className="flex-1 mr-3">
              <Text className="text-lg font-black text-ink tracking-tight">
                New Month Starting Mode
              </Text>
              <Text className="text-xs font-medium text-ink-muted mt-0.5">
                Configure how balances and budgets behave each month
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close monthly rollover modal"
              className="w-8 h-8 rounded-full bg-surface-muted border border-surface-border items-center justify-center active:scale-95"
            >
              <Feather name="x" size={16} color="#6B6B6E" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="mt-4">
            {/* Success toast if triggered */}
            {successFeedback && (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                className="mb-4 p-3.5 rounded-2xl bg-primary/15 border border-primary/30 flex-row items-center gap-2.5"
              >
                <Feather name="check-circle" size={18} color="#22C55E" />
                <Text className="text-xs font-bold text-ink flex-1">
                  {successFeedback}
                </Text>
              </Animated.View>
            )}

            {/* Option 1: Carry Forward Remaining Amount */}
            <Pressable
              onPress={() => setSelected("remaining")}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected === "remaining" }}
              accessibilityLabel="Carry Forward Remaining Amount. Continuous running balance and leftover budget."
              className={`p-4 rounded-2xl border mb-3 active:scale-[0.99] ${
                selected === "remaining"
                  ? "bg-primary/10 border-primary"
                  : "bg-surface-muted border-surface-border"
              }`}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2.5">
                  <View
                    className={`w-9 h-9 rounded-xl items-center justify-center ${
                      selected === "remaining"
                        ? "bg-primary text-white"
                        : "bg-surface border border-surface-border"
                    }`}
                  >
                    <Feather
                      name="trending-up"
                      size={18}
                      color={selected === "remaining" ? "#FFFFFF" : "#6B6B6E"}
                    />
                  </View>
                  <View>
                    <Text className="text-sm font-black text-ink">
                      Carry Remaining Amount
                    </Text>
                    <Text className="text-[10px] font-bold text-primary uppercase tracking-wider">
                      Continuous Rollover (Default)
                    </Text>
                  </View>
                </View>

                <View
                  className={`w-5 h-5 rounded-full border items-center justify-center ${
                    selected === "remaining"
                      ? "border-primary bg-primary"
                      : "border-surface-border bg-surface"
                  }`}
                >
                  {selected === "remaining" && (
                    <View className="w-2 h-2 rounded-full bg-white" />
                  )}
                </View>
              </View>

              <Text className="text-xs text-ink-muted leading-relaxed pl-11">
                Your remaining bank/cash balance carries forward seamlessly.
                Leftover unspent budget from the previous month is added to your
                new month&apos;s spending allowance.
              </Text>
            </Pressable>

            {/* Option 2: Start with 0 (Zero-Based) */}
            <Pressable
              onPress={() => setSelected("zero")}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected === "zero" }}
              accessibilityLabel="Start with Zero. Fresh month starting from 0.00."
              className={`p-4 rounded-2xl border mb-4 active:scale-[0.99] ${
                selected === "zero"
                  ? "bg-primary/10 border-primary"
                  : "bg-surface-muted border-surface-border"
              }`}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2.5">
                  <View
                    className={`w-9 h-9 rounded-xl items-center justify-center ${
                      selected === "zero"
                        ? "bg-primary text-white"
                        : "bg-surface border border-surface-border"
                    }`}
                  >
                    <Ionicons
                      name="refresh-circle-outline"
                      size={20}
                      color={selected === "zero" ? "#FFFFFF" : "#6B6B6E"}
                    />
                  </View>
                  <View>
                    <Text className="text-sm font-black text-ink">
                      Start at 0 (Zero-Based)
                    </Text>
                    <Text className="text-[10px] font-bold text-primary uppercase tracking-wider">
                      Fresh Monthly Target
                    </Text>
                  </View>
                </View>

                <View
                  className={`w-5 h-5 rounded-full border items-center justify-center ${
                    selected === "zero"
                      ? "border-primary bg-primary"
                      : "border-surface-border bg-surface"
                  }`}
                >
                  {selected === "zero" && (
                    <View className="w-2 h-2 rounded-full bg-white" />
                  )}
                </View>
              </View>

              <Text className="text-xs text-ink-muted leading-relaxed pl-11">
                Every month begins clean with 0.00. The dashboard tracks purely
                the income and expenses logged within the active month. Budgets
                reset strictly to their base monthly amount.
              </Text>
            </Pressable>

            {/* Manual Immediate Trigger: Start New Month Right Now */}
            <View className="p-4 rounded-2xl bg-surface border border-surface-border mb-5">
              <View className="flex-row items-center gap-2 mb-1.5">
                <Feather name="calendar" size={15} color="#22C55E" />
                <Text className="text-xs font-black text-ink uppercase tracking-wider">
                  Manual Cycle Trigger
                </Text>
              </View>
              <Text className="text-xs text-ink-muted mb-3">
                Want to start your new monthly cycle right now instead of
                waiting for the 1st of next month?
              </Text>

              <Pressable
                onPress={handleStartNow}
                disabled={isStartingNow}
                accessibilityRole="button"
                accessibilityLabel="Start new month right now"
                className="py-2.5 px-4 rounded-xl bg-surface-muted border border-surface-border flex-row items-center justify-center gap-2 active:scale-95"
              >
                <Feather name="play" size={14} color="#22C55E" />
                <Text className="text-xs font-bold text-ink">
                  {isStartingNow
                    ? "Starting Cycle..."
                    : `Start New Month Now (${
                        selected === "zero" ? "at 0.00" : "with Remaining"
                      })`}
                </Text>
              </Pressable>
            </View>

            {/* Bottom Save Action */}
            <Pressable
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel="Save rollover preference"
              className="w-full py-4 rounded-2xl bg-primary items-center justify-center active:scale-98 shadow-sm"
            >
              <Text className="text-sm font-black text-white">
                Save Rollover Preference
              </Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

