# ControlEvent v20_prod FIX8

Cambios aplicados sobre FIX7:

- Vista aérea: el botón **Ver todo** de PRODUCTO DISPONIBLE mantiene todos los registros y, en iPad/móviles, desplaza automáticamente a la cabecera/listado de registros. En PC no fuerza desplazamiento.
- Ingresos: lectura robusta del control visible al modificar un ingreso para evitar tener que guardar dos veces cuando quedan controles duplicados u ocultos con el mismo `data-id`.
- Ingresos pendientes: los botones **Modificar** y **Eliminar** mantienen letra blanca aunque la fila esté pintada en rojo.

No se han tocado otros módulos ni la lógica de modificación de compras/donaciones/eventos.
