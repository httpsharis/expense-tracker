import { Database } from '@shared/types/database.types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const rawSupabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!rawSupabaseUrl || !rawSupabaseAnonKey) {
  throw new Error(
    '[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY.'
  );
}

// 1. Guaranteed string types (resolves 'string | undefined' error)
export const supabaseUrl: string = rawSupabaseUrl;
export const supabaseAnonKey: string = rawSupabaseAnonKey;

const SafeWebSocket = (
  typeof WebSocket !== 'undefined' ? WebSocket : class { }
) as unknown as typeof WebSocket;

/**
 * Creates an authenticated Supabase client using Clerk JWTs.
 */
export function createSupabaseClient(
  getToken: () => Promise<string | null>
): SupabaseClient<Database, 'public'> {
  return createClient<Database, 'public'>(supabaseUrl, supabaseAnonKey, {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      transport: SafeWebSocket,
    },
    global: {
      fetch: async (url, options = {}) => {
        const token = await getToken();
        const headers = new Headers(options.headers);

        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }

        const res = await fetch(url, {
          ...options,
          headers,
        });

        // Handle client-server clock skew ("JWT not yet valid") with transparent retry
        if (!res.ok && res.status === 401) {
          try {
            const clone = res.clone();
            const body = await clone.json();
            if (
              typeof body?.message === "string" &&
              body.message.toLowerCase().includes("not yet valid")
            ) {
              // Wait 1.2s for server clock to reach token nbf/iat time
              await new Promise((resolve) => setTimeout(resolve, 1200));
              return fetch(url, {
                ...options,
                headers,
              });
            }
          } catch {
            // response was not JSON, return original response
          }
        }

        return res;
      },
    },
  });
}

/**
 * Fallback client instance for unauthenticated reads.
 */
export const supabase: SupabaseClient<Database, 'public'> =
  createClient<Database, 'public'>(supabaseUrl, supabaseAnonKey, {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      transport: SafeWebSocket,
    },
  });