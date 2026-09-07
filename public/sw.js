// PataSkills Play - Background Service Worker for Scheduled Reset Reminders
// Enables notification reminders to fire even when the browser tab is closed.

let resetTimer = null;
let targetResetAt = null;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SCHEDULE_RESET_REMINDER') {
    const resetAt = data.resetAt;
    if (!resetAt) return;

    targetResetAt = resetAt;
    if (resetTimer) clearTimeout(resetTimer);

    const delay = Math.max(500, resetAt - Date.now());

    resetTimer = setTimeout(async () => {
      try {
        await self.registration.showNotification(
          data.title || '🔑 Your Free Sessions are Ready!',
          {
            body: data.body || 'Your 3 practice keys have refilled. Jump back in to continue!',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'keys-reset-reminder',
            renotify: true,
            requireInteraction: true,
            data: { url: '/' },
          }
        );
      } catch (err) {
        console.warn('Failed to show background notification:', err);
      }
    }, delay);
  } else if (data.type === 'CANCEL_RESET_REMINDER') {
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }
    targetResetAt = null;
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
