# ControlEvent v23_prod_r2 · HITOS4 · Orden, permisos RO y Zuzu

Esta entrega parte de `CE_v23_PROD_R2_CONTROL_HITOS_3_MENU_REAL_FIX` y mantiene la operativa existente.

## Cambios incluidos

- **Ordenación de LG** desde la propia ventana por:
  - Descripción de la LG.
  - Fecha mínima.
  - Responsable.
- **Dependencias revisadas**:
  - La única fuente editable es ahora **Dependencias previas**.
  - Las **Dependencias posteriores** se calculan y se muestran como información de solo lectura.
  - Se omiten relaciones circulares heredadas para evitar dependencias que no fueron seleccionadas realmente.
  - Al guardar una LG, se recalculan las posteriores y se limpian las incoherencias detectadas.
- **Permisos**:
  - Todos los usuarios pueden abrir y consultar Control de Hitos.
  - `GD` y `RW` pueden crear, modificar y eliminar Hitos y LG.
  - `RO` solo puede modificar, completar o eliminar LG de su responsabilidad.
  - `RO` puede crear una LG, asignada obligatoriamente a su propio usuario; el selector no permite elegir a otra persona.
- **Zuzu**:
  - Se incorporan `ce_hitos` y `ce_lg` como módulos `HITOS` y `LG`.
  - Zuzu recibe nombres humanos, fechas, responsables, cumplimiento y dependencias previas/posteriores.
  - Los informes generales del evento incluyen también el estado de Hitos y LG.
- **Ficha ColtyLAB inicial**:
  - Añadido `Control del hitos (tareas).` dentro de **Control del evento**.
- **Cierre de ventana**:
  - Reforzado el aspa `×` para ratón, táctil y puntero, además de `Esc` y toque fuera de la ventana.

## Base de datos

No se añade una tabla nueva respecto a HITOS3. Si aún no existen `ce_hitos` y `ce_lg`, ejecutar una vez:

`ControlEvent_SQL_V23_R2_HITOS.sql`

## Archivos principales modificados

- `services/hitos.service.js`
- `routes/hitos.routes.js`
- `services/event-ai.service.js`
- `services/event-context.service.js`
- `services/zuzu-report-policy.service.js`
- `app/features/v23-2-hitos-control.js`
- `app/styles/hitos-control.css`
- `app/features/v17-fix27-welcome-info-general.js`
- Duplicados de publicación bajo `public/`
- `index.html` y `public/index.html`
