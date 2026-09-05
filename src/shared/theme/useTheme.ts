// src/shared/theme/useTheme.ts
import { useColorScheme } from 'react-native';
import { radii, themes, ThemeTokens } from './tokens';

export function useTheme(): { colors: ThemeTokens; radii: typeof radii; scheme: 'light' | 'dark' } {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null

  // Light is the default — only switch to dark if the system explicitly says so.
  const scheme = systemScheme === 'dark' ? 'dark' : 'light';

  return { colors: themes[scheme], radii, scheme };
}