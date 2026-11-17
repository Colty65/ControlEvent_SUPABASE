# Zuzu v6 — corrección de lectura de ingresos bancarios por evento

## Hallazgo
La entrada `runZuzuV6Agent` utilizaba el estado genérico sin llamar a `attachBankState`. Por ello `v6Rows('bank_movements')` operaba sobre un array vacío. Además, los movimientos bancarios globales no contienen una asignación fiable `event_id`: la asignación se determina con los estados y vínculos del Cuadre Banco.

## Corrección
- Se obtiene `exportBankData({eventId: selectedEventId, accountId:'TODOS'})` antes de consultar Gemini. Es la fotografía de conciliación específica del evento, también si está finalizado.
- `exportBankData` utiliza ahora la opción `readOnly:true`, que impide crear automáticamente un periodo bancario al consultar desde Zuzu.
- Se exponen en `meta.bank_snapshot` los contadores e importes certificados de movimientos bancarios incluidos, abonos, abonos con ingresos asociados, abonos cuadrados, y documentos de ingreso conciliados/pedientes.
- La entidad lógica `bank_movements` devuelve filas del evento y campos que distinguen vinculación y cuadre. La entidad `events` incorpora los indicadores bancarios derivados del modelo de lectura, sin cálculos del modelo de lenguaje.
- Si la lectura bancaria falla, el turno falla explícitamente: nunca se sustituye por un conjunto vacío que simule ausencia de movimientos.
- No se introducen expresiones de usuario específicas, fechas o nombres de jornadas en el núcleo genérico.

## Semántica importante
El contador `income_document_reconciled_count` corresponde a justificantes/ingresos del evento vinculados según el resumen de conciliación (por ejemplo 29/34 en la pantalla). No necesariamente equivale al número de movimientos bancarios: un movimiento puede justificar varios ingresos. `bank_income_associated_movement_count` cuenta movimientos de abono con al menos un ingreso vinculado y `bank_income_associated_movement_amount` suma los importes de esos movimientos.

## Pruebas y límites
- `node --check` en los archivos modificados: OK.
- Suite de conciliación multievento: 31/31 OK.
- `nov13-bank-zuzu-regression.cjs`: 9 controles estructurales OK.
- Auditoría del núcleo genérico sin reglas lingüísticas locales: OK.
- Algunas suites antiguas de Zuzu verifican arquitecturas anteriores y no pasan de forma íntegra; no se consideran validación de esta ruta.
- Sin acceso a las credenciales de producción: pendiente prueba real con Supabase y Gemini.
