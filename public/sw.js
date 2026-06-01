const CACHE_NAME = 'controlevent-shell-v5-0-0-prod-fix2';
// V30.13: cache nuevo; mantiene bundles legacy estables v30.7 para recuperar login.
const SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/apple-touch-icon.png',
  '/assets/icons/controlevent-welcome-v44.png',
  '/app/styles/app.css',
  '/app/version.js',
  '/app/main.js',
  '/app/debug/debug-mode.js',
  '/app/navigation/screen-lazy.js',
  '/app/performance/legacy-hotpath.js',
  '/app/performance/active-render.js',
  '/app/performance/mobile-lite.js',
  '/app/performance/perf-diagnostics-v44-2.js',
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
  '/app/features/v43-7-fixes.js',
  '/app/features/v43-8-1-fixes.js',
  '/app/features/v43-8-2-fixes.js',
  '/app/features/v44-0-fixes.js',
  '/app/features/v44-3-perf-fixes.js',
  '/app/features/v44-7-event-switcher.js',
  '/app/features/v45-0-maintenance-fixes.js',
  '/app/features/v45-1-budget-labels.js',
  '/app/features/v45-2-role-refresh.js',
  '/app/features/v46-4-ingresos-justificantes-negrita.js',
  '/app/features/v50-1-final-fixes.js',
  '/app/features/v50-2-final-fixes.js',
  '/app/features/v50-4-final-fixes.js',
  '/app/features/v50-9-final-fixes.js',
  '/app/features/v50-10-final-fixes.js',
  '/app/features/v50-11-final-fixes.js',
  '/app/features/v50-19-final-fixes.js',
  '/app/features/v50-20-final-fixes.js',
  '/app/features/v50-22-final-fixes.js',
  '/app/features/v50-24-final-fixes.js',
  '/app/features/v50-26-final-fixes.js',
  '/app/features/v50-27-hard-logout.js',
  '/app/features/v4-0-1-pc-photo-fix.js',
  '/app/features/v5-0-0-prod-final-fix.js',
  '/app/features/v5-0-0-prod-photo-safe-fix.js',
          '/app/features/v46-4-final-fixes.js',
  '/app/features/v46-7-final-fixes.js',
  '/app/features/v46-9-final-fixes.js',
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
