// src/shared/ui/Surface.tsx
import { cn } from "@shared/lib/cn";
import { useColorSchemeContext } from "@shared/theme/ThemeProvider";
import { BlurView } from "expo-blur";
import { StyleSheet, View, ViewProps } from "react-native";

export type SurfaceVariant = "flat" | "raised" | "overlay";

interface SurfaceProps extends ViewProps {
  variant: SurfaceVariant;
  className?: string;
}

const BLUR_INTENSITY = { light: 30, dark: 40 } as const;

export function Surface({
  variant,
  className,
  children,
  ...rest
}: SurfaceProps) {
  const scheme = useColorSchemeContext();

  if (variant === "overlay") {
    return (
      <View className={cn("overflow-hidden rounded-card", className)} {...rest}>
        <BlurView
          intensity={BLUR_INTENSITY[scheme]}
          tint={scheme}
          style={StyleSheet.absoluteFill}
        />
        <View className="absolute inset-0 bg-canvas/70 dark:bg-canvas-dark/70" />
        {children}
      </View>
    );
  }

  if (variant === "raised") {
    return (
      <View
        className={cn(
          "rounded-card bg-surface-raised shadow-sm shadow-black/10",
          "dark:bg-surface-raised-dark dark:shadow-black/40",
          className,
        )}
        {...rest}
      >
        {children}
      </View>
    );
  }

  return (
    <View
      className={cn(
        "rounded-card border border-surface-flat-border bg-surface-flat",
        "dark:border-surface-flat-border-dark dark:bg-surface-flat-dark",
        className,
      )}
      {...rest}
    >
      {children}
    </View>
  );
}
