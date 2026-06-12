// ControlEvent v8.5_prod FIX24
// Service Worker neutralizado: nada de cache, para que no sobrevivan scripts viejos.
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => { return; });
