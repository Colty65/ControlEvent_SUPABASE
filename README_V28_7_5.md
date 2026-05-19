ControlEvent v28.7.5 - corrección de caché/ActiveRender

Motivo:
- En algunos dispositivos seguía cargando código antiguo v28.6 con ActiveRender activo.
- Eso provocaba que tras seleccionar evento no se renderizaran datos y la app quedara inutilizable.

Cambios clave:
- main nuevo: public/app/main-v28.7.5.js
- index.html carga main-v28.7.5.js y scripts con cache-busting.
- service worker v28.7.5 hace network-first para JS/app/modules.
- cleanupOldCaches elimina caches controlevent-shell antiguos desde la propia página.
- ActiveRender permanece disponible pero desactivado por defecto.

Prueba esperada:
ControlEventDebug.status() -> ControlEvent v28.7.5
ControlEventActiveRender.print() -> enabled:false
Al seleccionar evento deben aparecer datos.
