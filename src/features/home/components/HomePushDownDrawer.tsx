import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";

export interface DrawerShortcutItem {
  id: string;
  name: string;
  subtitle: string;
  route: string;
  iconName: keyof typeof Feather.glyphMap;
  iconType?: "feather" | "ionicons";
  accentColor: string;
  bgColor: string;
}

const SHORTCUT_ITEMS: DrawerShortcutItem[] = [
  {
    id: "splits",
    name: "Split Bill",
    subtitle: "Share group cost",
    route: "/(root)/(tabs)/Splits",
    iconName: "users",
    accentColor: "#10B981",
    bgColor: "bg-emerald-500/10 dark:bg-emerald-500/20",
  },
  {
    id: "loans",
    name: "Shared Tabs",
    subtitle: "Friends & balances",
    route: "/(root)/(tabs)/Splits",
    iconName: "user-check",
    accentColor: "#3B82F6",
    bgColor: "bg-blue-500/10 dark:bg-blue-500/20",
  },
  {
    id: "budgets",
    name: "Budgets",
    subtitle: "Monthly targets",
    route: "/(root)/(tabs)/budgets",
    iconName: "pie-chart",
    accentColor: "#8B5CF6",
    bgColor: "bg-purple-500/10 dark:bg-purple-500/20",
  },
  {
    id: "accounts",
    name: "Accounts",
    subtitle: "Wallets & cards",
    route: "/(root)/(tabs)/Accounts",
    iconName: "credit-card",
    accentColor: "#22C55E",
    bgColor: "bg-primary/10 dark:bg-primary/20",
  },
  {
    id: "assistant",
    name: "AI Assistant",
    subtitle: "Natural chat logging",
    route: "/(root)/(tabs)/Assistant",
    iconName: "message-square",
    accentColor: "#EC4899",
    bgColor: "bg-pink-500/10 dark:bg-pink-500/20",
  },
  {
    id: "reports",
    name: "Analytics",
    subtitle: "Spending trends & charts",
    route: "/(root)/(tabs)/Analytics",
    iconName: "bar-chart-2",
    accentColor: "#F59E0B",
    bgColor: "bg-amber-500/10 dark:bg-amber-500/20",
  },
];

export interface HomePushDownDrawerProps {
  onClose: () => void;
  onNavigate: (route: string) => void;
}

export function HomePushDownDrawer({
  onClose,
  onNavigate,
}: HomePushDownDrawerProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOutUp.duration(160)}
      className="px-5 pt-1 pb-3"
    >
      <View className="bg-surface rounded-3xl p-4 border border-surface-border shadow-2xs">
        {/* Subtle Drawer Header */}
        <View className="flex-row items-center justify-between pb-3 mb-2 border-b border-surface-divider">
          <View className="flex-row items-center gap-1.5">
            <View className="w-1.5 h-1.5 rounded-full bg-primary" />
            <Text className="text-[10px] font-black uppercase tracking-wider text-ink-whisper">
              Quick Shortcuts & Hub
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close shortcuts drawer"
            className="w-7 h-7 rounded-full bg-surface-muted border border-surface-border items-center justify-center active:opacity-70"
          >
            <Feather name="chevron-up" size={14} color="#6B6B6E" />
          </Pressable>
        </View>

        {/* 3-Column Grid of Action Tiles */}
        <View className="flex-row flex-wrap justify-between gap-y-2.5">
          {SHORTCUT_ITEMS.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onNavigate(item.route)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.subtitle}`}
              className="w-[31.5%] aspect-[1.1] rounded-2xl bg-surface-muted border border-surface-border p-2.5 items-center justify-center active:opacity-75 active:border-primary/40"
            >
              <View
                className={`w-10 h-10 rounded-xl items-center justify-center mb-1.5 ${item.bgColor}`}
              >
                <Feather
                  name={item.iconName}
                  size={19}
                  color={item.accentColor}
                />
              </View>

              <Text
                numberOfLines={1}
                className="text-xs font-bold text-ink text-center tracking-tight"
              >
                {item.name}
              </Text>
              <Text
                numberOfLines={1}
                className="text-[9px] font-medium text-ink-muted text-center mt-0.5"
              >
                {item.subtitle}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

