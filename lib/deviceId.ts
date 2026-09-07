import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = '@play/device_id';

// In-memory cache so every later checkpoint (landing view, session start,
// topic complete) reads this once per app launch instead of hitting
// AsyncStorage every time -- see docs/device-tracking-plan.md §3.
let cachedDeviceId: string | null = null;

// Anonymous install ID, not a hardware fingerprint -- deliberately not
// IDFA/GAID (see docs/device-tracking-plan.md §7.2 for why). Random UUID
// v4 shape via Math.random(); good enough for an analytics key, avoids
// adding a crypto dependency for something that isn't security-sensitive.
function generateUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Returns this device's stable anonymous ID, generating and persisting one
 *  on first call. Survives normal app close/reopen; resets only if local
 *  storage is cleared or the app is uninstalled/reinstalled -- same
 *  boundary as every other local-only state in this app (keys, progress). */
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) {
      cachedDeviceId = stored;
      return stored;
    }
  } catch {}

  const fresh = generateUuidV4();
  cachedDeviceId = fresh;
  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, fresh);
  } catch {}
  return fresh;
}

export function getDevicePlatform(): string {
  return Platform.OS;
}
