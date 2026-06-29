# ControlEvent v16_prod OPT3N - Resumen fotos TKxx robusto

Base: v16_opt_3L / OPT3J, no OPT3K ni OPT3M.

Mantiene version visible: v16_prod.

Alcance:
- Resumen presupuestario > Calculos por tienda y ticket.
- Gestion de fotos de TKxx: eliminar, adjuntar/sustituir y visor ampliado.

Cambios:
1. Eliminacion real de fotos TKxx:
   - El servidor elimina todas las variantes de clave del mismo TKxx dentro del evento.
   - No se limita a una clave exacta que podia no coincidir.

2. Sustitucion real:
   - Antes de subir una nueva foto de TKxx, el servidor elimina las anteriores del mismo TKxx.
   - Evita miniaturas repetidas y fotos antiguas que reaparecen.

3. Cache navegador/IndexedDB:
   - El cliente limpia state.ticketImages, ticketImageRefs y IndexedDB local para ese TKxx.
   - Las URLs de imagen incorporan marca de cache para no volver a mostrar la foto anterior por cache del navegador.

4. Interceptacion directa:
   - Las acciones de papelera/adjuntar en Resumen se interceptan antes que las capas antiguas.
   - No hay intervalos nuevos ni renders globales.

5. Visor ampliado:
   - Fuerza el boton Cerrar abajo a la derecha en los visores de foto de ticket.

No toca:
- Login.
- Selector de eventos.
- /api/state.
- Graficas.
- Compras, ingresos, donaciones, documentos, planificacion ni AVANCE.

Prueba recomendada:
1. Usar evento En curso.
2. Resumen presupuestario > Calculos por tienda y ticket.
3. Elegir un TKxx con foto.
4. Papelera: debe quedar Sin imagen y no volver tras cambiar de evento.
5. Adjuntar nueva foto: debe aparecer una sola miniatura.
6. Abrir miniatura: debe mostrar la nueva foto, no la antigua.
