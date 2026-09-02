import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { KeysState, INITIAL_KEYS } from '@/lib/keys';
import { sanitizeAndValidateEmail } from '@/lib/email';
import { syncProgressWithCloud } from '@/lib/progress';

const STORAGE_KEY = '@play/keys';

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

  const restoredState: KeysState = {
    balance: isPremium ? 999999 : balance,
    isPremium,
    initialized: true,
    resetAt: resetAtIso ? new Date(resetAtIso).getTime() : null,
    resetCount,
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(restoredState));
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
    const { data: account, error: acctError } = await supabase
      .from('play_accounts')
      .select('balance, is_premium, reset_at, reset_count')
      .eq('email', email)
      .maybeSingle();

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

    // 2. First time this email has ever logged in on any device — seed the
    //    account from historical purchases (if the table/lookup works),
    //    otherwise just the free starting balance.
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
    await AsyncStorage.setItem('@play/user_email', email);
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
