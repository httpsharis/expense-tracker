import { TextStyle } from 'react-native';

export const tokens = {
    appName: 'Saldo',
    colors: {
        dark: {
            background: '#0D1117',
            surfaceContainerLowest: '#090D12',
            surfaceContainerLow: '#161B22',
            surfaceContainer: '#21262D',
            surfaceContainerHigh: '#30363D',
            surfaceContainerHighest: '#484F58',
            onSurface: '#F0F6FC',
            onSurfaceVariant: '#8B949E',
            outline: '#6E7681',
            outlineVariant: '#30363D',
            primary: '#10B981', // Emerald Primary
            onPrimary: '#042F2E',
            primaryContainer: '#064E3B',
            secondary: '#06B6D4', // Cyber Cyan
            tertiary: '#8B5CF6', // Violet Accent
            error: '#F87171',
            onError: '#450A0A',
            income: '#10B981',
            expense: '#EF4444',
            settlement: '#3B82F6',
            warning: '#F59E0B',
        },
        light: {
            background: '#F6F8FA',
            surfaceContainerLowest: '#FFFFFF',
            surfaceContainerLow: '#F0F2F5',
            surfaceContainer: '#E5E7EB',
            surfaceContainerHigh: '#D1D5DB',
            surfaceContainerHighest: '#9CA3AF',
            onSurface: '#111827',
            onSurfaceVariant: '#4B5563',
            outline: '#6B7280',
            outlineVariant: '#E5E7EB',
            primary: '#059669',
            onPrimary: '#FFFFFF',
            primaryContainer: '#D1FAE5',
            secondary: '#0891B2',
            tertiary: '#7C3AED',
            error: '#DC2626',
            onError: '#FFFFFF',
            income: '#059669',
            expense: '#DC2626',
            settlement: '#2563EB',
            warning: '#D97706',
        },
        signal: {
            accent: '#F59E0B', // Debt Gold
            onAccent: '#111827',
            accentDim: '#B45309',
            success: '#10B981',
            info: '#3B82F6',
            danger: '#EF4444',
        },
    },
    typography: {
        headlineLg: {
            fontFamily: 'IBMPlexSans-SemiBold',
            fontSize: 32,
            lineHeight: 40,
            letterSpacing: -0.64,
        },
        headlineMd: {
            fontFamily: 'IBMPlexSans-Medium',
            fontSize: 20,
            lineHeight: 28,
        },
        bodyMd: {
            fontFamily: 'Roboto-Regular',
            fontSize: 16,
            lineHeight: 24,
        },
        dataDisplay: {
            fontFamily: 'Roboto-Bold',
            fontSize: 36,
            lineHeight: 44,
            letterSpacing: -0.36,
            fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
        },
        labelSm: {
            fontFamily: 'Roboto-Bold',
            fontSize: 12,
            lineHeight: 16,
            letterSpacing: 0.6,
        },
    },
    spacing: {
        base: 8,
        containerPadding: 20,
        cardGap: 14,
        sectionMargin: 24,
        touchTarget: 48,
    },
    radius: {
        sm: 6,
        default: 10,
        md: 14,
        lg: 18,
        hero: 24,
        full: 9999,
    },
};

export type ThemeTokens = typeof tokens;
