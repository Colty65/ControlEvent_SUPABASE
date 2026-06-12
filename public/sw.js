// ControlEvent v8.5_prod FIX23
// Service Worker neutralizado para evitar JS antiguo en caché durante la contención de escrituras.
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', event => {
  // No cachear nada en FIX23. Todo va a red.
  return;
});
