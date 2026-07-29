# ControlEvent v25_prod · FIX1 Conciliación y BACKUP total

Esta revisión mantiene la versión visible `v25_prod` y aplica las correcciones solicitadas el 29/07/2026.

## Avance del evento

Se incorpora la línea **CONCILIACIÓN BANCARIA**, calculada con los TKxx contables del evento:

- Verde: 100 % conciliados.
- Naranja: al menos el 50 %, pero no todos.
- Rojo: menos del 50 %.
- Los TKxx aceptados mediante cuadre forzado cuentan como conciliados.

## Zuzu

Zuzu recibe contexto de:

- `ce_hitos`
- `ce_lg`
- `ce_bank_import_batches`
- `ce_bank_movements`
- `ce_bank_ticket_links`
- `ce_bank_event_settings`
- `ce_bank_event_movement_state`

La conciliación bancaria se incorpora tanto en preguntas específicas como en informes generales del evento.

## INFOEVENTO

La hoja `CUADRE BANCO`:

- Exporta únicamente movimientos marcados **En saldo**.
- Trata `CUADRADO_FORZADO` como **Justificado**.
- Muestra los abonos incluidos como **Movimiento positivo conciliado**.

## BACKUP y restauración

El BACKUP de servidor incluye hojas restaurables separadas para:

- `ACCESOS`
- `META_BBDD`
- `EVENTOS`, `PERSONAS`, `TIENDAS`, `PRODUCTOS`, `INGRESOS`, compras, documentos e imágenes
- `HITOS`
- `LG`
- `BANCO_IMPORTACIONES`
- `BANCO_MVTOS`
- `BANCO_TK_LINKS`
- `BANCO_PERIODOS`
- `BANCO_ESTADO_MVTO`

La restauración integral exige un fichero `BACKUP_TODOS` y un usuario GD. Esta protección evita sustituir accidentalmente toda la base con la copia parcial de un único evento. Se restaura el núcleo y después las tablas de acceso, metadatos, imágenes, hitos, LG y conciliación bancaria.

## Cuadre Banco y GRAFICAS

- El aspa de Cuadre Banco dispone de un cierre reforzado por ratón, puntero y pantalla táctil.
- En eventos **Finalizados** solo aparecen movimientos **En saldo** y toda la ventana permanece en lectura.
- En eventos **En curso** se muestran todos los movimientos del período y permanece disponible `Cargar CSV` para GD/RW.
- Los globos pulsados en GRAFICAS quedan fijados hasta cerrar con su X, pulsar Escape o elegir otro dato.

## Instalación

No requiere SQL nuevo respecto a las tablas bancarias e Hitos/LG ya instaladas. Desplegar todo el contenido del ZIP y hacer una recarga completa con `Ctrl + F5`.
