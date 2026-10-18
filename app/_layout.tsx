// app/_layout.tsx
import { ClerkLoaded, ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClientProvider } from "@tanstack/react-query";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme, vars } from "nativewind";
import React, { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@shared/ui/ErrorBoundary";
import { queryClient } from "@store/client";
import { useUserStore } from "@store/userStore";
import "./global.css";

// Suppress strict mode value-access warnings triggered during theme toggle re-renders
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

const LIGHT_VARS = vars({
  "--color-canvas": "#F7F7F5",
  "--color-base": "#FFFFFF",
  "--color-surface-flat": "#FFFFFF",
  "--color-surface-flat-border": "#E4E4E7",
  "--color-surface-raised": "#FFFFFF",
  "--color-surface-tint": "#F4F4F5",
  "--color-surface-blur": "rgba(255, 255, 255, 0.78)",
  "--color-surface-pill": "rgba(10, 10, 11, 0.08)",
  "--color-primary": "#22C55E",
  "--color-lime": "#22C55E",
  "--color-emerald": "#16A34A",
  "--color-coral": "#EF4444",
  "--color-text-primary": "#0A0A0B",
  "--color-text-secondary": "#52525B",
  "--color-text-tertiary": "#A0A0A3",
  "--color-divider": "#F4F4F5",
  "--color-btn-fill": "#22C55E",
  "--color-btn-text": "#FFFFFF",
  "--color-gold": "#C9A24B",
  "--color-gold-dim": "rgba(201, 162, 75, 0.14)",
});

const DARK_VARS = vars({
  "--color-canvas": "#0A0A0B",
  "--color-base": "#0A0A0B",
  "--color-surface-flat": "#141416",
  "--color-surface-flat-border": "#27272A",
  "--color-surface-raised": "#18181B",
  "--color-surface-tint": "#1F1F23",
  "--color-surface-blur": "rgba(28, 28, 31, 0.78)",
  "--color-surface-pill": "rgba(255, 255, 255, 0.12)",
  "--color-primary": "#22C55E",
  "--color-lime": "#22C55E",
  "--color-emerald": "#16A34A",
  "--color-coral": "#EF4444",
  "--color-text-primary": "#F5F5F3",
  "--color-text-secondary": "#9C9C9F",
  "--color-text-tertiary": "#5E5E61",
  "--color-divider": "#27272A",
  "--color-btn-fill": "#22C55E",
  "--color-btn-text": "#0A0A0B",
  "--color-gold": "#C9A24B",
  "--color-gold-dim": "rgba(201, 162, 75, 0.14)",
});

function ThemeRoot({ children }: { children: React.ReactNode }) {
  const theme = useUserStore((state) => state.theme);
  const { colorScheme, setColorScheme } = useColorScheme();

  useEffect(() => {
    if (theme && colorScheme !== theme) {
      try {
        setColorScheme(theme);
      } catch {
        // Ignore if native appearance prevents override in older runtimes
      }
    }
  }, [theme, colorScheme, setColorScheme]);

  const isDark = theme === "dark";

  return (
    <View
      style={[{ flex: 1 }, isDark ? DARK_VARS : LIGHT_VARS]}
      className={isDark ? "dark flex-1 bg-canvas" : "flex-1 bg-canvas"}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      {children}
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <ClerkProvider
                publishableKey={publishableKey}
                tokenCache={tokenCache}
              >
                <ClerkLoaded>
                  <ThemeRoot>
                    <Slot />
                  </ThemeRoot>
                </ClerkLoaded>
              </ClerkProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
