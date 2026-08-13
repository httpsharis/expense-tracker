import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { AppTheme, darkColors, lightColors, rounded, spacing } from './tokens';

type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextType {
    theme: AppTheme;
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [mode, setMode] = useState<ThemeMode>('dark'); // Dark default per requirements [cite: 8]

    const activeTheme = useMemo(() => {
        const isDark = mode === 'system' ? systemColorScheme === 'dark' : mode === 'dark';
        return {
            colors: isDark ? darkColors : lightColors,
            spacing,
            rounded,
            isDark,
        };
    }, [mode, systemColorScheme]);

    return (
        <ThemeContext.Provider value={{ theme: activeTheme, mode, setMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

// Universal Custom Hooks
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context.theme;
};

// Style Factory Hook for high performance
export const useStyles = <T extends object>(styleFactory: (theme: AppTheme) => T): T => {
    const theme = useTheme();
    return useMemo(() => styleFactory(theme), [theme]);
};