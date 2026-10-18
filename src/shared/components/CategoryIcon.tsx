import Ionicons from "@expo/vector-icons/Ionicons";
import React, { memo } from "react";
import { StyleProp, Text, TextStyle, ViewStyle } from "react-native";

export interface CategoryIconProps {
  icon?: string | null;
  size?: number;
  color?: string;
  fallback?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<TextStyle>;
}

export function isIoniconsGlyph(
  value: string | null | undefined,
): value is keyof typeof Ionicons.glyphMap {
  if (!value || typeof value !== "string") return false;
  return value in Ionicons.glyphMap;
}

function CategoryIconBase({
  icon,
  size = 18,
  color = "#6B6B6E",
  fallback = "pricetag",
  style,
}: CategoryIconProps) {
  if (!icon) {
    return <Ionicons name={fallback} size={size} color={color} style={style} />;
  }

  const trimmed = icon.trim();

  if (isIoniconsGlyph(trimmed)) {
    return <Ionicons name={trimmed} size={size} color={color} style={style} />;
  }

  // Fallback to emoji or text representation
  return (
    <Text
      style={[
        {
          fontSize: size,
          lineHeight: size * 1.25,
          textAlign: "center",
        },
        style as TextStyle,
      ]}
    >
      {trimmed}
    </Text>
  );
}

export const CategoryIcon = memo(CategoryIconBase);
