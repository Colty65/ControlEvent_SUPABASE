// ControlEvent v18.11.6_prod ZUZU_INTELIGENTE2
// Service Worker neutralizado: nada de caché. Siempre red para evitar JS viejo.
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => { return; });

// fix33-compras-head
// fix34-compras-ui
