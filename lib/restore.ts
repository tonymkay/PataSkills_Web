import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { KeysState, INITIAL_KEYS, pushKeysToCloud } from '@/lib/keys';
import { sanitizeAndValidateEmail } from '@/lib/email';
import { syncProgressWithCloud } from '@/lib/progress';
import { linkDeviceToEmail } from '@/lib/deviceAnalytics';
import { markHasEverLoggedIn, notifyLoggedOut } from '@/lib/authGate';

const STORAGE_KEY = '@play/keys';
const EMAIL_KEY = '@play/user_email';

/**
 * If this device already has a local balance for this exact email (i.e.
 * it's the same account re-logging in, not a fresh device/email), and
 * that balance's last write() never confirmed landing in the cloud, push
 * it now — before the SELECT below reads the server's value. Without
 * this, restore always trusted whatever the server had regardless of
 * whether the device's own latest spend ever actually made it there,
 * which is exactly what let a still-online restore hand back a stale,
 * pre-spend balance (see docs — keys/restore sync gap).
 */
async function pushLocalIfUnsynced(email: string): Promise<void> {
  try {
    const linkedEmail = await AsyncStorage.getItem(EMAIL_KEY);
    if (linkedEmail !== email) return;
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const local = JSON.parse(raw) as KeysState;
    if (local.synced === false) {
      await pushKeysToCloud();
    }
  } catch {}
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The Supabase client can still be finishing its own async init (reading
 * the persisted session, etc.) in the first moment or so after a cold
 * boot — exactly when onboarding's and Settings' restore modals are
 * likeliest to be opened. A query fired into that window fails with a
 * network-shaped error even though connectivity is fine, which is why
 * keys-confirm (always reached well into a warm session) never sees this
 * but onboarding/Settings intermittently do. One short retry absorbs
 * that startup race without masking a real, sustained network failure.
 */
async function selectAccountWithRetry(email: string) {
  const attempt = () =>
    supabase.from('play_accounts').select('balance, is_premium, reset_at, reset_count').eq('email', email).maybeSingle();

  let result = await attempt();
  if (result.error) {
    await sleep(500);
    result = await attempt();
  }
  return result;
}

export interface RestoreResult {
  success: boolean;
  email: string;
  keys: number;
  isPremium: boolean;
  message: string;
}

/**
 * Overwrites local @play/keys with the account's persisted balance. Once an
 * account record exists, it is the sole source of truth for that email —
 * this never merges with whatever balance happened to be sitting locally,
 * because that's exactly what let a re-login re-grant already-spent keys.
 */
async function applyRestoredState(
  email: string,
  balance: number,
  isPremium: boolean,
  resetAtIso: string | null,
  resetCount: number,
): Promise<void> {
  await AsyncStorage.setItem('@play/user_email', email);
  await AsyncStorage.removeItem('@play/logged_out_pending');
  await markHasEverLoggedIn();

  const restoredState: KeysState = {
    balance: isPremium ? 999999 : balance,
    isPremium,
    initialized: true,
    resetAt: resetAtIso ? new Date(resetAtIso).getTime() : null,
    resetCount,
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(restoredState));

  // Join this device to the account immediately (previously only
  // lib/billing.ts's purchase flow did this -- a plain sign-in/restore,
  // the far more common path, never linked play_devices.email at all, and
  // never reconciled this device's pre-login local activity into the
  // account either). Fire-and-forget, doesn't block the login UI -- see
  // docs/sync-gaps-fix-plan.md Gap 3.
  void linkDeviceToEmail(email);
}

/**
 * Offline/same-device fallback: this device just logged out of `email`
 * (or already had it locally cached) and the cloud lookup below couldn't
 * be reached at all. Since there is no guest mode — a device only ever
 * has one account — there is nothing ambiguous to resolve here: if the
 * email being restored matches this device's own last-known email, its
 * local `@play/keys` cache (never wiped by logout) IS that account's
 * state as of this device's last write, and login can proceed from it
 * exactly as if the network had answered. Only used when the network
 * call itself failed; a confirmed "no such account" from a reachable
 * server is NOT routed through this path.
 */
async function restoreFromLocalCacheIfSameDevice(email: string): Promise<RestoreResult | null> {
  try {
    const knownEmail =
      (await AsyncStorage.getItem(EMAIL_KEY)) || (await AsyncStorage.getItem('@play/last_logged_out_email'));
    if (knownEmail !== email) return null;

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const local: KeysState = raw
      ? JSON.parse(raw)
      : { balance: INITIAL_KEYS, initialized: true, resetAt: null, isPremium: false };

    await AsyncStorage.setItem('@play/user_email', email);
    await AsyncStorage.removeItem('@play/logged_out_pending');
    await markHasEverLoggedIn();

    const balance = local.isPremium ? 999999 : local.balance;
    return {
      success: true,
      email,
      keys: balance,
      isPremium: !!local.isPremium,
      message: local.isPremium
        ? 'Unlimited Subscription restored!'
        : `${balance} keys restored to your balance.`,
    };
  } catch {
    return null;
  }
}

/**
 * Restores an account by email. A persistent `play_accounts` row — kept in
 * sync with the local balance on every spend/grant (see lib/keys.ts) — is
 * the source of truth once it exists. Only the very first time an email is
 * ever seen do we seed it (from any past `play_purchases`, defaulting to
 * the free starting balance), and that seed is written back immediately so
 * it can never be granted again on a later login.
 */
export async function restoreAccountByEmail(rawEmail: string): Promise<RestoreResult> {
  const { valid, email, error } = sanitizeAndValidateEmail(rawEmail);
  if (!valid) {
    return {
      success: false,
      email: rawEmail,
      keys: 0,
      isPremium: false,
      message: error || 'Please enter a valid email address.',
    };
  }

  try {
    // 1. An account record already exists — it's the durable balance for
    //    this email; use it as-is, however many times this email logs in.
    //    Push first (see pushLocalIfUnsynced) so "as-is" actually reflects
    //    this device's latest spend if it never confirmed syncing.
    await pushLocalIfUnsynced(email);
    const { data: account, error: acctError } = await selectAccountWithRetry(email);

    if (!acctError && account) {
      const isPremium = !!account.is_premium;
      const balance = isPremium ? 999999 : account.balance;
      await applyRestoredState(email, account.balance, isPremium, account.reset_at, account.reset_count ?? 0);
      await syncProgressWithCloud(email);

      return {
        success: true,
        email,
        keys: balance,
        isPremium,
        message: isPremium
          ? 'Unlimited Subscription restored!'
          : `${balance} keys restored to your balance.`,
      };
    }

    // 1b. The SELECT itself failed (network/RLS/etc). No guest mode exists
    //     on this device, so if this is the same account it was already
    //     using, its own local cache is a valid restore — login must not
    //     require connectivity just because it also needs to work while
    //     online. A genuinely different/unknown email still fails here
    //     rather than being misread as "never seen before".
    if (acctError) {
      // Surface the real cause instead of just "could not reach the
      // server" for everything — RLS denial, malformed query, genuine
      // network failure, and "client not ready yet" all currently look
      // identical to the user. This makes the next occurrence diagnosable
      // from device logs instead of a guess.
      console.warn('[restore] account SELECT failed:', acctError);

      const offlineResult = await restoreFromLocalCacheIfSameDevice(email);
      if (offlineResult) return offlineResult;

      return {
        success: false,
        email,
        keys: 0,
        isPremium: false,
        message: 'Could not reach the server — please try again.',
      };
    }

    // 2. Confirmed no account row exists — first time this email has ever
    //    logged in on any device. Seed the account from historical
    //    purchases (if the table/lookup works), otherwise just the free
    //    starting balance.
    let totalKeys = 0;
    let isPremium = false;
    try {
      const { data: purchases } = await supabase
        .from('play_purchases')
        .select('keys, is_premium')
        .eq('email', email);
      for (const p of purchases || []) {
        if (p.is_premium) isPremium = true;
        if (typeof p.keys === 'number') totalKeys += p.keys;
      }
    } catch {}

    const resolvedKeys = Math.max(INITIAL_KEYS, totalKeys);

    await applyRestoredState(email, resolvedKeys, isPremium, null, 0);

    // Persist the seed immediately so this branch is never taken again for
    // this email — every future login goes through path 1 above.
    try {
      await supabase.from('play_accounts').upsert(
        {
          email,
          balance: isPremium ? 999999 : resolvedKeys,
          is_premium: isPremium,
          reset_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' },
      );
    } catch {}

    await syncProgressWithCloud(email);

    return {
      success: true,
      email,
      keys: isPremium ? 999999 : resolvedKeys,
      isPremium,
      message: isPremium
        ? 'Unlimited Subscription restored!'
        : `${resolvedKeys} keys restored to your balance.`,
    };
  } catch (e) {
    const offlineResult = await restoreFromLocalCacheIfSameDevice(email);
    if (offlineResult) return offlineResult;

    await AsyncStorage.setItem('@play/user_email', email);
    await AsyncStorage.removeItem('@play/logged_out_pending');
    return {
      success: true,
      email,
      keys: INITIAL_KEYS,
      isPremium: false,
      message: 'Account linked to your session.',
    };
  }
}

/**
 * Signs in via Google ID Token (GIS) and restores purchases.
 */
export async function restoreAccountWithGoogle(idToken: string): Promise<RestoreResult> {
  try {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      return {
        success: false,
        email: '',
        keys: 0,
        isPremium: false,
        message: error.message || 'Google sign-in failed. Please try again.',
      };
    }

    const email = data.user?.email || '';
    if (!email) {
      return {
        success: false,
        email: '',
        keys: 0,
        isPremium: false,
        message: 'Could not retrieve email from Google.',
      };
    }

    return await restoreAccountByEmail(email);
  } catch (e) {
    return {
      success: false,
      email: '',
      keys: 0,
      isPremium: false,
      message: 'Google authentication error. Please try again.',
    };
  }
}

/**
 * Unlinks the current device from its account. Signs out of Supabase auth
 * (harmless no-op for an email-only restore, since that path never creates
 * a Supabase session) and clears the locally stored email so the device
 * goes back to being anonymous. Deliberately leaves the local keys/progress
 * caches as-is — they're already synced to the account record in the
 * cloud, and clearing them here would just make things reset to defaults
 * until this device's numbers get re-synced by whatever restores next.
 */
export async function logoutAccount(): Promise<void> {
  // Guaranteed last-chance push: spendKey()'s own write() already tries a
  // best-effort cloud sync on every spend, but that's a single fire-and-
  // forget attempt — if it silently failed (network blip, RLS denial,
  // etc.) nothing else was going to retry it before the email below gets
  // cleared and this device goes anonymous. This is that retry.
  try {
    await pushKeysToCloud();
  } catch {}
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {}
  // Preserve the email in a separate, logout-surviving key so
  // AccountGateScreen (app/_layout.tsx) can still greet this device by
  // name/email after '@play/user_email' below is cleared. This key is
  // display-only — it is never treated as "logged in".
  try {
    const email = await AsyncStorage.getItem(EMAIL_KEY);
    if (email) await AsyncStorage.setItem('@play/last_logged_out_email', email);
  } catch {}
  // Explicit, durable "this device is logged out" flag — set only here,
  // cleared only by a confirmed successful login (applyRestoredState /
  // restoreFromLocalCacheIfSameDevice). The gate checks this instead of
  // inferring logout state from whether '@play/user_email' happens to be
  // empty, since that key alone can't be fully trusted end-to-end (e.g. a
  // lingering Supabase session getting silently restored later).
  try {
    await AsyncStorage.setItem('@play/logged_out_pending', 'true');
  } catch {}
  try {
    await AsyncStorage.removeItem('@play/user_email');
  } catch {}
  // Fire immediately, mid-session — see lib/authGate.ts. This is what
  // actually puts the permanent gate up right now, not just on next boot.
  notifyLoggedOut();
}
