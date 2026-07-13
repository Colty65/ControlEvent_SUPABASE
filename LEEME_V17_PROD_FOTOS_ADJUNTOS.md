# ControlEvent v20_prod

Base: CE_v16_PROD_OPT2J_GRAFICAS_SIN_SEGUNDO_REFRESCO.zip

Cambios principales:

- Version visible, interna, cache-busters, BACKUP e INFOEVENTO actualizados a `v20_prod`.
- Correccion del mantenimiento de fotos en INGRESOS, RESUMEN PRESUPUESTARIO y DOCUMENTOS DEL EVENTO.
- DELETE de `/api/ticket-images` usa ahora el mismo scope explicito que POST, evitando borrados locales que luego reaparecian desde servidor.
- Cada subida de foto genera una ruta nueva en Supabase Storage y URL con cache-buster, para que no vuelva la imagen antigua tras reemplazar.
- Al reemplazar imagen se limpian rutas antiguas de Storage y alias viejos de `ce_ticket_images`.
- Los flujos de adjuntar/reemplazar limpian referencias locales antiguas y resetean el input de archivo.

Validacion realizada:

- `node --check` en backend de imagenes, rutas, guard de escrituras, Ingresos, Documentos, bundles legacy y modulo Excel BACKUP.
