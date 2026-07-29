# ControlEvent v24_prod-04 · Cuadre Banco por periodo y saldo de evento

## Objetivo funcional

Cada evento dispone ahora de su propio **periodo bancario**, su propia selección de movimientos incluidos y un cálculo independiente del saldo con el que comenzó y terminó. El saldo certificado por el banco continúa siendo global y se mantiene separado del saldo calculado del evento.

## Cambios realizados

- Se incorporan dos campos editables:
  - **Fecha inicio bancaria**.
  - **Fecha final bancaria**.
- Las fechas son inclusivas y quedan guardadas por evento.
- Dentro del periodo se muestran **todos los movimientos bancarios**, tanto cargos como abonos.
- Al desvincular un TKxx, el movimiento no desaparece: continúa visible mientras esté comprendido entre las fechas bancarias guardadas. Si el filtro o la búsqueda lo ocultasen después de una operación, la ventana vuelve automáticamente a «Todos los movimientos» y al registro mantenido.
- El periodo inicial se crea automáticamente con las fechas del evento, ampliándolas para no dejar fuera movimientos que ya tuvieran TKxx vinculados.
- Orden predeterminado: **más reciente → más antiguo**.
- Selector adicional para ordenar **más antiguo → más reciente**.
- Los TKxx que se pueden asociar continúan limitados exclusivamente al evento activo.
- La opción **En saldo / Inactivo** pasa a ser específica de cada evento.
  - Un movimiento inactivo sigue visible.
  - No participa en el saldo final del evento.
  - No afecta al cálculo de otros eventos.
- Cada movimiento presenta:
  - importe del cargo o abono;
  - saldo real dejado por el banco;
  - saldo calculado del evento después de ese movimiento.
- El cálculo siempre se realiza cronológicamente, aunque la pantalla esté ordenada de más reciente a más antiguo.

## Cálculo de saldos

- **Saldo bancario inicial del evento**: saldo existente inmediatamente antes del movimiento más antiguo del periodo.
  - Fórmula: saldo posterior del movimiento menos su importe.
  - En un cargo, al ser el importe negativo, se recupera el saldo anterior sumando su valor absoluto.
- **Saldo final calculado del evento**: saldo inicial más todos los cargos y abonos que estén marcados **En saldo**.
- **Variación del evento**: saldo final menos saldo inicial.
- **Saldo real al final del periodo**: saldo bancario informado por el movimiento más reciente dentro del periodo.
- **Saldo certificado por el banco**: permanece global y corresponde al último movimiento cargado de la cuenta, con independencia del evento.

## Eventos Finalizados

La ventana continúa disponible en modo de consulta. En eventos Finalizados se pueden buscar, ordenar, filtrar y revisar datos, pero no se pueden cambiar fechas, incluir/excluir movimientos, importar CSV, asociar TKxx ni forzar cuadre.

## Actualización obligatoria de Supabase

Ejecutar completo en **Supabase > SQL Editor**:

`ControlEvent_SQL_V24_PROD_CUADRE_BANCO.sql`

Además de conservar las tablas anteriores, crea:

- `ce_bank_event_settings`: guarda la fecha inicial y final bancaria de cada evento.
- `ce_bank_event_movement_state`: guarda si cada movimiento participa o no en el saldo de un evento concreto.

El script es seguro para instalaciones que ya tengan v24_prod-02 o v24_prod-03.

## Archivos principales modificados

- `app/features/v24-cuadre-banco.js`
- `public/app/features/v24-cuadre-banco.js`
- `app/styles/cuadre-banco.css`
- `public/app/styles/cuadre-banco.css`
- `services/bank-reconciliation.service.js`
- `routes/bank-reconciliation.routes.js`
- `ControlEvent_SQL_V24_PROD_CUADRE_BANCO.sql`
- `scripts/test-bank-reconciliation-v24-4.js`
- `index.html`
- `public/index.html`
- `package.json`
- `package-lock.json`

## Comprobaciones realizadas

- Sintaxis JavaScript validada con `node --check`.
- Pruebas de regresión e integración del cálculo bancario mediante `npm run test:bank`.
- Verificación de:
  - fechas inclusivas;
  - ampliación inicial para movimientos ya vinculados;
  - cargos y abonos;
  - saldo inicial;
  - saldo final;
  - movimientos inactivos sin impacto en el saldo;
  - saldo cronológico por fila;
  - validación de fechas invertidas;
  - persistencia del movimiento después de desvincular su último TKxx;
  - separación entre inclusión global heredada e inclusión propia de cada evento;
  - mantenimiento del saldo certificado global fuera del periodo del evento.
