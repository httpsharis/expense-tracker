import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AppThemeMode = 'light' | 'dark';
export type MonthStartMode = 'remaining' | 'zero';

interface UserState {
    currency: string;
    displayName: string | null;
    theme: AppThemeMode;
    needsOnboarding: boolean | null;
    activeFilterAccountId: string | null;
    monthStartMode: MonthStartMode;
    lastMonthResetDate: string | null;
    setCurrency: (value: string) => void;
    setDisplayName: (value: string | null) => void;
    setTheme: (value: AppThemeMode) => void;
    toggleTheme: () => void;
    setNeedsOnboarding: (value: boolean | null) => void;
    setActiveFilterAccountId: (value: string | null) => void;
    setMonthStartMode: (mode: MonthStartMode) => void;
    setLastMonthResetDate: (date: string | null) => void;
    resetUserStore: () => void;
}

const DEFAULT_STATE = {
    currency: 'PKR',
    displayName: null as string | null,
    theme: 'light' as AppThemeMode,
    needsOnboarding: null as boolean | null,
    activeFilterAccountId: null as string | null,
    monthStartMode: 'remaining' as MonthStartMode,
    lastMonthResetDate: null as string | null,
};

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            ...DEFAULT_STATE,

            setCurrency: (currency: string) => set({ currency }),

            setDisplayName: (displayName: string | null) => set({ displayName }),

            setTheme: (theme: AppThemeMode) => set({ theme }),

            toggleTheme: () =>
                set((state) => ({
                    theme: state.theme === 'dark' ? 'light' : 'dark',
                })),

            setNeedsOnboarding: (needsOnboarding: boolean | null) =>
                set({ needsOnboarding }),

            setActiveFilterAccountId: (activeFilterAccountId: string | null) =>
                set({ activeFilterAccountId }),

            setMonthStartMode: (monthStartMode: MonthStartMode) =>
                set({ monthStartMode }),

            setLastMonthResetDate: (lastMonthResetDate: string | null) =>
                set({ lastMonthResetDate }),

            resetUserStore: () =>
                set((state) => ({
                    ...DEFAULT_STATE,
                    theme: state.theme,
                })),
        }),
        {
            name: 'saldo-user-settings',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);