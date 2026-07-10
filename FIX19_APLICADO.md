# FIX19 aplicado

Corrección urgente para evitar bloqueo/torpeza en el login de FIX18.

Cambios:
- Retirado de `index.html` el script directo `v19-fix18-prod.js`, que podía ejecutarse antes del flujo de login en entornos que cargan el `index.html` raíz.
- Nuevo `v19-fix19-prod.js` seguro: no hace `fetch`, no toca `/api/login`, no precarga `/api/state`, no instala observadores globales pesados antes de autenticación.
- Los ajustes visuales de Vista aérea, selector de eventos y Zuzu se activan solo después de que el login haya terminado y el overlay de acceso ya no esté visible.
- Se mantienen los cambios de FIX18 en datos de Vista aérea y contexto de Zuzu, pero sin interferir con la entrada.

No se ha tocado mantenimiento de ingresos, descargas, cálculos ni rendimiento general salvo el bloqueo de entrada.
