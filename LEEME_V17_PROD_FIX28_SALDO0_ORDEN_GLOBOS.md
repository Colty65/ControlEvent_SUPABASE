# ControlEvent v17_prod FIX28 - Saldo 0 y orden de globos

Base: `CE_v17_PROD_FIX27_WELCOME_INFO_GENERAL.zip`

## Cambios aplicados

1. **GRAFICAS - SALDO ACTUAL y SALDO OPERATIVO**
   - Aunque el saldo sea `0,00 €`, la ficha ya no queda como `Sin datos`.
   - Se mantiene el detalle clicable con los registros que justifican el saldo:
     - ingresos realizados / incluidos;
     - gastos realizados / incluidos;
     - fórmula del saldo.
   - **DONACIÓN DE PRODUCTO** conserva el comportamiento anterior: si no hay donaciones, se muestra vacío/sin datos.

2. **Orden de globos de DONACION DE PRODUCTO y OPERATIVA**
   - Se evita que el HOTFIX49 vuelva a ordenar internamente las tablas por producto.
   - Se conserva el orden agrupado que genera cada globo:
     - donaciones por donante y producto;
     - operativa por tienda, ticket y producto;
     - totales inmediatamente debajo de su grupo.
   - Evita que aparezcan totales de una tienda/socio/no-socio mezclados con registros de otro grupo.

3. **Ficha ColtyLAB de bienvenida**
   - El pie de la ficha pasa a mostrar `v17_prod_FIX28`.

## No tocado

- No se cambian permisos.
- No se cambian fotos ni adjuntos.
- No se cambia la doble pulsación móvil del Resumen Presupuestario.
- No se cambia la pantalla de bienvenida con el logo Peña El Arrastre.
