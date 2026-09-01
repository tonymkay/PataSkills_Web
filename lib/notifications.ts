import { Platform } from 'react-native';

let resetNotificationTimer: any = null;

/**
 * Requests browser/OS notification permissions when user enables reminder toggle.
 * Safe on web and native.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'web' || typeof window !== 'undefined') {
      if ('Notification' in window) {
        const result = await Notification.requestPermission();
        return result === 'granted';
      }
      return true;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Schedules a notification to fire exactly when the cooldown timer reaches zero.
 */
export function scheduleResetReminder(resetAt: number | null): void {
  if (resetNotificationTimer) {
    clearTimeout(resetNotificationTimer);
    resetNotificationTimer = null;
  }

  if (!resetAt) return;

  const delay = Math.max(500, resetAt - Date.now());

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      resetNotificationTimer = setTimeout(() => {
        try {
          const notif = new Notification('🔑 Your Free Sessions are Ready!', {
            body: 'Your 3 practice keys have refilled. Jump back in to continue!',
            icon: '/favicon.ico',
            requireInteraction: true,
          });
          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        } catch {}
      }, delay);
    }
  }
}

/**
 * Cancels any pending scheduled reset reminder notification.
 */
export function cancelResetReminder(): void {
  if (resetNotificationTimer) {
    clearTimeout(resetNotificationTimer);
    resetNotificationTimer = null;
  }
}
