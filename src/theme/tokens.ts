export const darkColors = {
    background: '#121414',
    surfaceContainerLowest: '#0c0f0f',
    surfaceContainerLow: '#1a1c1c',
    surfaceContainer: '#1e2020',
    surfaceContainerHigh: '#282a2b',
    surfaceContainerHighest: '#333535',
    onSurface: '#e2e2e2',
    onSurfaceVariant: '#cfc4c5',
    outline: '#988e90',
    outlineVariant: '#4c4546',
    primary: '#c6c6c6',
    onPrimary: '#303030',
    secondary: '#c7c6c6',
    onSecondary: '#303031',
    error: '#ffb4ab',
    onError: '#690005',
    signalAccent: '#C9A24B',
    onSignalAccent: '#1c1c1a',
    signalAccentDim: '#8a7239',
};

export const lightColors: typeof darkColors = {
    background: '#f7f6f4',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#f0efec',
    surfaceContainer: '#e9e7e3',
    surfaceContainerHigh: '#e0ddd8',
    surfaceContainerHighest: '#d4d1cb',
    onSurface: '#1c1c1a',
    onSurfaceVariant: '#4a4744',
    outline: '#7a756f',
    outlineVariant: '#c8c3bc',
    primary: '#1c1c1a',
    onPrimary: '#f7f6f4',
    secondary: '#39362f',
    onSecondary: '#f7f6f4',
    error: '#93000a',
    onError: '#ffffff',
    signalAccent: '#8a7239',
    onSignalAccent: '#ffffff',
    signalAccentDim: '#8a7239',
};

export const spacing = {
    base: 8,
    containerPadding: 24,
    cardGap: 16,
    sectionMargin: 32,
    touchTarget: 48,
} as const;

export const rounded = {
    sm: 4,
    DEFAULT: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
} as const;

// Define ThemeColors based on the general structure, not rigid literals
export type ThemeColors = Record<keyof typeof darkColors, string>;

export type AppTheme = {
    colors: ThemeColors;
    spacing: typeof spacing;
    rounded: typeof rounded;
    isDark: boolean;
};