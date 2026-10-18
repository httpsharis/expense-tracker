import Feather from "@expo/vector-icons/Feather";
import { useUser } from "@clerk/expo";
import { useColorScheme } from "nativewind";
import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { useUserStore } from "@store/userStore";

export interface HomeHeaderProps {
  onOpenTray: () => void;
  isOpen?: boolean;
  userName?: string;
  accountLabel?: string;
  onOpenAccounts?: () => void;
  onOpenProfile?: () => void;
}

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomeHeader({
  onOpenTray,
  isOpen = false,
  userName,
}: HomeHeaderProps) {
  const { user } = useUser();
  const theme = useUserStore((s) => s.theme);
  const toggleTheme = useUserStore((s) => s.toggleTheme);
  const displayName = useUserStore((s) => s.displayName);
  const { setColorScheme } = useColorScheme();
  const isDark = theme === "dark";

  const handleToggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    toggleTheme();
    try {
      setColorScheme(nextTheme);
    } catch {
      // Handled by ThemeRoot CSS vars
    }
  };

  const resolvedName = useMemo(() => {
    if (userName && userName !== "User") return userName;
    if (user?.firstName) return user.firstName;
    if (displayName) return displayName.split(" ")[0];
    return "";
  }, [userName, user?.firstName, displayName]);

  const greetingPrefix = useMemo(() => getTimeOfDayGreeting(), []);

  const todayFormatted = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(new Date());
    } catch {
      return "TODAY";
    }
  }, []);

  const greetingHeadline = resolvedName
    ? `${greetingPrefix}, ${resolvedName}`
    : `${greetingPrefix} 👋`;

  return (
    <View className="flex-row items-center justify-between px-6 pt-3 pb-2 bg-transparent">
      {/* 1. Left — Huge Aesthetic Editorial Greeting */}
      <View className="flex-1 mr-3 justify-center">
        {/* Subtle Eyebrow with Green Status Dot */}
        <View className="flex-row items-center gap-1.5 mb-0.5">
          <View className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-primary" />
          <Text className="text-[11px] font-black uppercase tracking-wider text-[#667085] dark:text-ink-muted">
            {todayFormatted.toUpperCase()}
          </Text>
        </View>

        {/* Huge Bold Personalized Greeting */}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          className="text-2xl sm:text-3xl font-black text-ink tracking-tight"
        >
          {greetingHeadline}
        </Text>
      </View>

      {/* 2. Right — Action Cluster (Shortcuts & Theme Toggle) */}
      <View className="flex-row items-center gap-2">
        {/* Feature Tray Button */}
        <Pressable
          onPress={onOpenTray}
          accessibilityRole="button"
          accessibilityLabel={
            isOpen ? "Close shortcuts drawer" : "Open shortcuts drawer"
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className={`w-10 h-10 rounded-full border items-center justify-center active:scale-95 shadow-2xs ${
            isOpen
              ? "bg-primary/10 border-primary"
              : "bg-surface border-surface-border"
          }`}
        >
          <Feather
            name={isOpen ? "chevron-up" : "grid"}
            size={18}
            color={isOpen ? "#22C55E" : isDark ? "#F5F5F3" : "#0A0A0B"}
          />
        </Pressable>

        {/* Dark / Light Mode Toggle */}
        <Pressable
          onPress={handleToggleTheme}
          accessibilityRole="button"
          accessibilityLabel={`Toggle theme. Current theme is ${theme}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="w-10 h-10 rounded-full bg-surface border border-surface-border items-center justify-center active:scale-95 shadow-2xs"
        >
          <Feather
            name={isDark ? "sun" : "moon"}
            size={18}
            color={isDark ? "#F5F5F3" : "#0A0A0B"}
          />
        </Pressable>
      </View>
    </View>
  );
}
