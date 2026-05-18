# ControlEvent v26.5 — Estabilización y diagnóstico modular

Esta versión continúa después de la v26.3. El plan inicial ya dejó creadas las capas de cálculo, vistas, mantenimiento, Excel/tickets y backend modular. La v26.5 no intenta borrar todavía código del `index.html`; añade una capa de comprobación para poder seguir desmontando el monolito con menos riesgo.

## Objetivo

- Consolidar la arquitectura modular creada hasta v26.3.
- Exponer diagnósticos de frontend y backend.
- Comprobar desde consola si están disponibles los módulos de cálculo, vistas, mantenimiento, Excel y tickets.
- Mantener intacto el comportamiento legacy de INFOEVENTO, backup, tickets, ingresos, compras, donaciones y mantenimiento.

## Archivos nuevos

```text
public/app/diagnostics/runtime-diagnostics.js
```

## Archivos actualizados

```text
public/app/main.js
public/app/version.js
public/modules/module-loader.js
public/modules/views/_view-runtime.js
public/modules/maintenance/_maintenance-runtime.js
public/modules/excel/_excel-runtime.js
public/modules/tickets/_ticket-runtime.js
routes/health.routes.js
server/paths.js
scripts/dev-server-supabase.js
public/index.html
public/sw.js
package.json
package-lock.json
```

## Comandos de prueba

```bash
npm run dev:supabase
```

Abrir:

```text
http://localhost:3030
```

Comprobar backend:

```text
http://localhost:3030/api/version
http://localhost:3030/api/health
http://localhost:3030/api/diagnostics
```

## Comprobaciones desde consola del navegador

```js
ControlEventDiagnostics.print()
ControlEventDiagnostics.inspect()
await ControlEventDiagnostics.checkApi()
ControlEventRuntime.inspect()
await ControlEventRuntime.checkApi()
ControlEventModules.info()
await ControlEventModules.preloadAll()
```

## Modo de trabajo

La v26.5 sigue siendo una versión segura. No sustituye de golpe las funciones antiguas del `index.html`; sólo mejora el control de carga de módulos y la visibilidad de errores.

Si algo no carga, `ControlEventDiagnostics.inspect()` debe indicar qué capa falta.
