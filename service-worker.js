// Service Worker for Finorix Pro PWA — Network-First Strategy
const CACHE_NAME = 'finorix-pro-v3';

// Install: skip waiting immediately to activate new SW
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Activate: delete ALL old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: NETWORK-FIRST — always try server first, cache only as offline fallback
self.addEventListener('fetch', event => {
  const req = event.request;
  // Only cache GET requests for same-origin pages
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) {
    return;
  }
  // Never cache API calls
  if (req.url.includes('/api/')) {
    return;
  }
  event.respondWith(
    fetch(req)
      .then(response => {
        // Got fresh response — cache it for offline use
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return response;
      })
      .catch(() => {
        // Offline — serve from cache if available
        return caches.match(req);
      })
  );
});
