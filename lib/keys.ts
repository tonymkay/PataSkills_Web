import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const STORAGE_KEY = '@play/keys';
const EMAIL_KEY = '@play/user_email';

export const INITIAL_KEYS = 3;

/** How long a depleted balance takes to refill, counted from the moment the
 *  "out of keys" screen is actually shown (not from the moment the balance
 *  hits 0 — those can differ by a session or two). Escalates each time it's
 *  actually used: 5 min the first time, 2 hrs the second, 8 hrs the third
 *  and every time after that. */
const RESET_DURATIONS_MS = [
  5 * 60 * 1000,
  2 * 60 * 60 * 1000,
  8 * 60 * 60 * 1000,
];

function resetDurationFor(resetCount: number): number {
  const tier = Math.min(resetCount, RESET_DURATIONS_MS.length - 1);
  return RESET_DURATIONS_MS[tier];
}

export interface KeysState {
  balance: number;
  initialized: boolean;
  isPremium?: boolean;
  expiresAt?: string | null;
  /** Epoch ms when balance refills. Set the moment balance hits 0; null
   *  whenever balance is > 0. */
  resetAt: number | null;
  /** How many times the free-trial reset has actually completed (balance
   *  went from 0 back to INITIAL_KEYS via the timer). Drives the escalating
   *  duration in resetDurationFor — defaults to 0 for new/legacy state. */
  resetCount?: number;
}

async function read(): Promise<KeysState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as KeysState;
  } catch {}
  return { balance: INITIAL_KEYS, initialized: false, resetAt: null, isPremium: false, expiresAt: null };
}

async function write(state: KeysState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}

  // Best-effort sync to the linked account (if any) so the balance survives
  // logout/login and reinstalls — the account record, not this local copy,
  // is the source of truth once a device has ever logged in. Failure here
  // never blocks gameplay; the local write above already succeeded.
  try {
    const email = await AsyncStorage.getItem(EMAIL_KEY);
    if (email) {
      await supabase.from('play_accounts').upsert(
        {
          email,
          balance: state.balance,
          is_premium: !!state.isPremium,
          reset_at: state.resetAt ? new Date(state.resetAt).toISOString() : null,
          reset_count: state.resetCount ?? 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' },
      );
    }
  } catch {}
}

/**
 * Manual "Backup now" entry point (Settings). Re-pushes the current key
 * balance/premium state regardless of whether the live sync in write()
 * succeeded earlier. No-op (returns false) if no email is linked —
 * play_accounts is email-keyed.
 */
export async function pushKeysToCloud(): Promise<boolean> {
  const email = await AsyncStorage.getItem(EMAIL_KEY);
  if (!email) return false;
  const state = await read();
  await write(state);
  return true;
}

/** The timer is the source of truth: once `resetAt` has passed, the balance
 *  refills as soon as anything reads state — no separate "day changed"
 *  check, no UI action required. Also checks for subscription expiration. */
function applyReset(state: KeysState): KeysState {
  if (state.isPremium && state.expiresAt && Date.now() >= new Date(state.expiresAt).getTime()) {
    return {
      ...state,
      isPremium: false,
      expiresAt: null,
      balance: state.balance > 0 && state.balance < 999999 ? state.balance : INITIAL_KEYS,
      resetAt: null,
    };
  }
  if (state.balance <= 0 && state.resetAt !== null && Date.now() >= state.resetAt) {
    return {
      ...state,
      balance: INITIAL_KEYS,
      initialized: true,
      resetAt: null,
      resetCount: (state.resetCount ?? 0) + 1,
    };
  }
  return state;
}

export async function getKeysState(): Promise<KeysState> {
  const stored = await read();
  if (!stored.initialized) {
    const fresh: KeysState = {
      balance: INITIAL_KEYS,
      initialized: true,
      resetAt: null,
      isPremium: false,
    };
    await write(fresh);
    return fresh;
  }

  const resolved = applyReset(stored);
  if (resolved !== stored) {
    await write(resolved);
  }
  return resolved;
}

export async function getKeyBalance(): Promise<number> {
  const state = await getKeysState();
  return state.isPremium ? 999999 : state.balance;
}

export async function spendKey(): Promise<number | null> {
  const state = await getKeysState();
  if (state.isPremium) return 999999;
  if (state.balance <= 0) return null;
  const nextBalance = state.balance - 1;
  const next: KeysState = { ...state, balance: nextBalance };
  await write(next);
  return next.balance;
}

export async function grantBonusKey(count: number, _reason?: string, _ref?: string): Promise<number> {
  const state = await getKeysState();
  const nextBalance = Math.max(0, state.balance) + count;
  const next: KeysState = { ...state, balance: nextBalance, resetAt: null };
  await write(next);
  return next.balance;
}

export async function setPremium(isPremium: boolean, expiresAt?: string | null): Promise<void> {
  const state = await getKeysState();
  const next: KeysState = {
    ...state,
    isPremium,
    expiresAt: isPremium ? (expiresAt !== undefined ? expiresAt : state.expiresAt ?? null) : null,
  };
  await write(next);
  if (isPremium && expiresAt) {
    await AsyncStorage.setItem('@play/premium_expires_at', expiresAt).catch(() => {});
  } else if (!isPremium) {
    await AsyncStorage.removeItem('@play/premium_expires_at').catch(() => {});
  }
}

/** Starts the reset countdown — call this when the "out of keys" screen is
 *  actually shown to the user, not whenever the balance happens to hit 0.
 *  Idempotent: does nothing if a timer is already running. */
export async function startResetTimer(): Promise<KeysState> {
  const state = await getKeysState();
  if (!state.isPremium && state.balance <= 0 && state.resetAt === null) {
    const next: KeysState = {
      ...state,
      resetAt: Date.now() + resetDurationFor(state.resetCount ?? 0),
    };
    await write(next);
    return next;
  }
  return state;
}
