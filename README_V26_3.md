# ControlEvent v26.3 - Modularización de backend

Versión generada sobre `ControlEvent v26.2`.

## Objetivo

Avanza el paso del plan:

- `v26.3 - Backend más mantenible`.

El frontend queda igual que en v26.2, salvo los textos/caché/versionado. La mejora principal está en el backend Supabase usado por Vercel y por `npm run dev:supabase`.

## Nueva estructura backend

```text
server/
  app.js
  paths.js
routes/
  _async.js
  state.routes.js
  auth.routes.js
  access.routes.js
  ticket-images.routes.js
  health.routes.js
services/
  state.service.js
  auth.service.js
  ticket-images.service.js
repositories/
  supabase-state.repository.js
storage/
  supabase-storage.js
```

## Compatibilidad

- `api/index.js` ahora importa `server/app.js` directamente.
- `scripts/dev-server-supabase.js` queda como lanzador local de la app modular.
- Las rutas públicas se mantienen iguales:
  - `/api/state`
  - `/api/login`
  - `/api/change-password`
  - `/api/access-users`
  - `/api/ticket-images`
  - `/api/health`
  - `/api/diagnostics`
- Se añade `/api/version` para comprobar backend y versión.

## Cómo probar

```bash
npm run dev:supabase
```

Abrir:

```text
http://localhost:3030
```

Comprobaciones recomendadas:

1. Login.
2. Carga de eventos/datos.
3. Guardado de cambios.
4. Accesos GD/RW/RO.
5. Fotos de tickets.
6. INFOEVENTO.
7. `/api/health`.
8. `/api/version`.

## Notas

El servidor local JSON (`npm run dev`) se conserva sin modularizar para no mezclar riesgos. La ruta importante para equiparar local con Vercel sigue siendo:

```bash
npm run dev:supabase
```
