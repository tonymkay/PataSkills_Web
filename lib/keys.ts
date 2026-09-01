import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@play/keys';

export const INITIAL_KEYS = 4;

/** How long a depleted balance takes to refill, counted from the moment the
 *  "out of keys" screen is actually shown (not from the moment the balance
 *  hits 0 — those can differ by a session or two). 4 minutes while testing;
 *  will move to a real daily window later. */
export const KEYS_RESET_DURATION_MS = 4 * 60 * 1000;

export interface KeysState {
  balance: number;
  initialized: boolean;
  isPremium?: boolean;
  /** Epoch ms when balance refills. Set the moment balance hits 0; null
   *  whenever balance is > 0. */
  resetAt: number | null;
}

async function read(): Promise<KeysState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as KeysState;
  } catch {}
  return { balance: INITIAL_KEYS, initialized: false, resetAt: null, isPremium: false };
}

async function write(state: KeysState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/** The timer is the source of truth: once `resetAt` has passed, the balance
 *  refills as soon as anything reads state — no separate "day changed"
 *  check, no UI action required. */
function applyReset(state: KeysState): KeysState {
  if (state.balance <= 0 && state.resetAt !== null && Date.now() >= state.resetAt) {
    return {
      ...state,
      balance: INITIAL_KEYS,
      initialized: true,
      resetAt: null,
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

export async function setPremium(isPremium: boolean): Promise<void> {
  const state = await getKeysState();
  const next: KeysState = { ...state, isPremium };
  await write(next);
}

/** Starts the reset countdown — call this when the "out of keys" screen is
 *  actually shown to the user, not whenever the balance happens to hit 0.
 *  Idempotent: does nothing if a timer is already running. */
export async function startResetTimer(): Promise<KeysState> {
  const state = await getKeysState();
  if (!state.isPremium && state.balance <= 0 && state.resetAt === null) {
    const next: KeysState = { ...state, resetAt: Date.now() + KEYS_RESET_DURATION_MS };
    await write(next);
    return next;
  }
  return state;
}
