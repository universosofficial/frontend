// Web Push & Notification Service Worker for AI Companion
self.addEventListener('push', function (event) {
  console.log('[Service Worker] Push event received:', event);

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'New message',
        body: event.data.text(),
      };
    }
  }

  const title = data.title || 'AI Companion';
  const options = {
    body: data.body || 'You have a new check-in waiting for you.',
    icon: data.icon || 'https://api.dicebear.com/9.x/bottts/svg?seed=CompanionBot',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || 'proactive-checkin',
    renotify: true,
    vibrate: data.vibrate || [200, 100, 200],
    data: data.data || {
      url: data.dataUrl || '/',
      timestamp: Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  console.log('[Service Worker] Notification click received:', event.notification);
  event.notification.close();

  const clickActionUrl =
    event.notification.data && event.notification.data.url
      ? event.notification.data.url
      : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && 'focus' in client) {
          if (client.url.includes(clickActionUrl)) {
            return client.focus();
          }
          return client.focus().then(function () {
            if ('navigate' in client) {
              return client.navigate(clickActionUrl);
            }
          });
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(clickActionUrl);
      }
    })
  );
});

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(clients.claim());
});
