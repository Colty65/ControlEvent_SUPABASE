# ControlEvent v27_prod_1.4 · Zuzu — datos generales y compras con detalle

## Objetivo

Esta versión corrige una limitación de orquestación detectada en Zuzu: algunos datos ya existentes en ControlEvent no estaban accesibles a través del conjunto de herramientas de Gemini Interactions, por lo que Zuzu podía afirmar erróneamente que no podía entregar catálogos generales o el detalle producto a producto de las compras.

La regla de esta versión es sencilla: **si el dato existe en ControlEvent, es de lectura y no pertenece a un ámbito restringido, Zuzu debe intentar obtenerlo con la herramienta adecuada antes de declarar que no está disponible.**

La información de **ACCESO / usuarios / credenciales** queda expresamente fuera de los catálogos consultables.

## Cambios principales

### 1. Nueva herramienta `master_catalog`

Expone en solo lectura los catálogos maestros de negocio:

- PRODUCTOS
- TIENDAS
- PERSONAS
- EVENTOS

No admite `users`, `access`, contraseñas, tokens ni credenciales.

Para PRODUCTOS devuelve los datos maestros disponibles (producto, segmento, destino, precio de referencia y tienda de referencia). En modo `full` también puede conservar metadatos técnicos no sensibles disponibles en el estado, como fechas de creación/actualización.

### 2. Catálogo completo + compras de un evento

`master_catalog(entity=products)` puede superponer las compras de un evento **sin reducir el catálogo a los productos comprados**.

Así, una consulta del tipo «lista general de productos y, al lado, si procede, unidades/precio/importe comprado en el evento» conserva todas las filas del catálogo y añade:

- unidades compradas en el evento,
- precio o precios registrados,
- importe comprado,
- número de registros,
- tienda o tiendas de compra.

Los productos no comprados siguen apareciendo con métricas de compra a cero/vacías.

### 3. Nueva herramienta `event_purchase_lines`

Entrega el detalle real de `ce_compras` producto a producto, sin depender del agregado de `store_purchases` ni del Top de `event_breakdowns`.

Cada línea puede incluir:

- producto,
- segmento,
- destino,
- unidades,
- precio unitario registrado,
- importe,
- TKxx / otros gastos,
- tienda,
- responsable,
- donante cuando proceda,
- tipo de línea.

Además devuelve una tabla agrupada por producto que conserva todos los precios unitarios distintos encontrados.

En modo `full` puede incluir identificadores y fechas técnicas no sensibles de la propia línea de compra.

### 4. Separación entre herramientas agregadas y detalle

- `event_breakdowns` sigue siendo útil para resúmenes/agregados.
- `store_purchases` sigue siendo útil para totales por tienda/evento.
- Ninguna de ellas puede utilizarse ya como argumento para afirmar que «ControlEvent no dispone del detalle producto a producto».
- Cuando la pregunta exige unidades/precio/importe/ticket/tienda/responsable por producto, la fuente correcta es `event_purchase_lines`.

### 5. Garantía de cobertura antes de responder

Si la intención exige un catálogo maestro o detalle de compras y Gemini intenta finalizar sin haber solicitado la fuente correspondiente, ControlEvent fuerza otra ronda de herramientas.

También se audita la redacción final: si ya se ha obtenido el catálogo o el detalle y Gemini intenta afirmar que no existe herramienta o que no puede proporcionar esa información, la respuesta se devuelve a revisión.

### 6. Presentación exhaustiva

Los resultados de `master_catalog` y `event_purchase_lines` no se recortan al límite normal de tablas de resumen. Cuando se solicitan, ControlEvent materializa **todas las filas obtenidas** en la tabla/CSV correspondiente.

Además, si Gemini obtiene correctamente esos datos pero olvida incluir la referencia de tabla en su JSON final, ControlEvent la incorpora de forma determinista a la presentación.

### 7. Estado conserva metadatos no sensibles

Los mapeadores de Supabase conservan ahora `created_at` / `updated_at` en EVENTOS, PERSONAS, TIENDAS, PRODUCTOS y COMPRAS para que puedan utilizarse cuando se solicite detalle completo. No se cambia el modelo de escritura ni se exponen datos de `ce_users`.

## No hardcode

No se han introducido nombres de eventos, personas, tiendas, productos, importes, fechas de negocio o TKxx concretos en la lógica de producción.

El enrutado usa conceptos genéricos (catálogo, productos, compras, unidades, precio, etc.), metadatos de herramientas y los datos reales cargados desde ControlEvent.

## Pruebas

Se mantienen las baterías anteriores y se añade `scripts/test-v27-prod-1-4-zuzu-data-access.cjs`.

Resultados de regresión:

- v27.1.2: 16/16
- v27.1.3: 11/11
- v27.1.4: 13/13
- Total: **40/40 pruebas**

La batería v1.4 comprueba, entre otros puntos:

- catálogo general de productos,
- separación entre «todos los productos comprados» y «todos los productos del catálogo»,
- catálogo + métricas de compra de un evento,
- catálogos de tiendas/personas/eventos,
- exclusión de acceso/credenciales,
- conservación de productos no comprados en el catálogo,
- líneas reales de compra con unidades/precio/importe/ticket/tienda/responsable,
- filtro de detalle por tienda,
- materialización completa de tablas,
- obligación de ejecutar las fuentes canónicas,
- ausencia de hardcode de casos concretos en el bloque nuevo.
