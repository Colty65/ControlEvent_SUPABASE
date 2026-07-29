# ControlEvent v25_prod

## Objetivo de esta versión

Esta versión toma como base `v24_prod-05` y mejora la superficie útil de la ventana **Cuadre Banco**. También elimina la dispersión de etiquetas de versión que seguían mostrando `v24_prod-02`, `v24_prod-r2` o `v24_prod-05` en distintos puntos de la aplicación.

## Cuadre Banco más compacto

- Cabecera reducida de 112 px a aproximadamente 82 px en escritorio.
- Botones, desplegables, buscador y campos de fecha más bajos.
- Tarjetas de saldo inicial, saldo final, entradas/salidas y saldo certificado compactadas.
- Avisos y paginación ocupan menos altura.
- En escritorio ancho, los datos del movimiento y su conciliación se presentan en paralelo.
- Los abonos quedan en fichas de unos 56 px de alto.
- Las compras con una conciliación normal ocupan aproximadamente la mitad que en v24_prod-05.
- Los movimientos con muchos TKxx mantienen todos los datos y disponen de desplazamiento interno en la zona de tickets para no hacer crecer excesivamente la ficha.
- Se conservan búsqueda, desplegables, CSV, paginación, orden temporal, saldo por evento, exclusión de movimientos y cuadre forzado.

## Versión única v25_prod

La versión se ha unificado en:

- Título del navegador y cabecera principal.
- Ficha inicial de ColtyLAB y resto de fichas ColtyLAB.
- Ventana Cuadre Banco.
- Variables globales de versión del cliente.
- Respuesta `/api/version` del servidor.
- INFOEVENTO: nombre externo, propiedades internas del libro, texto de emisión y hoja de versión.
- BACKUP: nombre externo, propiedades internas del libro, cabeceras HTTP y hoja de control.
- Descarga general de datos.
- Informes PDF de Zuzu.
- Service Worker y metadatos de compilación.

Identificadores de la entrega:

- Versión visible: `v25_prod`
- Versión completa: `ControlEvent v25_prod`
- Versión para ficheros: `ControlEvent_v25_prod`
- Build: `20260729-V25-PROD-COMPACT-BANK`
- ZIP: `CE_V25_PROD_CUADRE_BANCO_COMPACTO.zip`

## Compatibilidad de sesión

La aplicación adopta la nueva clave ligera de sesión de v25, pero conserva lectura y migración automática de la sesión creada por `v24_prod-02`. El cambio de versión no debe obligar a perder el usuario recordado por esa causa.

## Base de datos

No hay cambios de estructura respecto a v24_prod-05. Si ya se ejecutó el SQL de v24_prod-04/v24_prod-05, no hay que ejecutar un SQL nuevo.

## Comprobaciones

- Pruebas de período bancario, abonos/cargos, saldo inicial/final y exclusión por evento.
- Prueba de desvinculación de TKxx sin desaparición del movimiento.
- Prueba de interfaz con 5.000 movimientos paginados.
- Prueba de CSV con 2.500 movimientos desde enero de 2024.
- Comprobación de sintaxis JavaScript de los módulos modificados.
- Análisis CSS sin errores de parseo.
- Comprobación de igualdad entre copias `app` y `public` de Cuadre Banco, versión e `index.html`.
- Verificación automática de versión en cabecera, ColtyLAB, INFOEVENTO y BACKUP.
