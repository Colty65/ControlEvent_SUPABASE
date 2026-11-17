# ControlEvent v6_1-exp — corrección de «En saldo» (13/11/2026)

## Incidencia
Al seleccionar «En saldo» en la V Jornada Solidaria vs ELA aparecían movimientos de julio y otros meses aunque solo seis abonos de noviembre de 2026 estaban asociados al evento. La cabecera mostraba un periodo muy amplio, 24/02/2020–13/11/2026.

## Causa localizada
La carga de movimientos en curso recuperaba todos los movimientos candidatos del periodo y, cuando faltaba una decisión propia del evento, heredaba `included` del registro global (`ce_bank_movements`). Además, las filas `PERIODO_APLICADO` podían materializar masivamente ese indicador provisional. Eso confundía «movimientos bancarios dentro del periodo» con «movimientos incluidos en el saldo del evento».

## Corrección
En un evento EN CURSO, una fila del extracto sin asociación propia de TKxx, sin asociación persistida de ingreso y sin decisión específica del evento ya no se incluye automáticamente en el saldo. El estado global deja de ser una autoridad para el evento. Las filas creadas masivamente por `PERIODO_APLICADO` no acreditan por sí solas la inclusión. Se respetan los estados manuales explícitos, los movimientos importados desde el evento, las asociaciones a ingresos y tickets y la foto de eventos FINALIZADOS. No se han modificado tablas, SQL ni registros en Supabase.

**Efecto intencionado:** un movimiento antiguo que solo estaba marcado «En saldo» por el estado global o por la aplicación automática de un periodo muy amplio pasará a «Fuera del saldo» en el evento en curso. Se puede incorporar de nuevo con su interruptor manual si realmente pertenece al evento. No se borran asociaciones.

## Verificación
- `node --check services/bank-reconciliation.service.js`: correcto.
- `node scripts/bank-event-in-saldo-isolation-regression.cjs`: 7/7 comprobaciones.
- `node scripts/v4-1-exp-bank49-manual-state-authority-regression.cjs`: 8/8 comprobaciones.
- `node scripts/nov13-bank-zuzu-regression.cjs`: correcto.
- Las suites históricas no pasan íntegramente por aserciones anteriores/archivos ya inexistentes; no se ha ejecutado una conexión real con Supabase.

## Prueba manual recomendada
1. Hacer copia de seguridad.
2. Arrancar esta versión en el mismo entorno `.env`.
3. Abrir V Jornada → Cuadre Banco → «En saldo». Comprobar que aparecen los seis ingresos de noviembre, y no los movimientos de julio ajenos.
4. Cambiar a «Todos los movimientos» y comprobar que los movimientos de julio siguen consultables en el histórico y, si procede, se pueden marcar manualmente.
5. Abrir la IV Jornada finalizada y comprobar que conserva su fotografía y sus justificantes.
6. Para una vista más manejable, aplicar fechas 08/11/2026–13/11/2026 **solo si** ese es realmente todo el periodo bancario que debe conciliar el evento. El cambio de fechas altera el periodo contable; no debe hacerse automáticamente sin confirmación.
