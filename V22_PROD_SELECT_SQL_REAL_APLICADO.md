# ControlEvent v22_prod · SELECT SQL real experimental

Base: CE_v21_PROD_BASE_FIX30_SQL_SELECT_EXPERIMENTAL.

Cambios:
- Versionado global a v22_prod / 22.0.0, incluyendo nombres usados por INFOEVENTO/BACKUP donde aparecen como VERSION_FILE o textos de versión.
- Zuzu planificador recibe el esquema real de tablas y campos Supabase.
- Zuzu puede devolver SELECTS_PROPUESTOS usando tablas reales.
- ControlEvent valida que sean SELECT de solo lectura y las ejecuta literalmente mediante RPC `ce_zuzu_select`.
- Los resultados aparecen como módulo `SELECTS_SQL_ZUZU` y como tablas/ficheros cuando hay filas.

Importante:
- Para ejecutar SQL real en Supabase hay que instalar `ControlEvent_SQL_V22_ZUZU_SELECT_RPC.sql` una vez en Supabase SQL Editor.
- Sin esa RPC, la app seguirá funcionando, pero la traza marcará que no pudo ejecutar SELECT real.
- Solo se aceptan SELECT; se rechazan mutaciones, múltiples sentencias, comentarios y esquemas no permitidos.
