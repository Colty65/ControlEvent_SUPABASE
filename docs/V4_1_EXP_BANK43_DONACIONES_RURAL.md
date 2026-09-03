# ControlEvent v4_1_exp · BANK4.3

Correcciones sobre BANK4.2 tras prueba real del 27/08/2026.

- Donaciones: la edición de `Supuesta / Comprometida / Entregada` ya no depende de que exista la RPC `ce_crud_donacion_situacion` en la caché de esquema de Supabase. El backend valida la fila, comprueba que el evento no esté Finalizado y actualiza únicamente `ce_compras.donacion_situacion`.
- Mapa de recursos: `Marcar entregada` conserva el endpoint persistente y añade un fallback directo de activación para evitar que manejadores heredados neutralicen el botón.
- Responsables: el nombre del evento deja de truncarse; la zona de título recibe más ancho y puede ocupar el texto necesario.
- Cuadre Banco: se sustituye el icono genérico de banco por la imagen Eurocaja Rural tanto en la cabecera del Cuadre como en su acceso lateral y móvil.
- SQL incluido: regulariza Finalizados como `Entregada`, En curso como `Comprometida` y desactiva los triggers de usuario solo durante la migración histórica, reactivándolos dentro de la misma transacción.
