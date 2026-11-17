# ControlEvent v6_1-exp — separación saldo del banco / impacto del evento

Fecha: 15/11/2026

## Corrección

- **Banco (saldo real)**: se sigue leyendo directamente del saldo certificado en el CSV del movimiento, sin recalcularlo ni asignarlo al evento.
- **Impacto acumulado del evento**: empieza en **0,00 €** y suma o resta exclusivamente la parte del movimiento activada **En saldo** para ese evento. Los movimientos inactivos no cambian el acumulado.
- Los movimientos bancarios compartidos entre varios eventos solo aportan su importe correspondiente a cada evento.
- El resumen superior, el detalle de movimientos y el gráfico del evento distinguen claramente ambas cifras.
- La referencia bancaria inicial queda como contexto bancario, nunca como apertura contable de un evento.
- La foto de un evento finalizado utiliza igualmente impacto inicial **0,00 €** y acumulado final propio.

## Ejemplo de aceptación

Un evento con seis ingresos de 20 + 20 + 20 + 20 + 60 + 60 €:

- Impactos del evento en orden cronológico: 20, 40, 60, 80, 140, **200 €**.
- Impacto inicial: **0 €**; impacto final: **200 €**.
- Los saldos bancarios individuales siguen siendo los que figuran en los movimientos del banco.

## Comprobaciones realizadas

- Sintaxis JavaScript de servicio y pantalla.
- Regresión específica `scripts/bank-event-impact-zero-regression.cjs`.
- Regresiones de aislamiento **En saldo** y conciliación multievento RAW14W.

La prueba sintética pasa. La validación con los datos reales y la visualización en Windows quedan para el usuario al arrancar la nueva versión.
