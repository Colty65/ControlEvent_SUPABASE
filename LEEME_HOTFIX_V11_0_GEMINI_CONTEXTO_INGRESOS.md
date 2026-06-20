# HOTFIX v11.2_prod - Gemini libre: contexto ampliado de INGRESOS

No cambia la versión visible de la app: sigue siendo v11.2_prod.

Problema detectado:
- Gemini recibía el total bruto de ingresos (`row.importe`) pero no siempre el cálculo completo de ingresos de socios.
- En socios, el importe obligatorio se calcula como `número de entradas * precio de entrada del evento`.
- Por eso podía decir que no existían 800 € de socios aunque esos datos estuvieran en INGRESOS.

Cambio aplicado:
- `services/event-ai.service.js`
  - Añade resumen de ingresos por evento:
    - ingresosTotal
    - ingresosSocios
    - ingresosNoSociosYOtros
    - importeObligatorioSocios
    - importeVoluntario
    - ingresosPorFormaPago
    - ingresosPorTipoPersona
  - Añade detalle de cada ingreso con:
    - colaborador
    - tipoPersona
    - esSocio
    - número
    - forma de pago
    - importe obligatorio de socio
    - importe voluntario / no socio
    - total calculado
    - importe bruto guardado en BBDD
  - Refuerza el prompt interno para que Gemini no use solo el campo bruto `importe` cuando haya socios.

Validación:
- `node --check services/event-ai.service.js` correcto.
- ZIP comprobado.
