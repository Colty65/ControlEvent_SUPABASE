const CACHE_NAME = 'controlevent-shell-v43-4';
// V30.12: cache nuevo; mantiene bundles legacy estables v30.7 para recuperar login.
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
  '/app/navigation/screen-lazy.js',
  '/app/performance/legacy-hotpath.js',
  '/app/performance/active-render.js',
  '/app/performance/mobile-lite.js',
  '/app/performance/low-resource-boot.js',
  '/app/performance/low-resource-legacy-patch.js',
  '/app/features/mapa-productos.js',
  '/app/features/planificacion-inicial.js',
  '/app/features/ingresos-select-fix.js',
  '/app/features/view-refresh-stabilizer.js',
  '/app/features/budget-tooltips-lite.js',
  '/app/features/summary-tienda-sort-fix.js',
  '/app/features/maintenance-duplicates-v32.1.js',
  '/app/features/v40-fixes.js',
  '/app/features/v41-1-fixes.js',
  '/app/features/v41-2-fixes.js',
  '/app/features/v41-3-fixes.js',
  '/app/features/v43-4-fixes.js',
  '/app/features/event-delete-cascade-v33.7.js',
  '/modules/module-loader.js',
  '/modules/menu-registry.js',
  '/modules/views/_view-runtime.js',
  '/modules/views/mapa-productos.js',
  '/app/legacy/legacy-bundle-before-modules-v30.7.js',
  '/app/legacy/legacy-bundle-after-modules-v30.7.js',
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
