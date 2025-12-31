// public/sw.js
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked');
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes('/sleep-tracker') && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow('/sleep-tracker');
        }
      })
  );
});

// Handle push events (for future push notification support)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : "Don't forget to log your wake time!",
    icon: '/moon-icon.png',
    badge: '/moon-badge.png',
    tag: 'sleep-reminder',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Time to Wake Up? 🌅', options)
  );
});
