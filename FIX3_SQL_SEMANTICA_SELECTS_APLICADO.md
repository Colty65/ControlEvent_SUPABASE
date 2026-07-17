# V22_prod FIX3 · SQL semántico para Zuzu

Base: CE_v22_PROD_SQL_SELECT_REAL_FIX2_HUMANO_COLTYLAB.zip

Cambios:

- Zuzu planificador recibe más semántica de tablas/campos:
  - `numero * precio` = cuota obligatoria;
  - `importe` en colaboradores = voluntario/adicional;
  - `numero = 0` puede ser exento;
  - `Pte. Compra`/`PENDIENTE` son compras previstas y deben incluirse si el usuario pide provisionales/En curso como finalizados;
  - `DONADO SOCIO/TIENDA/OTROS` son donaciones de producto;
  - `consumido` se interpreta como unidades de compras/donaciones según el prompt.
- Zuzu debe devolver también `CRITERIO_INCLUSION`, `CRITERIO_EXCLUSION`, `SELECT_PRINCIPAL` y `SELECT_VALIDACION`.
- CE ya no usa literales de las SELECT como filtros automáticos de módulos oficiales; la SQL se ejecuta literalmente y las plantillas CE quedan como respaldo/auditoría.
- Si todas las SELECT devuelven 0 filas pero los módulos oficiales tienen datos, CE descarta esa salida SQL vacía y usa cálculo local/plantillas.
- Las gráficas automáticas del PDF no se generan desde SELECT descriptivas/documentales ni desde tablas sin métrica agregada útil.

Archivos tocados:

- services/event-ai.service.js
- services/event-context.service.js
- public/app/features/v11-3-zuzu-analitica-libre.js
- app/features/v11-3-zuzu-analitica-libre.js
- public/index.html
- index.html
