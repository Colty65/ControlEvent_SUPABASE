# ControlEvent v25_prod

Base de trabajo: `CE_V24_PROD_05_CUADRE_BANCO_FLUIDEZ_CSV.zip`.

## Cuadre Banco: diseño compacto

- Se reduce la altura del bloque superior para dar más espacio a la cronología bancaria.
- Cabecera, controles, periodo, indicadores, aviso, leyenda y paginación se recolocan y compactan.
- Los movimientos de abono ocupan aproximadamente una sola línea compacta; se elimina su bloque inferior redundante.
- Los movimientos de cargo mantienen la trazabilidad, TKxx, porcentaje y acciones, pero en una franja horizontal mucho más estrecha.
- Las fichas de cargo quedan aproximadamente en la mitad de la altura anterior y los TKxx se muestran en una línea con desplazamiento horizontal cuando sea necesario.
- Se mantiene el diseño adaptado anterior para pantallas móviles; la máxima compactación se aplica en escritorio.

## Versión unificada

La versión de producto pasa a:

- Visible: `v25_prod`
- Texto completo: `ControlEvent v25_prod`
- Nombre para ficheros: `ControlEvent_v25_prod`
- Paquete: `CE_V25_PROD.zip`
- Build: `20260729-V25-PROD-COMPACT-BANK`

Se han actualizado la cabecera principal, fichas ColtyLAB, ventana de Cuadre Banco, trazas activas, API de versión, service worker, INFOEVENTO, BACKUP cliente y servidor, nombres de descarga, metadatos de Excel y copias `app/public`.

## Despliegue

1. Sustituir el contenido del repositorio por el contenido completo del ZIP.
2. Desplegar en Vercel.
3. Hacer una recarga completa con `Ctrl + F5` la primera vez.

No hay cambios SQL respecto de v24_prod-05. Si el SQL de v24_prod-04 ya estaba ejecutado, no hay que volver a ejecutar nada en Supabase.

## Comprobaciones realizadas

- Sintaxis de los ficheros JavaScript activos.
- Espejos `app/public` de Cuadre Banco y versión.
- Pruebas de periodo bancario, cargos, abonos, desvinculación, exclusión por evento y saldos.
- Prueba de interfaz con 5.000 movimientos paginados.
- Prueba de CSV con 2.500 movimientos desde enero de 2024.
- Auditoría estática de versión en cabeceras, Cuadre Banco, INFOEVENTO y BACKUP.
