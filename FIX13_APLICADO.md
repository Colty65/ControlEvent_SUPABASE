# ControlEvent v20_prod - FIX13 aplicado

Fecha: 09/07/2026

## Correcciones incluidas

1. Selector EVENTO tras login
   - Se fuerza una lectura ligera `/api/state?boot=1` para recuperar el catálogo completo de eventos.
   - El desplegable `#selectedEvent` se reconstruye desde `state.eventos` antes de abrirlo, evitando que aparezcan solo 2 eventos hasta elegir uno.
   - No se mezclan datos pesados de eventos ni se pisan documentos/tickets al hacer esta carga de catálogo.

2. INGRESOS / COLABORADORES
   - Tras alta/modificación/borrado por `/api/crud/colaboradores`, se refresca el evento activo con `/api/state?eventId=...` y se repinta inmediatamente.
   - Se mantiene en memoria el registro recién guardado para bloquear repintados antiguos de `/api/state`.
   - El registro actualizado queda sombreado temporalmente.
   - El borrado/subida de justificantes por `/api/ticket-images` actualiza `ticketImages/ticketImageRefs`, quita la miniatura local y refresca el evento.

3. Vista aérea
   - Cabeceras de INGRESOS y PRODUCTO DISPONIBLE con fondo gris medio y letra mayor.
   - Líneas de detalle con letra mayor.
   - Columna SEGMENTO desplazada 8 caracteres a la izquierda y más ancha.
   - Botón [Ver todo] de INGRESOS/PRODUCTO DISPONIBLE queda iluminado cuando es la vista activa.
   - SEG/DEST seleccionado queda con fondo azul y borde destacado.
   - Fichas superiores con color más visible.

4. Zuzu / fecha / timeout
   - `fechaActualControlEvent` se calcula en zona Europe/Madrid.
   - El contexto temporal se entrega explícitamente a Zuzu.
   - Si el evento es futuro, Zuzu recibe instrucción reforzada de hablar en futuro aunque el estado sea “En curso”.
   - Se detectan y corrigen frases como “hoy 10 de julio” cuando ControlEvent está a 09/07/2026 y el evento es 10/07/2026.
   - Timeout de redacción narrativa ampliado de 8s a 22s (30s si se pide texto largo/una página).
   - Timeout de respuesta estructurada ampliado a 24s.
   - Si la redacción humana da timeout, ControlEvent puede presentar una redacción local de respaldo en vez de dejar una pantalla de timeout para peticiones corrientes.

5. Archivos
   - Se añade `app/features/v19-fix13-prod.js` y `public/app/features/v19-fix13-prod.js`.
   - Se añade también `app/features/v19-fix12-prod.js` para evitar 404 si el HTML raíz lo referencia.
   - `index.html` y `public/index.html` cargan FIX13 con cache busting.

## Validación realizada

- `node --check services/event-ai.service.js`
- `node --check services/event-context.service.js`
- `node --check routes/event-ai.routes.js`
- `node --check app/features/v19-fix13-prod.js`
- `node --check public/app/features/v19-fix13-prod.js`
- `node --check app/features/v19-mapa-recursos-global.js`
- `node --check public/app/features/v19-mapa-recursos-global.js`
- ZIP validado con `unzip -t`.
