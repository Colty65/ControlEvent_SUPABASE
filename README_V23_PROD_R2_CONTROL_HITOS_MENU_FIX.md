# ControlEvent v23_prod_r2 · FIX de acceso a Control de Hitos

Corrección del icono del menú que aparecía visible pero no abría la ventana.

## Cambios

- Enlace directo y delegado del botón `btnOpenHitos`.
- Fallback mediante `window.ceOpenControlHitos`.
- Reconexión automática si algún render sustituye o bloquea el botón.
- El botón queda disponible también para consulta en eventos finalizados.
- Se incorpora el botón a las reglas de tamaño y puntero del menú lateral.
- Se fuerza una carga sin caché mediante un identificador de build nuevo.

No modifica el SQL ni la estructura de `ce_hitos` y `ce_lg`.
