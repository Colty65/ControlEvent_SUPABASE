# Hotfix acotado v19_prod - fotos en Cálculos y logo inicial

No cambia la versión de la aplicación.

## Cambios realizados

1. `public/app/features/v17-hotfix-calculos-fotos-ingresos-style.js`
   - Sustituido el parche anterior por un flujo más parecido a Ingresos/Documentos.
   - Usa un input de archivo efímero en cada adjunto.
   - Antes de subir una foto nueva purga alias locales y de servidor del mismo TKxx del evento.
   - No llama a `renderBudget()` tras adjuntar/eliminar, para evitar parpadeos de la ventana Resumen.
   - Evita `fetch()` para la escritura de fotos y usa `XMLHttpRequest`, para no disparar la hidratación antigua que redibujaba varias veces.
   - Mantiene iconos fijos 📎 y 🗑️, sin alternancia visible a textos Adjuntar/Eliminar.

2. `public/app/features/v17-hotfix-logo-graficas-clean.js`
   - Logo CE inicial sin ficha de fondo, tamaño medio y sin texto.
   - Al seleccionar evento se oculta inmediatamente el logo antes de cargar GRAFICAS.
   - Fuerza la transición hacia GRAFICAS sin cambiar versión ni datos.

3. `public/index.html`
   - Añadido el nuevo hotfix del logo al final de la carga de scripts.
