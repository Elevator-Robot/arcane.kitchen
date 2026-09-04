// Arcane Kitchen Service Worker
const CACHE_NAME = 'arcane-kitchen-v3';
const urlsToCache = [
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/mobile-icon-192.png',
  '/mobile-icon-512.png',
  '/apple-touch-icon.png',
];

// Install event - cache immutable shell assets. The app HTML is intentionally
// NOT precached: it must always come from the network so every deploy serves
// the current hashed bundle. Precaching '/' is what pinned users to a stale
// index.html that referenced bundle files which no longer existed.
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await self.skipWaiting();
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(urlsToCache);
    })()
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Runtime Amplify configuration must always reflect the current deploy.
  // Caching it can leave a browser pointing at a deleted branch identity pool.
  if (url.pathname === '/amplify_outputs.json') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // Navigations: network-first. Online always gets the fresh HTML (which
  // references the current hashed bundle). Offline falls back to the last
  // successfully cached index.html.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);
          const cache = await caches.open(CACHE_NAME);
          await cache.put('/index.html', response.clone());
          return response;
        } catch (error) {
          const cached = await caches.match('/index.html');
          if (cached) return cached;
          throw error;
        }
      })()
    );
    return;
  }

  // Static assets: cache-first, refreshed in the background. Hashed bundle
  // filenames are immutable, so a cache hit is always safe; a missing file
  // (e.g. a freshly deployed hashed bundle) goes to the network and is cached.
  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request);
      return (
        cached ||
        fetch(event.request).then((response) => {
          if (response && (response.ok || response.type === 'opaque')) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
      );
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })()
  );
});
