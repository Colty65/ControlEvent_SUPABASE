# ControlEvent v16_prod - OPT3G Donaciones directas en Resumen

Base: v16_prod OPT3F.
Versión visible: se mantiene `v16_prod`.

## Alcance

Se toca únicamente el comportamiento de clic en:

- Resumen presupuestario
- Cálculos por tienda y Ticket
- Filas `DONADO TIENDA`, `DONADO SOCIO`, `DONADO OTROS`

No se toca login, selector de eventos, `/api/state`, GRAFICAS, compras, ingresos, documentos, tickets ni AVANCE.

## Cambio

Las filas de donaciones abren el detalle por delegado directo en `window` antes de que actúen listeners antiguos.
No depende de que el bloque haya sido refrescado manualmente ni de los atributos de globo antiguos.

También se limpian atributos legacy de tooltip en filas donadas para evitar que aparezca texto interno descolocado.

## Prueba

1. Entrar en la app.
2. Abrir Resumen presupuestario.
3. Ir a Cálculos por tienda y Ticket.
4. Pinchar inmediatamente una fila `DONADO OTROS`, `DONADO SOCIO` o `DONADO TIENDA`, sin pulsar Refrescar.
5. Las filas TKxx siguen funcionando como antes.
