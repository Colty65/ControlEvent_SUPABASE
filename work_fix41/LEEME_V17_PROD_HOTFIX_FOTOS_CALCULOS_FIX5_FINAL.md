# ControlEvent v17_prod - HOTFIX fotos Cálculos FIX5 FINAL

No cambia la versión visible: se mantiene `v17_prod`.

## Cambios aplicados

1. **Cálculos por tienda y ticket**
   - Se vuelve a tomar FIX2 como base.
   - Se sustituye el sistema anterior de fotos por un render directo y único de la lista `summaryTiendaTicket`.
   - No hay MutationObserver ni rehidratación continua en este hotfix.
   - No se llama a `renderBudget()` después de adjuntar o eliminar una foto.
   - Los controles antiguos quedan anulados: solo queda un botón de adjuntar y, si hay foto, una papelera.
   - La imagen visual se toma de `/api/ticket-images` como fuente única, no de restos de `state.ticketImages` ni IndexedDB.

2. **Eliminación y sustitución de fotos TKxx**
   - Al eliminar o sustituir una foto se borran alias locales, `ticketImages`, `ticketImageRefs`, `ticketImagesByKey`, `localStorage` e IndexedDB del mismo TKxx.
   - El backend elimina de `ce_ticket_images` cualquier fila del mismo evento que contenga el mismo `TKxx` en `image_key` o `label`.
   - También se eliminan los `storage_path` asociados para no dejar viva la foto antigua en Supabase Storage.
   - La nueva subida usa la URL devuelta por el backend con cache-busting.

3. **Logo inicial CE**
   - Se fija por CSS desde el `<head>` para que no haya cambios de tamaño mientras otros scripts escriben el contenedor.
   - No hay ficha, no hay texto debajo, solo el logo centrado.
   - Al seleccionar un evento se oculta inmediatamente el logo y se fuerza la pestaña `GRAFICAS`.

## Archivos tocados

- `public/index.html`
- `index.html`
- `public/app/features/v17-hotfix-calculos-fotos-ingresos-style.js`
- `public/app/features/v17-hotfix-logo-graficas-clean.js`
- `lib/supabase-normalized.js`
