# ControlEvent v17_prod FIX28 — SOLO ordenación de globos de Resumen

Base: `CE_v17_PROD_FIX27_WELCOME_INFO_GENERAL.zip`.

Cambios aplicados únicamente en `public/app/features/budget-tooltips-lite.js`:

1. RESUMEN PRESUPUESTARIO / DONACION DE PRODUCTO
   - El globo TOTAL se ordena por bloques:
     - TIENDAS
     - SOCIOS
     - NO SOCIOS
   - Dentro de cada bloque, las líneas se agrupan por donante y producto.
   - El total de cada donante queda justo debajo de sus líneas.

2. RESUMEN PRESUPUESTARIO / OPERATIVA
   - El globo de GASTOS PREVISTOS se ordena por bloques:
     - GASTOS REALIZADOS
     - GASTOS DE ORGANIZACION
     - PTE.COMPRA U OTROS GASTOS
   - El globo de GASTOS REALIZADOS separa:
     - GASTOS POR TICKET
     - GASTOS DE ORGANIZACION
   - PTE.COMPRA reconoce tanto ticket vacío como textos tipo PTE.COMPRA / pendiente / otros gastos.

No se ha tocado `graficas.js` ni la lógica de GRAFICAS.
No se ha tocado la carga de eventos ni el render de GRAFICAS.
No se ha aplicado el cambio de SALDO ACTUAL / SALDO OPERATIVO.

Se actualiza solo la marca `?v=` del JS de globos para evitar caché vieja del navegador.
