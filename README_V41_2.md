# ControlEvent v16_prod

Correcciones sobre v41.1:

- Recupera la casita de subir arriba en el resto de ventanas, sin eliminar las de Mapa de recursos y mantenimiento.
- Evita que la casita móvil pise el botón Menú y elimina el relanzado/parpadeo doble.
- En Mapa de recursos, el botón de Entregado de productos solo donados queda visible y pulsable en móvil vertical.
- En Compras y Donaciones, el botón Modificar guarda el valor actual del desplegable a la primera pulsación.
- Backup reforzado para evitar RangeError por clonado profundo/serialización recursiva del estado.

Archivos principales modificados:

- public/index.html
- public/sw.js
- public/app/features/v41-2-fixes.js
- public/app/features/v40-fixes.js
- public/app/features/v41-1-fixes.js
- public/app/features/mapa-productos.js
- public/app/styles/app.css
- routes/export.routes.js
- version.js / public/app/version.js
