# ControlEvent v28.0_prod

Versión generada desde `CE_V27_PROD_1_5_CANDIDATA_ESTABLE_GLOBOS_ZUZU.zip`.

## 1. Gráficas del evento: detalle completo de tickets

Se corrige el detalle abierto desde las barras de **Por destino**.

Antes, al pulsar una barra como `CUBATAS / COMPRADO`, el globo reconstruía el ticket usando solo las líneas cuyo `Destino` era CUBATAS. Si un mismo TKxx contenía además productos de COMIDA, APERITIVO u otro destino, esas líneas desaparecían del globo y el supuesto `Total TIENDA, TKxx` era en realidad un subtotal parcial.

En v28.0_prod:

- el importe de la barra sigue siendo exclusivamente el importe imputado al destino pulsado;
- para cada compra realizada se obtienen los TKxx/otros gastos que contribuyen a esa barra;
- cada uno de esos tickets se expande con **todas sus líneas registradas en el evento**, aunque alguna pertenezca a otro destino;
- el detalle incluye una columna `Destino` para explicar por qué el total del ticket completo puede ser mayor que el importe de la barra;
- el total por TKxx se calcula sobre el ticket completo mostrado;
- la lógica es genérica para cualquier destino, tienda, ticket y evento. No hay nombres ni importes de negocio hardcodeados.

Las donaciones y pendientes conservan su ámbito de destino, ya que no existe una identidad de factura equivalente que deba expandirse entre destinos.

## 2. Versión única

La identidad de aplicación pasa a ser exactamente:

- etiqueta: `v28.0_prod`
- texto: `ControlEvent v28.0_prod`
- prefijo de fichero: `ControlEvent_v28.0_prod`
- ZIP: `ControlEvent_v28.0_prod.zip`

Se ha actualizado la versión en:

- interfaz y título del navegador;
- `public/app/version.js`;
- trazas y hardlocks de versión;
- módulos y bundles legacy activos;
- INFOEVENTO, incluido nombre externo y metadatos internos del XLSX;
- BACKUP, incluido nombre externo, cabeceras, metadatos internos del XLSX y endpoint de servidor;
- hojas Excel auxiliares;
- servidor y rutas de exportación;
- package metadata.

Se añade un hardlock final que normaliza cualquier nombre de descarga INFOEVENTO/BACKUP heredado antes de ejecutar el `click` del navegador.

## 3. Zuzu: gráficos y banco

Se corrigen tres problemas detectados en las pruebas v27_prod_1.5:

1. Una petición de **toda la información gráfica** obliga ahora a obtener, como mínimo, `event_dossier` + `event_bank`. La respuesta puede presentar economía, asistencia, gestión y banco en el mismo informe.
2. La tabla mixta `kpis` ya no es graficable como si todo fueran euros. Se evita convertir estados, fechas o personas en barras monetarias. Para gráficos se usan las tablas tipadas `economics_chart`, `attendance_chart` y `management_chart`.
3. `event_bank` incorpora `event_window_timeline`: movimientos filtrados determinísticamente entre la fecha de inicio y fin del evento. Si el usuario pide explícitamente movimientos **entre las fechas del evento**, esa es la serie obligatoria. Si no hay movimientos, Zuzu debe decirlo; no puede sustituirla por el histórico general.

Además, el prompt de Dirección impide convertir lenguaje elogioso en hechos inexistentes: no se permite afirmar que se han “superado expectativas” ni asignar rendimiento excelente sin objetivo/benchmark canónico.

## 4. Pruebas

Se incorpora `scripts/test-v28-0-prod.cjs` y `npm run test:v28.0`.

Resultado de esta compilación:

- 8/8 pruebas específicas v28.0_prod: OK.
- 353 ficheros JavaScript de `public/app`, `public/modules`, `services`, `routes` y `server`: sintaxis OK con `node --check`.
- No quedan referencias activas de branding `v27_prod_1.1`, `v27_prod_1.4` o `v27_prod_1.5` dentro de `public`, salvo los prefijos históricos de migración de almacenamiento en `public/app/version.js`.

El servidor no se arrancó en el contenedor de construcción porque el ZIP no incluye `node_modules`; no se instalaron dependencias para no alterar el paquete de producción.
