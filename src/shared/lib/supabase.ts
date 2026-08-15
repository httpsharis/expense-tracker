import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '@shared/types/database.types';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const memoryStore: Record<string, string> = {};

const safeStorage = {
    getItem: async (key: string): Promise<string | null> => {
        if (Platform.OS === 'web') {
            try {
                return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : memoryStore[key] || null;
            } catch {
                return memoryStore[key] || null;
            }
        }
        try {
            return await AsyncStorage.getItem(key);
        } catch {
            return memoryStore[key] || null;
        }
    },
    setItem: async (key: string, value: string): Promise<void> => {
        if (Platform.OS === 'web') {
            try {
                if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
            } catch {
                memoryStore[key] = value;
            }
            return;
        }
        try {
            await AsyncStorage.setItem(key, value);
        } catch {
            memoryStore[key] = value;
        }
    },
    removeItem: async (key: string): Promise<void> => {
        if (Platform.OS === 'web') {
            try {
                if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
            } catch {
                delete memoryStore[key];
            }
            return;
        }
        try {
            await AsyncStorage.removeItem(key);
        } catch {
            delete memoryStore[key];
        }
    },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: safeStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
