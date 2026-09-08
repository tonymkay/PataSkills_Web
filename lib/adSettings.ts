/**
 * Bottom banner ads live/off kill-switch — ported from pataskillsv2's
 * lib/adSettings.ts. Admin flips `app_settings.ads_live` from the shared
 * dashboard; this fetches it once per app session, caches it (memory +
 * disk), and exposes a synchronous isAdsLive() read for components — no
 * per-render network calls. Self-contained (AsyncStorage directly) since
 * Play has no lib/storage.ts generic flag helper.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = '@play/ads_live';

let cached: boolean | null = null;

async function readStored(): Promise<boolean | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw === null ? null : raw === 'true';
  } catch {
    return null;
  }
}

async function writeStored(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    // best-effort
  }
}

/**
 * Fetches `ads_live` from `app_settings` and caches it. Call once per
 * screen mount before rendering a banner. Best-effort: on any failure
 * (offline, table missing, etc.) falls back to the last cached/stored
 * value, defaulting to false — nothing ships live by accident.
 */
export async function refreshAdsLive(): Promise<boolean> {
  if (cached !== null) return cached;

  const stored = await readStored();
  if (stored !== null) cached = stored;

  try {
    const fetchPromise = supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'ads_live')
      .maybeSingle();

    const timeoutPromise = new Promise<{ data: null; error: true }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: true }), 2000),
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
    if (!error && data) {
      const live = data.value === true;
      cached = live;
      await writeStored(live);
      return live;
    }
  } catch {
    // fall through to cached/local value
  }
  if (cached === null) cached = stored ?? false;
  return cached;
}

/**
 * Synchronous read for components to check before rendering a banner.
 * False (safe default) until refreshAdsLive() has resolved once this
 * session.
 */
export function isAdsLive(): boolean {
  return cached === true;
}
