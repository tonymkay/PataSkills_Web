import { useCallback, useEffect, useState } from 'react';
import {
  getKeysState,
  spendKey as spendKeyLib,
  startResetTimer as startResetTimerLib,
  markLowKeysWarningShown,
  LOW_KEYS_THRESHOLD,
} from '@/lib/keys';

export function useKeys() {
  const [balance, setBalance] = useState<number | null>(null);
  const [resetAt, setResetAt] = useState<number | null>(null);
  const [lowKeysWarningShown, setLowKeysWarningShown] = useState(false);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const state = await getKeysState();
    setBalance(state.balance);
    setResetAt(state.resetAt);
    setLowKeysWarningShown(state.lowKeysWarningShown);
    return state;
  }, []);

  useEffect(() => {
    void refresh().then(() => setReady(true));
  }, [refresh]);

  // The reset timer is the source of truth: while the balance is depleted
  // and a reset is pending, keep re-reading state so the refill applies
  // itself the moment it's due, even if the user just sits on this screen.
  useEffect(() => {
    if (balance === null || balance > 0 || resetAt === null) return;
    const interval = setInterval(() => {
      void refresh();
    }, 1000);
    return () => clearInterval(interval);
  }, [balance, resetAt, refresh]);

  const spendKey = useCallback(async (): Promise<number | null> => {
    const next = await spendKeyLib();
    if (next !== null) {
      await refresh();
    }
    return next;
  }, [refresh]);

  // Call this when the "out of keys" screen actually mounts — the timer
  // starts from here, not from whenever the balance happened to hit 0.
  const startResetTimer = useCallback(async () => {
    const state = await startResetTimerLib();
    setBalance(state.balance);
    setResetAt(state.resetAt);
    setLowKeysWarningShown(state.lowKeysWarningShown);
  }, []);

  const dismissLowKeysWarning = useCallback(async () => {
    await markLowKeysWarningShown();
    setLowKeysWarningShown(true);
  }, []);

  const shouldShowLowKeysWarning =
    balance !== null &&
    balance === LOW_KEYS_THRESHOLD &&
    !lowKeysWarningShown;

  return {
    balance,
    resetAt,
    ready,
    spendKey,
    startResetTimer,
    dismissLowKeysWarning,
    shouldShowLowKeysWarning,
    isOutOfKeys: balance !== null && balance <= 0,
  };
}
