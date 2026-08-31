import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Same Supabase project as PataSkillsV2 — Play only reads its own
// independent play_curricula / play_signs tables + play-assets bucket.
const supabaseUrl = process.env.EXPO_PUBLIC_PATASKILLS_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_PATASKILLS_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured =
  supabaseUrl.length > 0 &&
  !supabaseUrl.includes('xxxxxxxxxxxxxxxxxxx') &&
  supabaseAnonKey.length > 0 &&
  !supabaseAnonKey.includes('DUMMY');

// AsyncStorage's web backend touches `window` as soon as GoTrue tries to
// load a session. During Expo's static web export, modules are evaluated
// on Node (no `window`) to prerender HTML, which crashes the build. Only
// wire up storage when we're actually running in a browser.
const isBrowser = typeof window !== 'undefined';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isBrowser ? AsyncStorage : undefined,
    autoRefreshToken: isBrowser,
    persistSession: isBrowser,
    detectSessionInUrl: false,
  },
});

export default supabase;
