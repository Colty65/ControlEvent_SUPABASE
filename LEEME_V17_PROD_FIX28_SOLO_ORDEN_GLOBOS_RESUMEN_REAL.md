# ControlEvent v17_prod_FIX28 - Solo ordenación real de globos de Resumen

Base: `CE_v17_PROD_FIX27_WELCOME_INFO_GENERAL.zip`.

## Alcance cerrado

Solo se toca la ordenación/visualización de los globos del **Resumen Presupuestario**:

- DONACION DE PRODUCTO.
- OPERATIVA.

No se toca:

- GRAFICAS.
- Saldo actual / saldo operativo.
- Carga de eventos.
- Refrescos.
- Login.
- ColtyLAB salvo etiqueta de versión visible.
- Fotos, compras, ingresos, IA, Supabase ni permisos.

## Cambio técnico importante

El módulo `budget-tooltips-lite.js` se carga ahora al final del `index.html`, después de los parches legacy que volvían a meter atributos `data-ce-tip-*` y desordenaban las filas.

Además, el módulo elimina/bloquea esos atributos legacy solo dentro de `#budgetLayout` para los paneles de Resumen y fuerza el globo ligero ordenado.

## Orden aplicado

### DONACION DE PRODUCTO

- En el total `Valor producto donado`, el globo se ordena por bloques fijos:
  1. TIENDAS
  2. SOCIOS
  3. NO SOCIOS

- Dentro de cada bloque:
  - Agrupa por donante.
  - Muestra las líneas del donante.
  - Pone `Total <donante>` justo debajo de sus líneas.

### OPERATIVA

- En `GASTOS PREVISTOS`, el globo se ordena por bloques:
  1. GASTOS REALIZADOS
  2. GASTOS DE ORGANIZACION
  3. PTE.COMPRA U OTROS GASTOS

- En `GASTOS REALIZADOS`, el globo se ordena por:
  1. GASTOS POR TICKET
  2. GASTOS DE ORGANIZACION

- En `PTE.COMPRA U OTROS GASTOS`, agrupa por tienda/ticket con el total debajo de cada grupo.

## Archivos modificados

- `public/app/features/budget-tooltips-lite.js`
- `app/features/budget-tooltips-lite.js`
- `public/index.html`
- `index.html`
- `public/app/features/v17-fix27-welcome-info-general.js` solo etiqueta `v17_prod_FIX28`
- `app/features/v17-fix27-welcome-info-general.js` solo etiqueta `v17_prod_FIX28`

## Validación

- `node --check public/app/features/budget-tooltips-lite.js`
- `node --check budget-tooltips-lite.js`
- `node --check public/app/features/v17-fix27-welcome-info-general.js`
