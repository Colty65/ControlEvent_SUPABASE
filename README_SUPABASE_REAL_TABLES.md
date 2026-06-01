# ControlEvent v50.24 como base Supabase

Esta carpeta parte de la version funcional `ControlEvent_v50_24_localhost`.

Se mantiene el modo local original:

```bat
npm.cmd run dev
```

Y se anade un modo nuevo para probar la misma app contra tablas reales en Supabase:

```bat
npm.cmd run dev:supabase
```

## Tablas reales detectadas

Desde `data/state.json`, la app trabaja con estas colecciones:

- `eventos`
- `personas`
- `tiendas`
- `productos`
- `colaboradores`
- `compras`
- `ticketImages` / `ticketImageRefs`
- metadatos: `selectedEventId`, `comprasSort`, `summaryTiendaSort`
- accesos: `data/access-users.json`

El SQL equivalente esta en:

```text
sql/001_create_real_tables.sql
```

Crea tablas separadas:

- `ce_users`
- `ce_eventos`
- `ce_personas`
- `ce_tiendas`
- `ce_productos`
- `ce_colaboradores`
- `ce_compras`
- `ce_ticket_images`
- `ce_meta`

## Puesta en marcha Supabase

1. Crea un proyecto en Supabase.
2. Ejecuta `sql/001_create_real_tables.sql` en Supabase SQL Editor.
3. Copia `.env.example` como `.env`.
4. Rellena `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
5. Instala dependencias:

```bat
npm.cmd install
```

6. Comprueba el esquema:

```bat
npm.cmd run supabase:check
```

7. Migra los datos reales de esta v23.6.7:

```bat
npm.cmd run migrate:supabase
```

8. Arranca localhost contra Supabase:

```bat
npm.cmd run dev:supabase
```

Abre:

```text
http://localhost:3030
```

Diagnostico:

```text
http://localhost:3030/api/health
http://localhost:3030/api/diagnostics
```

## Nota

`SUPABASE_SERVICE_ROLE_KEY` solo se usa en el servidor Node local. No se expone en `public/index.html`.
