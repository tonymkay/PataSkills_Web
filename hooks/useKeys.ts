import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getKeysState,
  spendKey as spendKeyLib,
  startResetTimer as startResetTimerLib,
} from '@/lib/keys';
import { scheduleResetReminder } from '@/lib/notifications';

export function useKeys() {
  const [balance, setBalance] = useState<number | null>(null);
  const [resetAt, setResetAt] = useState<number | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const state = await getKeysState();
    setIsPremium(!!state.isPremium);
    setBalance(state.isPremium ? 999999 : state.balance);
    setResetAt(state.resetAt);
    return state;
  }, []);

  useEffect(() => {
    void refresh().then(() => setReady(true));
  }, [refresh]);

  // The reset timer is the source of truth
  useEffect(() => {
    if (isPremium || balance === null || balance > 0 || resetAt === null) return;
    const interval = setInterval(() => {
      void refresh();
    }, 1000);
    return () => clearInterval(interval);
  }, [isPremium, balance, resetAt, refresh]);

  const spendKey = useCallback(async (): Promise<number | null> => {
    const next = await spendKeyLib();
    if (next !== null) {
      await refresh();
    }
    return next;
  }, [refresh]);

  const startResetTimer = useCallback(async () => {
    const state = await startResetTimerLib();
    setIsPremium(!!state.isPremium);
    setBalance(state.isPremium ? 999999 : state.balance);
    setResetAt(state.resetAt);
    if (state.resetAt) {
      AsyncStorage.getItem('@play/timer_reminders').then((val) => {
        if (val === 'true') {
          void scheduleResetReminder(state.resetAt);
        }
      }).catch(() => {});
    }
  }, []);

  return {
    balance,
    resetAt,
    isPremium,
    ready,
    spendKey,
    startResetTimer,
    refresh,
    isOutOfKeys: !isPremium && balance !== null && balance <= 0,
  };
}
