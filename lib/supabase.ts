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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
