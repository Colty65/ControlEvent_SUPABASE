# ControlEvent v11.2_prod - Zuzu / Analítica libre

Versión centrada en robustecer la explotación libre con IA sin exponer SQL ni acceso directo a Supabase.

## Cambios principales

- La ventana pasa a llamarse **Soy Zuzu, pregúntame lo que quieras...**.
- El botón de ejecución pasa a ser **Zuzu**.
- Limpiar pasa a icono **🧹**.
- Descargar resultado pasa a icono **⬇️**.
- Se mantiene acceso desde GRAFICAS mediante icono **✨📊**.

## Motor seguro de contexto

Nuevo enfoque en `services/event-context.service.js`:

- ControlEvent decide de forma segura qué eventos y bloques de datos extraer.
- Zuzu no consulta tablas, no ejecuta SQL y no puede modificar datos.
- Se construye un JSON de solo lectura, con datos legibles para humano.
- No se exponen claves internas de persona, tienda o producto en el detalle enviado.
- Para los eventos objetivo se extraen datos completos, no resúmenes parciales.

## Bloques completos disponibles para Zuzu

Para cada evento objetivo:

- Evento y datos generales.
- Ingresos completos y calculados.
- Compras reales completas.
- Compras pendientes completas.
- Donaciones de producto completas.
- Tickets TKxx con detalle contable.
- Documentos del evento.
- Rankings por producto, tienda, responsable, segmento, destino y donante.

## Control de volumen y ambigüedad

Si la petición es demasiado amplia, ambigua o requiere demasiados datos, ControlEvent responde sin llamar a Zuzu:

> Debes ser más concreto en tu petición. Piensa un poco más lo que quieres.

## Validaciones realizadas

- `node --check` en `services/event-context.service.js`.
- `node --check` en `services/event-ai.service.js`.
- `node --check` en `routes/event-ai.routes.js`.
- `node --check` en `public/app/features/v11-2-zuzu-analitica-libre.js`.
- `node --check` en todos los JS de `public/app/features`.
- `node --check` en backend: services, routes, lib, repositories y scripts.
- JSON de `package.json` y `package-lock.json` validado.
- ZIP comprobado con `zip -T`.
