# ControlEvent v19_prod - Fix 1 Mapa global + iconos laterales

Cambios aplicados:

1. Activación real del botón 📊 de la cabecera de **Mapa de recursos**.
   - El botón ahora abre la ventana `Vista gráfica completa del evento`.
   - Se han añadido manejadores robustos en `pointerdown`, `mousedown`, `click` y `touchend`.
   - Se ha añadido apertura delegada en `window` para evitar bloqueos de capturas heredadas de la app.
   - Exposición de compatibilidad: `window.ControlEventMapaGlobalV19.open()`.

2. Iconos laterales izquierdos.
   - Eliminada la ficha/fondo blanco de la columna izquierda.
   - Iconos más pequeños, unificados al tamaño visual del Excel.
   - Iconos más separados verticalmente.
   - Mantienen zona de pulsación suficiente, pero visualmente quedan emergentes con sombra propia.

3. Cache-bust actualizado en `index.html` y `public/index.html` para estos dos JS modificados.

Ficheros modificados:
- `public/app/features/v19-mapa-recursos-global.js`
- `app/features/v19-mapa-recursos-global.js`
- `public/app/features/v18-11-9-layout-left-tools.js`
- `app/features/v18-11-9-layout-left-tools.js`
- `index.html`
- `public/index.html`

Comprobación realizada:
- `node --check` en los JS modificados.
