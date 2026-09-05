// src/shared/theme/ThemeProvider.tsx
import { createContext, PropsWithChildren, useContext } from "react";
import { useColorScheme } from "react-native";

type Scheme = "light" | "dark";

const ThemeContext = createContext<Scheme>("light");

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const scheme: Scheme = systemScheme === "dark" ? "dark" : "light";

  return (
    <ThemeContext.Provider value={scheme}>{children}</ThemeContext.Provider>
  );
}

/** Only for native props that can't read a Tailwind class — BlurView tint,
 *  placeholderTextColor, StatusBar style. Everything else should use
 *  `dark:` classes directly and skip this hook entirely. */
export function useColorSchemeContext(): Scheme {
  return useContext(ThemeContext);
}
