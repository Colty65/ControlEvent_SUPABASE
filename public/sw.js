const CACHE_NAME = 'controlevent-shell-v28-0-2';
const SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/apple-touch-icon.png',
  '/app/styles/app.css',
  '/app/version.js',
  '/app/main.js',
  '/app/debug/debug-mode.js',
  '/modules/module-loader.js',
  '/app/legacy/legacy-bundle-before-modules-v28.0.2.js',
  '/app/legacy/legacy-bundle-after-modules-v28.0.2.js',
  '/assets/embedded/coltylab-logo.png',
  '/assets/embedded/footer-excel.jpg',
  '/assets/embedded/footer-importacion.jpg',
  '/assets/embedded/footer-descarga-datos.jpg',
  '/assets/embedded/footer-mantenimiento.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
