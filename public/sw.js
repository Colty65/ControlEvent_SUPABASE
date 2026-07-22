// ControlEvent v23_prod_r1
// Service Worker neutralizado: no cachea y elimina caches anteriores para evitar servir JS viejo.
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  // No respondWith: el navegador va siempre a red.
});
