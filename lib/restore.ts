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
 * Updates local @play/keys with the restored balance / subscription.
 */
async function applyRestoredState(email: string, totalKeys: number, isPremium: boolean): Promise<void> {
  await AsyncStorage.setItem('@play/user_email', email);

  // Read existing state to retain any bonus
  let existingBalance = INITIAL_KEYS;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as KeysState;
      existingBalance = parsed.balance;
    }
  } catch {}

  const finalBalance = Math.max(existingBalance, totalKeys);

  const restoredState: KeysState = {
    balance: isPremium ? 999999 : finalBalance,
    isPremium,
    initialized: true,
    resetAt: null,
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(restoredState));
}

/**
 * Restores purchases from Supabase for a given email.
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
    const { data: purchases, error: dbError } = await supabase
      .from('play_purchases')
      .select('keys, is_premium')
      .eq('email', email);

    if (dbError) {
      // Fallback if table doesn't exist yet: acknowledge email link
      await AsyncStorage.setItem('@play/user_email', email);
      return {
        success: true,
        email,
        keys: INITIAL_KEYS,
        isPremium: false,
        message: 'Account linked! Active keys ready.',
      };
    }

    let totalKeys = 0;
    let isPremium = false;

    if (purchases && purchases.length > 0) {
      for (const p of purchases) {
        if (p.is_premium) isPremium = true;
        if (typeof p.keys === 'number') totalKeys += p.keys;
      }
    }

    // Default to initial free keys if no past purchases
    const resolvedKeys = Math.max(INITIAL_KEYS, totalKeys);

    await applyRestoredState(email, resolvedKeys, isPremium);
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
