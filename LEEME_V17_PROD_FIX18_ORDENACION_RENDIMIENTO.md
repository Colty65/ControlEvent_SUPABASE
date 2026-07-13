# ControlEvent v21_prod - FIX18 ORDENACIÓN Y RENDIMIENTO

Base exacta utilizada: `CE_v17_PROD_FIX13_TITULO_EVENTO_COLOR_ESTADO.zip`.

## Cambios funcionales

### GRAFICAS - Donación de producto
- Orden por donante y después producto A-Z.
- Totalización inmediata al finalizar cada donante:
  - `Total <donante> ... importe`

### GRAFICAS - Gastos
- Orden por tienda, después TKxx y después producto A-Z.
- Totalización inmediata al finalizar cada ticket:
  - `Total <tienda>, <TKxx> ... importe`
- Totalización inmediata al finalizar cada tienda:
  - `Total <tienda> ... importe`

### Saldo actual / Saldo operativo
- Ingresos se mantienen como estaban.
- Gastos usan la misma agrupación y ordenación que GRAFICAS - Gastos.

### Valoración del evento
- Bloque superior: donaciones agrupadas como Donación de producto.
- Bloque inferior: gastos/compras agrupadas como Gastos.

## Rendimiento
- Reducción de repintados programados al entrar en GRAFICAS.
- Reducción de reintentos del hardlock que evita que aparezcan gráficas antiguas de barras.
- Reducción de rehidrataciones de los globos de RESUMEN.
- Reducción de intervalos legacy que seguían tocando globos de donaciones.
- Aislamiento del textarea de Zuzu para que las pulsaciones en iPad/iPhone/Android no disparen manejadores globales de la app por cada letra.

## Archivos tocados
- `public/app/features/v46-4-final-fixes.js`
- `public/app/features/budget-tooltips-lite.js`
- `budget-tooltips-lite.js`
- `public/app/features/v11-3-zuzu-analitica-libre.js`
- `public/app/features/v50-19-final-fixes.js`
- `public/app/features/v16-opt2h-graficas-v46-hardlock.js`
- `public/app/legacy/legacy-bundle-before-modules-v30.7.js`
- `public/app/legacy/legacy-bundle-after-modules-v30.7.js`
- `public/index.html`
- `index.html`

Se mantiene la versión visible como `v21_prod`.
