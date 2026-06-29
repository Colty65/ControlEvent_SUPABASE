# ControlEvent v17_prod - Hotfix fotos Cálculos FIX3

No se cambia la versión visible de la app.

Cambios acotados:

1. `public/app/features/v17-hotfix-calculos-fotos-ingresos-style.js`
   - Sustituye los controles legacy de foto en “Cálculos por tienda y ticket” por un único gestor final.
   - Elimina duplicados de clip/papelera/input dentro de cada fila.
   - Usa input efímero, como Ingresos/Documentos.
   - No llama a `renderBudget()` al adjuntar/eliminar.
   - Al adjuntar, borra primero aliases locales y servidor, sube la foto seleccionada y guarda solo la clave canónica del ticket.
   - Añade cache-busting de cliente sobre la URL devuelta.

2. `lib/supabase-normalized.js`
   - El borrado/sustitución de imágenes de tickets TKxx ahora localiza también aliases antiguos del mismo TKxx dentro del mismo evento.
   - Al subir una nueva imagen de TKxx se eliminan filas/paths antiguos relacionados con ese TKxx, no solo la clave exacta.
   - Evita que una URL antigua sobreviva por alias aunque la fila principal se haya borrado/reinsertado.

3. `public/index.html`
   - Se actualiza solo el parámetro de carga del hotfix para evitar caché del navegador.
