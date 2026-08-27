# ControlEvent v4_0_exp · BANK4.2 · Donaciones pendientes y Responsables

## Paso obligatorio de BBDD
Antes de probar la versión, ejecutar **una sola vez** en Supabase SQL Editor:

`sql/ce_donaciones_situacion_v4.sql`

La migración añade `ce_compras.donacion_situacion`, deja las donaciones históricas sin estado como `Comprometida`, instala la restricción de valores y la RPC específica usada por Mapa de recursos y por el CRUD de Donaciones.

Estados:
- `Supuesta`: se prevé la donación, pero aún no está confirmada con el donante.
- `Comprometida`: el donante la ha confirmado, pero el producto todavía no está recibido.
- `Entregada`: el género ya está físicamente en los almacenes de la peña.

Solo `Entregada` se considera producto físicamente disponible.

## Cambios principales
- Alta y mantenimiento de Donaciones con desplegable de situación; valor por defecto `Comprometida`.
- Botón de entrega del Mapa de recursos persistente en BBDD.
- ColtyLab calcula el porcentaje real de donaciones entregadas.
- Informes de Responsables muestran situación y orden operativo, con totales globales de Compras y Donaciones en cabecera y PDF.
- Botones Responsables de Compras, Donaciones, Mapa y Vista aérea reforzados para evitar estados deshabilitados/intermitentes.
- Zuzu conoce los tres estados y diferencia donación registrada de producto físicamente disponible.
- BACKUP/Excel conserva `SITUACION_ENTREGA`.

## Regresión
Ejecutar:

`npm run test:v4-bank42`
