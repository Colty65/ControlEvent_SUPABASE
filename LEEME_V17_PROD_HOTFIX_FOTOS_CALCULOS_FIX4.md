# ControlEvent v17_prod - HOTFIX fotos Cálculos FIX4

Versión visible sin cambios: **v17_prod**.

Cambios acotados:

1. Partiendo de FIX2, se sustituye el parche de fotos de "Cálculos por tienda y ticket" por un flujo estable tipo Documentos/Ingresos:
   - input de archivo efímero;
   - un solo clip y una sola papelera por fila;
   - sin renderBudget tras adjuntar/eliminar;
   - sin refrescos globales de la ventana;
   - sincronización de todas las copias de estado (`state`, `window.state`, `ControlEventApp.state`) para que no reaparezca una URL vieja.

2. Backend `/api/ticket-images`:
   - al eliminar o sustituir una foto de un TKxx, borra también alias antiguos del mismo TKxx dentro del mismo evento;
   - elimina los `storage_path` asociados para que no sobreviva la imagen anterior en el alojamiento.

3. Logo CE inicial:
   - estilo fijo desde cabecera;
   - sin ficha, sin texto, tamaño medio;
   - al seleccionar evento se oculta antes de entrar en GRAFICAS.
