# ControlEvent v16_prod - OPT3Q Rescate fotos TKxx mínimo

Base usada: OPT3J estable.

Cambios incluidos:

- Se retira la línea de parches OPT3K/3M/3N/3O/3P del frontal.
- Se carga el núcleo de Resumen (`v16-opt3f`) también desde `public/index.html`, no solo desde `index.html`.
- Se añade un puente mínimo `v16-opt3q-resumen-fotos-minimo.js` que no repinta filas ni crea botones.
- `uploadTicketImage` y `removeTicketImage` usan `/api/ticket-images` con cabecera válida.
- El backend elimina/sustituye por clave exacta y por TKxx dentro del evento.
- Tras eliminar o subir foto se recarga la lista de imágenes desde servidor y se repinta Resumen una sola vez.
- El botón Cerrar de visor se fuerza abajo a la derecha.

No toca login, selector, `/api/state`, gráficas, compras, ingresos, donaciones, documentos, planificación ni AVANCE.
