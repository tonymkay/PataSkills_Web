import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { getKeysState } from '@/lib/keys';

const REMINDERS_KEY = '@play/timer_reminders';
const SCHEDULED_RESET_KEY = '@play/scheduled_reset_at';
const LAST_NOTIFIED_KEY = '@play/last_notified_reset_at';
const ANDROID_CHANNEL_ID = 'keys-reset-reminder';
const ANDROID_NOTIFICATION_TITLE = '🔑 Your Free Sessions are Ready!';
const ANDROID_NOTIFICATION_BODY = 'Your 3 practice keys have refilled. Jump back in to continue!';

let foregroundTimer: ReturnType<typeof setTimeout> | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;

if (Platform.OS === 'android') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Session reminders',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

/**
 * Register background Service Worker for web notifications that survive tab close.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = reg;
    return reg;
  } catch (err) {
    console.warn('Service worker registration failed:', err);
    return null;
  }
}

/**
 * Requests browser/OS notification permissions when user enables reminder toggle.
 * Registers Service Worker upon permission grant on web.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) return true;
      const requested = await Notifications.requestPermissionsAsync();
      return requested.granted;
    } catch {
      return false;
    }
  }
  try {
    if (Platform.OS === 'web' || typeof window !== 'undefined') {
      if ('Notification' in window) {
        let perm = Notification.permission;
        if (perm !== 'granted' && perm !== 'denied') {
          perm = await Notification.requestPermission();
        }
        if (perm === 'granted') {
          await registerServiceWorker();
          return true;
        }
        return false;
      }
      return true;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Shows the "keys ready" notification immediately and records the reset timestamp
 * to prevent duplicate notifications.
 */
export async function showKeysReadyNotification(resetAt?: number): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const title = '🔑 Your Free Sessions are Ready!';
  const options: NotificationOptions = {
    body: 'Your 3 practice keys have refilled. Jump back in to continue!',
    icon: '/favicon.ico',
    tag: 'keys-reset-reminder',
    requireInteraction: true,
  };

  try {
    if (swRegistration && 'showNotification' in swRegistration) {
      await swRegistration.showNotification(title, options);
    } else if (navigator.serviceWorker && 'ready' in navigator.serviceWorker) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, options);
    } else {
      const notif = new Notification(title, options);
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }

    if (resetAt) {
      await AsyncStorage.setItem(LAST_NOTIFIED_KEY, String(resetAt)).catch(() => {});
    }
  } catch (err) {
    console.warn('Failed to fire notification:', err);
  }
}

/**
 * Schedules a notification to fire exactly when the cooldown timer reaches zero.
 * Dispatches to both the background Service Worker (survives tab close) and foreground timer.
 */
export async function scheduleResetReminder(resetAt: number | null): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (resetAt && resetAt > Date.now()) {
        await ensureAndroidChannel();
        await Notifications.scheduleNotificationAsync({
          content: { title: ANDROID_NOTIFICATION_TITLE, body: ANDROID_NOTIFICATION_BODY },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(resetAt),
            channelId: ANDROID_CHANNEL_ID,
          },
        });
      }
    } catch {}
    return;
  }

  if (foregroundTimer) {
    clearTimeout(foregroundTimer);
    foregroundTimer = null;
  }

  if (!resetAt) {
    await cancelResetReminder();
    return;
  }

  await AsyncStorage.setItem(SCHEDULED_RESET_KEY, String(resetAt)).catch(() => {});

  const now = Date.now();
  if (now >= resetAt) {
    const lastNotified = await AsyncStorage.getItem(LAST_NOTIFIED_KEY).catch(() => null);
    if (lastNotified !== String(resetAt)) {
      await showKeysReadyNotification(resetAt);
    }
    return;
  }

  const delay = Math.max(500, resetAt - now);

  // 1. Post to Service Worker to schedule background delivery even if the tab is closed
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = swRegistration || (await navigator.serviceWorker.ready.catch(() => null));
      if (reg) {
        reg.active?.postMessage({
          type: 'SCHEDULE_RESET_REMINDER',
          resetAt,
          title: '🔑 Your Free Sessions are Ready!',
          body: 'Your 3 practice keys have refilled. Jump back in to continue!',
        });
      }
    } catch {}
  }

  // 2. Set foreground timeout as local backup while the app remains open
  foregroundTimer = setTimeout(async () => {
    const lastNotified = await AsyncStorage.getItem(LAST_NOTIFIED_KEY).catch(() => null);
    if (lastNotified !== String(resetAt)) {
      await showKeysReadyNotification(resetAt);
    }
  }, delay);
}

/**
 * Cancels any pending scheduled reset reminder notification.
 */
export async function cancelResetReminder(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {}
    return;
  }

  if (foregroundTimer) {
    clearTimeout(foregroundTimer);
    foregroundTimer = null;
  }

  await AsyncStorage.removeItem(SCHEDULED_RESET_KEY).catch(() => {});

  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = swRegistration || (await navigator.serviceWorker.ready.catch(() => null));
      if (reg) {
        reg.active?.postMessage({ type: 'CANCEL_RESET_REMINDER' });
      }
    } catch {}
  }
}

/**
 * Initializes notification subsystem on app start:
 * - Registers background service worker
 * - Re-evaluates reminders if user closed the app and reopened it
 * - If timer completed while app was closed, immediately fires the ready notification!
 */
export async function initNotifications(): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    await registerServiceWorker();
  }

  try {
    const enabled = (await AsyncStorage.getItem(REMINDERS_KEY)) === 'true';
    if (!enabled) return;

    const ks = await getKeysState();
    if (ks.resetAt) {
      await scheduleResetReminder(ks.resetAt);
    }
  } catch {}
}
