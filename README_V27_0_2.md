# ControlEvent v27.1

Corrección de descarga de datos/BACKUP.

## Problema corregido
En v27.0.1 se corrigió la versión de INFOEVENTO, pero la descarga de datos podía no generar archivo en algunos entornos. Para evitar depender del estado frontend y de ExcelJS en navegador, la descarga principal pasa a generarse desde servidor.

## Nuevo flujo
1. El frontend abre el selector de alcance: TODOS o evento.
2. El módulo `public/modules/excel/backup.js` llama a `/api/export/backup?scope=...`.
3. El servidor lee el estado real con `getState()` y genera el `.xlsx` con ExcelJS.
4. Si el endpoint no estuviera disponible, queda fallback cliente.

## Endpoint nuevo
- `GET /api/export/backup?scope=TODOS`
- `GET /api/export/backup?scope=<eventId>`

## Versión esperada en ficheros
- `ControlEvent_v27_1_INFOEVENTO-...xlsx`
- `ControlEvent_v27_1_BACKUP_TODOS_...xlsx`

## Archivos obsoletos que pueden borrarse si existen
- `public/app/legacy/legacy-bundle-before-modules-v27.0.1.js`
- `public/app/legacy/legacy-bundle-after-modules-v27.0.1.js`
