# ControlEvent v16_prod - OPT3M Resumen fotos y cierre

Base: v16_opt_3L rebase desde OPT3J.

No cambia la versión visible: `v16_prod`.

## Alcance

Solo toca acciones de usuario dentro de Resumen presupuestario / Cálculos por tienda y ticket:

- Adjuntar/sustituir foto de TKxx.
- Eliminar foto de TKxx.
- Posición del botón Cerrar en visor de foto ampliada.

No toca login, selector de evento, `/api/state`, planificación, compras, ingresos, donaciones, documentos, gráficas ni Avance.

## Cambios

1. Se instala `v16-opt3m-resumen-fotos-cierre.js` después de OPT3G.
2. `removeTicketImage` usa `/api/ticket-images` con cabecera de escritura válida `X-ControlEvent-Write-Scope: ticket-image-v8-5-fix26`.
3. El borrado limpia también cachés locales de `ticketImages`, `ticketImageRefs`, `ticketImagesByKey`, `ticket_images` y `ce_ticket_images` para que la miniatura antigua no vuelva tras el render.
4. Adjuntar/sustituir foto hace sustitución real: limpia claves antiguas de ese TK y sube una única foto nueva.
5. El visor de tickets fuerza el botón Cerrar abajo a la derecha.

## Prueba recomendada

1. Evento en curso.
2. Resumen presupuestario → Cálculos por tienda y ticket.
3. En un TK con foto, pulsar papelera: debe desaparecer la miniatura.
4. Adjuntar una foto nueva: debe verse la nueva, no la antigua.
5. Pinchar miniatura: el botón Cerrar debe quedar abajo a la derecha.
