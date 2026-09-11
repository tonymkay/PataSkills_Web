import AsyncStorage from '@react-native-async-storage/async-storage';

const HAS_LOGGED_IN_KEY = '@play/has_logged_in';

/**
 * Permanent, one-way device flag: has this device EVER completed a login
 * (email restore or Google) at any point, ever. Set once in
 * lib/restore.ts applyRestoredState() and never cleared by anything —
 * not logoutAccount(), not time, not a failed restore. This is what
 * separates a true guest (never set) from an account user who is
 * currently logged out (set, but @play/user_email is cleared) — see
 * lib/email.ts getStoredEmail() for the paired "logged in right now"
 * check. Together: everLoggedIn && !email === the permanent account gate
 * in app/_layout.tsx must show.
 */
export async function getHasEverLoggedIn(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(HAS_LOGGED_IN_KEY)) === 'true';
  } catch {
    return false;
  }
}

/** Idempotent — safe to call on every login, not just the first. */
export async function markHasEverLoggedIn(): Promise<void> {
  try {
    await AsyncStorage.setItem(HAS_LOGGED_IN_KEY, 'true');
  } catch {}
}
