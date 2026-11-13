/* Service worker SOGECO Fleet Manager : notifications push (navigateur ferme) et installation PWA.
 * Aucun cache hors ligne volontairement : les donnees de flotte doivent toujours etre fraiches,
 * et un cache d'application obsolete masquerait les mises a jour. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Gestionnaire present pour que les navigateurs considerent l'application installable.
self.addEventListener('fetch', () => {});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'SOGECO Fleet Manager', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'SOGECO Fleet Manager';
  const options = {
    body: data.body || '',
    tag: data.tag || undefined, // une meme alerte remplace sa notification au lieu de s'empiler
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/alertes' },
    renotify: Boolean(data.tag),
  };

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // Application deja au premier plan : elle affiche elle-meme l'alerte (bulle + son).
      if (windows.some((w) => w.visibilityState === 'visible' && w.focused)) return undefined;
      return self.registration.showNotification(title, options);
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/alertes';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if ('focus' in w) {
          if ('navigate' in w) w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
