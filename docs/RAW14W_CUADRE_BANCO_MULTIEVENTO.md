# RAW14W · Cuadre Banco multievento

## Regla contable

Un movimiento bancario existe una sola vez. Si liquida compras de varios eventos, cada evento imputa únicamente la suma de sus propios TKxx.

Ejemplo: retirada bancaria de 120 € con TKxx 89 € + 5 € de un evento y 26 € de otro:

- Banco: -120 € una sola vez.
- Evento A: -94 €.
- Evento B: -26 €.
- Estado global: CUADRADO_COMPARTIDO.

Mientras la suma global no justifique el movimiento, el movimiento permanece pendiente en todos los eventos implicados aunque la parte local de uno de ellos ya esté completamente identificada.

Si los justificantes suman 118,56 € frente a una retirada de 120 €, los 1,44 € no se imputan a ningún evento. Un usuario autorizado puede aceptar expresamente la diferencia residual; entonces el movimiento se cierra globalmente con trazabilidad de usuario y fecha.

## Implementación

- `ce_bank_ticket_links` mantiene un vínculo por `movement_id + event_id + ticket_code` y admite varios TKxx del mismo o de distintos eventos para el mismo movimiento. Si la BBDD procede de una versión antigua, ejecutar `sql/ce_bank_ticket_links_multi_v4.sql` para retirar restricciones UNIQUE históricas demasiado restrictivas.
- Nueva tabla `ce_bank_movement_settlements` para diferencias residuales aceptadas globalmente.
- La suma global de TKxx nunca puede superar el importe absoluto del movimiento.
- Añadir un TKxx invalida cualquier diferencia aceptada anterior y obliga a recalcular el cierre.
- Un vínculo de TKxx hace visible el movimiento en el evento aunque quede fuera del periodo bancario configurado.
- La evolución histórica superior sigue mostrando el movimiento bancario real y su saldo real.
- El zoom del evento usa `eventAppliedAmount` y muestra solo los TKxx del evento actual.
- Zuzu distingue `Importe banco` de `Importe evento`.
- Backup/restore incorpora `BANCO_CIERRE_MVTO`.

## SQL

Ejecutar `sql/ce_bank_multievento_raw14w.sql` antes de utilizar la aceptación de diferencias.

## Regresiones

- `node scripts/cuadre-banco-multievento-raw14w-regression.cjs`
- `node scripts/cuadre-banco-en-curso-import-regression.cjs`
