/**
 * ProFit service worker: resilient app shell + standards-based Web Push.
 * The push path intentionally uses a small common subset of NotificationOptions.
 */

const CACHE_NAME = 'profit-v4';
const APP_SHELL = ['/index.html', '/manifest.json', '/faviconnovo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(APP_SHELL.map((url) => cache.add(url)));
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Navigation must prefer the network so a previous app shell cannot pin an old release.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(async () => (await caches.match('/index.html')) || Response.error()),
    );
    return;
  }

  // Static assets use stale-while-revalidate. Failed images never fall back to HTML.
  if (['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached || Response.error());
        return cached || network;
      }),
    );
  }
});

self.addEventListener('push', (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  if (!payload || typeof payload !== 'object') payload = { body: String(payload || '') };

  const declarativeNotification = payload.notification || {};
  const payloadData =
    payload.data && typeof payload.data === 'object' ? payload.data : {};

  const title = payload.title || declarativeNotification.title || 'ProFit';
  const targetUrl =
    payloadData.url ||
    payloadData.click_action ||
    payload.url ||
    payload.click_action ||
    declarativeNotification.navigate ||
    '/';

  const options = {
    body: payload.body || declarativeNotification.body || '',
    icon: payload.icon || declarativeNotification.icon || '/faviconnovo.png',
    data: { ...payloadData, url: targetUrl },
  };

  // Only group notifications when the sender explicitly provides a tag.
  // A global default tag would replace unrelated notifications on the device.
  const tag = payload.tag || payloadData.tag || declarativeNotification.tag;
  if (tag && tag !== 'profit-push') options.tag = tag;

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let target;
  try {
    target = new URL(event.notification.data?.url || '/', self.location.origin);
    if (target.origin !== self.location.origin) target = new URL('/', self.location.origin);
  } catch {
    target = new URL('/', self.location.origin);
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
      for (const client of windowClients) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        if ('navigate' in client) await client.navigate(target.href);
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow ? self.clients.openWindow(target.href) : undefined;
    }),
  );
});

// Some push services rotate subscriptions. Recreate it when possible and ask any
// open authenticated client to synchronize the new endpoint with the API.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const applicationServerKey = event.oldSubscription?.options?.applicationServerKey;
      if (applicationServerKey) {
        try {
          await self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
        } catch (error) {
          console.warn('[Push] Automatic subscription rotation failed.', error);
        }
      }

      const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      windowClients.forEach((client) => client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' }));
    })(),
  );
});
