import { useColorScheme } from "nativewind";
import { Image, ImageProps } from "react-native";

// Clean transparent PNG assets (light & dark)
export const LOGO_LIGHT = require("../../../assets/images/logo-light.png");
export const LOGO_DARK = require("../../../assets/images/logo-dark.png");

export interface LogoProps extends Omit<ImageProps, "source"> {
  size?: number;
  width?: number;
  height?: number;
  color?: string; // Kept for backwards compatibility if passed
  isDark?: boolean;
  className?: string;
}

/**
 * Saldo Logo Component
 * - Automatically switches between transparent LOGO_LIGHT and LOGO_DARK based on theme
 * - Completely unconstrained: accepts size, width, height, style, className, etc.
 */
export function SaldoLogo({
  size = 80,
  width,
  height,
  color,
  isDark: explicitDark,
  style,
  ...props
}: LogoProps) {
  const { colorScheme } = useColorScheme();
  const isDark = explicitDark ?? colorScheme === "dark";
  const source = isDark ? LOGO_DARK : LOGO_LIGHT;
  const w = width ?? size;
  const h = height ?? size;

  return (
    <Image
      source={source}
      style={[{ width: w, height: h, alignSelf: "center" }, style]}
      resizeMode="contain"
      {...props}
    />
  );
}

export default SaldoLogo;
