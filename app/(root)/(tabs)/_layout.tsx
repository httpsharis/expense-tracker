import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PRIMARY, themes } from "@shared/theme/tokens";
import { useUserStore } from "@store/userStore";

type CapsuleTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>
>[0];

interface TabItemConfig {
  name: string;
  label: string;
  renderIcon: (color: string, isFocused: boolean) => React.ReactNode;
}

const LEFT_TABS: TabItemConfig[] = [
  {
    name: "index",
    label: "Home",
    renderIcon: (color, isFocused) => (
      <Ionicons
        name={isFocused ? "home" : "home-outline"}
        size={23}
        color={color}
      />
    ),
  },
  {
    name: "budgets",
    label: "Budget",
    renderIcon: (color, isFocused) => (
      <Ionicons
        name={isFocused ? "pie-chart" : "pie-chart-outline"}
        size={23}
        color={color}
      />
    ),
  },
];

const RIGHT_TABS: TabItemConfig[] = [
  {
    name: "Assistant",
    label: "AI",
    renderIcon: (color, isFocused) => (
      <Ionicons
        name={isFocused ? "sparkles" : "sparkles-outline"}
        size={23}
        color={color}
      />
    ),
  },
  {
    name: "Profile",
    label: "Profile",
    renderIcon: (color, isFocused) => (
      <Ionicons
        name={isFocused ? "person" : "person-outline"}
        size={23}
        color={color}
      />
    ),
  },
];

const VISIBLE_TAB_NAMES = new Set([
  "index",
  "budgets",
  "Assistant",
  "Profile",
]);

const TAB_TRANSITION = LinearTransition.duration(180);

// =============================================================================
// Rounded Matte Blur Capsule Tab Bar Component
// =============================================================================
function CapsuleTabBar({ state, navigation }: CapsuleTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const theme = useUserStore((s) => s.theme);
  const isDark = theme ? theme === "dark" : colorScheme === "dark";
  const palette = isDark ? themes.dark : themes.light;
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () =>
      setIsKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(hideEvent, () =>
      setIsKeyboardVisible(false),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const activeRouteName = state.routes[state.index]?.name;

  // Hide the floating dock when virtual keyboard is open or inside sub-flows
  if (
    isKeyboardVisible ||
    !activeRouteName ||
    !VISIBLE_TAB_NAMES.has(activeRouteName)
  ) {
    return null;
  }

  const handleTabPress = (tabName: string) => {
    const targetRoute = state.routes.find((r) => r.name === tabName);
    if (!targetRoute) return;

    const isFocused = activeRouteName === tabName;
    const event = navigation.emit({
      type: "tabPress",
      target: targetRoute.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(tabName);
    }
  };

  const handleOpenAdd = () => {
    const addRoute = state.routes.find((r) => r.name === "AddTransactions");
    if (addRoute) {
      navigation.emit({
        type: "tabPress",
        target: addRoute.key,
        canPreventDefault: true,
      });
    }
    navigation.navigate("AddTransactions");
  };

  const renderTabButton = (tab: TabItemConfig) => {
    const isFocused = activeRouteName === tab.name;
    const inactiveIconColor = palette.textPrimary;
    const activeIconColor = PRIMARY;

    return (
      <Animated.View key={tab.name} layout={TAB_TRANSITION}>
        <Pressable
          onPress={() => handleTabPress(tab.name)}
          accessibilityRole="tab"
          accessibilityState={{ selected: isFocused }}
          accessibilityLabel={tab.label}
          className={`flex-row items-center justify-center rounded-full min-h-[50px] active:scale-95 ${
            isFocused
              ? "bg-surface-muted px-4 py-2.5 border border-surface-border"
              : "px-3.5 py-2.5 min-w-[50px] opacity-75 active:opacity-100"
          }`}
        >
          {tab.renderIcon(
            isFocused ? activeIconColor : inactiveIconColor,
            isFocused,
          )}

          {/* Active Tab Label */}
          {isFocused && (
            <Animated.Text
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(120)}
              className="text-ink text-sm font-bold ml-2 tracking-tight"
            >
              {tab.label}
            </Animated.Text>
          )}
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      pointerEvents="box-none"
      className="absolute left-0 right-0 items-center justify-center z-50"
      style={{ bottom: Math.max(18, insets.bottom + 6) }}
    >
      {/* Outer Shadow Container for the Rounded Capsule */}
      <Animated.View
        layout={TAB_TRANSITION}
        className="rounded-full shadow-2xl elevation-12"
        style={{
          shadowColor: palette.shadowColor,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.55 : 0.14,
          shadowRadius: 24,
        }}
      >
        {/* Inner Rounded Pill Clipping Wrapper (Ensures BlurView is a Pill, NEVER a Rectangle) */}
        <Animated.View
          layout={TAB_TRANSITION}
          className="flex-row items-center px-3 py-2 rounded-full border border-surface-border bg-surface-blur"
          style={{ borderRadius: 9999, overflow: "hidden" }}
        >
          <BlurView
            intensity={80}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />

          {/* Left Tabs: Home & Budget */}
          {LEFT_TABS.map(renderTabButton)}

          {/* Center Catalyst: Add Transaction (+) */}
          <Pressable
            onPress={handleOpenAdd}
            accessibilityRole="button"
            accessibilityLabel="Add transaction"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="w-[52px] h-[52px] mx-2 rounded-full items-center justify-center active:scale-90 shadow-md bg-primary"
          >
            <Feather name="plus" size={25} color="#FFFFFF" />
          </Pressable>

          {/* Right Tabs: AI & Profile */}
          {RIGHT_TABS.map(renderTabButton)}
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

// =============================================================================
// Main Tab Navigation Layout
// =============================================================================
export default function TabLayout() {
  return (
    <Tabs
      backBehavior="history"
      tabBar={(props) => <CapsuleTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        animation: "fade",
      }}
    >
      {/* Primary visible tabs */}
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="budgets" options={{ title: "Budget" }} />
      <Tabs.Screen name="Assistant" options={{ title: "AI" }} />
      <Tabs.Screen name="Profile" options={{ title: "Profile" }} />

      {/* Center action destination (custom trigger in tab bar) */}
      <Tabs.Screen name="AddTransactions" options={{ href: null }} />

      {/* Auxiliary ledger & account routes */}
      <Tabs.Screen name="Transactions" options={{ href: null }} />
      <Tabs.Screen name="Analytics" options={{ href: null }} />
      <Tabs.Screen name="Accounts" options={{ href: null }} />
      <Tabs.Screen name="Splits" options={{ href: null }} />
    </Tabs>
  );
}
