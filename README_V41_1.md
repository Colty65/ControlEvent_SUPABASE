# ControlEvent v50.24

Versión correctiva sobre v41.0.

## Cambios incluidos

- Corregida la descarga de datos / BACKUP: la descarga principal pasa a generarse por servidor para evitar `RangeError: Maximum call stack size exceeded` en eventos grandes.
- En iPhone/Android se elimina la casita negra duplicada de Planificación inicial.
- Las casitas flotantes se fuerzan con mayor prioridad táctil para que no respondan al botón Menú.
- En iPhone/Android la casita sube arriba sin relanzar dos veces la ventana ni provocar parpadeo.
- Al entrar desde LOGIN y seleccionar evento, la primera ventana de trabajo será Gráficas.
- Al cambiar de evento dentro de la app, se conserva la ventana activa anterior y se cargan ahí los datos del nuevo evento.
- El menú principal se ajusta para que todos los botones quepan en la misma línea.
- Se elimina el botón del maletín rosa para ocultar/mostrar Compras y otros gastos del evento.
- En Planificación inicial se elimina el texto antiguo con referencia a versión V33.7.
- En Mapa de recursos, iPhone/Android permiten marcar como Entregado un producto solo donado.
- Versión actualizada a ControlEvent v50.24 en cabecera, backup, service worker, metadatos y ficheros activos.

## Archivos principales modificados

- public/index.html
- public/app/features/v41-1-fixes.js
- public/app/features/v40-fixes.js
- public/app/features/planificacion-inicial.js
- public/app/styles/app.css
- public/sw.js
- public/app/version.js
- public/modules/excel/backup.js
- routes/export.routes.js
- package.json
- package-lock.json
- public/app/diagnostics/build-metrics.json
