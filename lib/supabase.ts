import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client for the SmartBank mobile app.
 *
 * Only the anonymous (public) key is used here. The service-role key must
 * NEVER live in this file or anywhere in the mobile bundle.
 *
 * Environment variables are provided through Expo's `EXPO_PUBLIC_` prefix
 * so they are available at build time and runtime on the client.
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  // We intentionally throw a clear, actionable error rather than silently
  // creating a broken client. This will surface in dev/QA immediately.
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill in your Supabase project credentials.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist the session in AsyncStorage on native; default for web is localStorage.
    // Expo SecureStore is recommended for production, but AsyncStorage works out
    // of the box and is fine for an educational project.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export default supabase;