import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Text, View } from "react-native";

import type { DiagnosticInsight } from "../types";

export interface DiagnosticsCardProps {
  insights: DiagnosticInsight[];
  currency: string;
}

export function DiagnosticsCard({ insights }: DiagnosticsCardProps) {
  if (insights.length === 0) {
    return (
      <View className="mx-5 mb-4 bg-surface dark:bg-surface-dark rounded-3xl p-5 border border-surface-border dark:border-surface-border-dark shadow-2xs">
        <View className="flex-row items-center gap-2 mb-2">
          <Ionicons name="sparkles" size={17} color="#22C55E" />
          <Text className="text-sm font-black text-ink dark:text-ink-light tracking-tight">
            Diagnostic Health: Optimal
          </Text>
        </View>
        <Text className="text-xs text-ink-muted dark:text-ink-muted-dark leading-relaxed">
          No budget overruns, unusual spikes, or leakages detected for this period.
        </Text>
      </View>
    );
  }

  const criticalCount = insights.filter((i) => i.type === "critical").length;
  const warningCount = insights.filter((i) => i.type === "warning").length;

  return (
    <View className="mx-5 mb-4 bg-surface dark:bg-surface-dark rounded-3xl p-5 border border-surface-border dark:border-surface-border-dark shadow-2xs">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3 pb-3 border-b border-surface-divider dark:border-surface-border-dark">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-full bg-amber-500/10 items-center justify-center">
            <Feather
              name={criticalCount > 0 ? "alert-triangle" : "activity"}
              size={16}
              color={criticalCount > 0 ? "#EF4444" : "#F59E0B"}
            />
          </View>
          <View>
            <Text className="text-sm font-black text-ink dark:text-ink-light tracking-tight">
              What's Going Wrong & Insights
            </Text>
            <Text className="text-[10px] font-semibold text-ink-whisper dark:text-ink-whisper-dark">
              Automated Spending Diagnosis
            </Text>
          </View>
        </View>

        {/* Count Badge */}
        <View
          className={`px-2.5 py-1 rounded-full ${
            criticalCount > 0
              ? "bg-coral/10 border border-coral/30"
              : warningCount > 0
              ? "bg-amber-500/10 border border-amber-500/30"
              : "bg-primary/10 border border-primary/30"
          }`}
        >
          <Text
            className={`text-[10px] font-black ${
              criticalCount > 0
                ? "text-coral"
                : warningCount > 0
                ? "text-amber-500"
                : "text-primary"
            }`}
          >
            {insights.length} {insights.length === 1 ? "Notice" : "Notices"}
          </Text>
        </View>
      </View>

      {/* Insight Items */}
      <View className="gap-2.5">
        {insights.map((insight) => {
          const isCritical = insight.type === "critical";
          const isWarning = insight.type === "warning";
          const isPositive = insight.type === "positive";

          const bgClass = isCritical
            ? "bg-coral/5 border-coral/20"
            : isWarning
            ? "bg-amber-500/5 border-amber-500/20"
            : isPositive
            ? "bg-primary/5 border-primary/20"
            : "bg-surface-muted dark:bg-surface-muted-dark border-surface-border dark:border-surface-border-dark";

          const iconColor = isCritical
            ? "#EF4444"
            : isWarning
            ? "#F59E0B"
            : isPositive
            ? "#22C55E"
            : "#64748B";

          return (
            <View
              key={insight.id}
              className={`p-3.5 rounded-2xl border ${bgClass}`}
            >
              <View className="flex-row items-center gap-2 mb-1">
                <Feather
                  name={
                    isCritical
                      ? "alert-circle"
                      : isWarning
                      ? "alert-triangle"
                      : isPositive
                      ? "check-circle"
                      : "info"
                  }
                  size={14}
                  color={iconColor}
                />
                <Text className="text-xs font-black text-ink dark:text-ink-light flex-1">
                  {insight.title}
                </Text>
              </View>

              <Text className="text-[11px] text-ink-muted dark:text-ink-muted-dark leading-relaxed pl-5">
                {insight.message}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

