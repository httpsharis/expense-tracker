import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '@shared/types/database.types';
import { createClient, SupabaseClient, SupportedStorage } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const memoryStore: Record<string, string> = {};

export const safeStorage: SupportedStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return memoryStore[key] ?? null;
      } catch {
        return memoryStore[key] ?? null;
      }
    }

    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return memoryStore[key] ?? null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
        memoryStore[key] = value;
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
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        delete memoryStore[key];
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

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

/**
 * Creates an authenticated Supabase client configured to use Clerk JWTs.
 * Injects Clerk's session token into each fetch request so PostgreSQL RLS rules pass.
 */
export function createSupabaseClient(
  getToken: () => Promise<string | null>
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: safeStorage,
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: async (url, options = {}) => {
        const token = await getToken();
        const headers = new Headers(options.headers);

        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }

        return fetch(url, {
          ...options,
          headers,
        });
      },
    },
  });
}

/**
 * Fallback client for unauthenticated/public reads (if any).
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});