import AsyncStorage from '@react-native-async-storage/async-storage';

// Every local key this app writes is prefixed '@play/' (keys, progress,
// completed_tracks, user_email, device_id, tabs_unlocked, currency, timer
// reminders, premium_expires_at, etc — see lib/keys.ts, lib/progress.ts,
// lib/email.ts, lib/deviceId.ts, app/settings.tsx). Wiping by prefix means
// this never needs updating when a new '@play/...' key gets added later.

/** Clears every local key this app owns, so the next read is a clean
 *  first-run with no residual data — used by deleteAccount() (lib/account.ts). */
export async function clearAllLocal(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const playKeys = allKeys.filter((k) => k.startsWith('@play/'));
    if (playKeys.length > 0) {
      await AsyncStorage.multiRemove(playKeys);
    }
  } catch {
    /* best-effort — deleteAccount() proceeds regardless */
  }
}
