import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface UserState {
    currency: string;
    needsOnboarding: boolean | null;
    setCurrency: (value: string) => void;
    setNeedsOnboarding: (value: boolean | null) => void;
    resetUserStore: () => void;
}

const DEFAULT_STATE = {
    currency: 'USD',
    needsOnboarding: null,
};

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            ...DEFAULT_STATE,

            setCurrency: (currency: string) => set({ currency }),

            setNeedsOnboarding: (needsOnboarding: boolean | null) =>
                set({ needsOnboarding }),

            resetUserStore: () => set(DEFAULT_STATE),
        }),
        {
            name: 'saldo-user-settings',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);