# ControlEvent v20_prod FIX23 - rendimiento DOM y carga por evento

Base: FIX22.

Cambios principales:
- Nuevo modo de arranque `/api/state?boot=1`: después del login no se cargan compras, ingresos, donaciones ni fotos de todos los eventos.
- Refuerzo cliente: cualquier lectura GET `/api/state` sin evento y sin fallback se convierte en `boot=1`; con evento seleccionado se fuerza `eventId=...`.
- Compras y Donaciones pasan a vista ligera: las filas se muestran compactas y solo se crea el formulario completo con selects cuando se pulsa `Editar` en una fila.
- Esto elimina miles de `<option>`, `<input>` y `<button>` repetidos en listas de eventos grandes.
- No cambia cálculos, fotos, miniaturas, permisos, versión visible ni endpoints CRUD.

Archivos tocados:
- `routes/state.routes.js`
- `lib/supabase-normalized.js`
- `public/index.html`
- `index.html`
- `public/app/features/v17-fix23-performance-dom-event-scope.js`

Objetivo de rendimiento:
- Evitar la carga global inicial pesada.
- Bajar mucho el DOM al entrar/cambiar de evento, especialmente en COMPRAS y DONACIONES.
