# ControlEvent v19_prod - FIX7 detalle Cálculos sin botón (i)

Base: FIX6_VISOR, sin cambiar versión visible.

Cambios acotados:

- Mantiene el mantenimiento de fotos de Cálculos por tienda y ticket que ya funcionaba en FIX6.
- Elimina el icono/botoncito azul `(i)` en las filas de Cálculos por tienda y ticket.
- Recupera la apertura del detalle de filas para todos los tipos:
  - TKxx con foto o sin foto.
  - Pte. Compra u otros gastos.
  - Donado socios/no socios/otros.
- El detalle se abre al pulsar la fila, no depende del icono `(i)` ni de la foto.
- No llama a `renderBudget()` al adjuntar/eliminar fotos.
- No cambia la versión visible: sigue v19_prod.
