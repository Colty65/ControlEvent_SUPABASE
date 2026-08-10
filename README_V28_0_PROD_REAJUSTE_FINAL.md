# ControlEvent v28.0_prod — reajuste final de Zuzu

Esta revisión mantiene **exactamente la identidad interna `v28.0_prod`**. No crea una nueva numeración de versión.

## Objetivo

La batería de pruebas de `v28.0_prod` mostró dos regresiones principales: consultas deterministas demasiado costosas y respuestas/presentaciones que a veces ignoraban la información canónica ya disponible. Esta revisión simplifica la orquestación en vez de añadir más reglas de negocio.

## Cambios

### 1. Globo Gráficas → Por destino → COMPRADO

Se revierte al comportamiento estable anterior de `v27_prod_1.5`.

- El globo vuelve a mostrar únicamente las líneas que pertenecen al **destino/barra seleccionada**.
- Un ticket que contiene líneas de otros destinos **no expande esas otras líneas** dentro del globo.
- El total mostrado vuelve a corresponder al subconjunto visible de esa barra/destino.
- La restauración es genérica para todos los destinos y tickets; no contiene nombres de eventos, tiendas, productos ni TKxx hardcodeados.

### 2. Consultas estructuradas: ruta directa sin Gemini

Cuando la pregunta es una recuperación/presentación determinista de datos que ControlEvent ya conoce, la respuesta se construye localmente y no se envía el conjunto de datos a Gemini.

Incluye:

- catálogos generales de productos, tiendas, personas y eventos;
- productos comprados por evento y agrupaciones SEGMENTO/DESTINO;
- cruce catálogo general + compras reales de un evento;
- detalle de un TKxx;
- gráfica bancaria limitada a las fechas del evento y sus follow-ups;
- resumen gráfico global con datasets tipados de economía, asistencia, gestión y banco.

Estas rutas registran consumo Gemini cero.

### 3. Detalle de tickets

`event_purchase_lines` acepta ahora un filtro genérico `ticket` y lo aplica **antes de agregar o compactar** las filas. Así una petición de TKxx no depende de que sus líneas aparezcan entre las primeras filas de un resultado de todo el evento.

Al comprobar un total, CE compara contra una fuente independiente cuando existe. Si solo dispone de la suma de las mismas líneas, no afirma falsamente que el ticket "coincide" con un total independiente.

### 4. Banco y gráficas

- La gráfica solicitada "entre las fechas del evento" utiliza solo `event_window_timeline`.
- Un follow-up como "en esa misma gráfica..." hereda ese ámbito y no cae al histórico completo.
- Una respuesta no puede mostrar al usuario bloques internos `charts:`, `show_tables:` o especificaciones de renderizado.
- Los resúmenes gráficos generales usan datasets homogéneos: economía, asistencia y gestión por separado; no se grafican fechas, estados o personas como euros.
- Un histórico bancario de varios años no se añade automáticamente a un evento de unas semanas.

### 5. Consultas analíticas abiertas

Informes ejecutivos, anomalías/curiosidades y preguntas abiertas preconsultan en paralelo las fuentes CE necesarias y envían a Gemini un contexto compacto. Normalmente se realiza **una sola redacción Gemini**; solo el auditor factual puede provocar una segunda llamada si detecta un problema objetivo.

### 6. Reducción de coste

- `thinking_level` por defecto: `low` (configurable por entorno).
- `max_output_tokens` por defecto: 3200 (configurable por entorno).
- ciclos de herramienta: 4 en lugar de 8;
- compactación mucho más agresiva de tablas grandes y de banco;
- herramientas independientes se precargan en paralelo cuando procede.

En la batería observada anterior, las consultas que ahora tienen ruta directa representaban 22 de 36 llamadas Gemini y aproximadamente dos tercios del coste total. El ahorro real debe confirmarse con una ejecución nueva; no se presupone un coste exacto antes de medirlo.

## Privacidad y hardcoding

No se han añadido nombres de eventos, personas, tiendas, productos, importes, fechas o tickets concretos a la lógica de producción. Las decisiones se basan en intención, metadatos, relaciones canónicas y el evento actualmente seleccionado.

La información de acceso/credenciales sigue fuera de los catálogos generales servidos por Zuzu.

## Pruebas

- `scripts/test-v28-0-prod.cjs`: 14/14 OK.
- `scripts/test-v27-prod-1-4-zuzu-data-access.cjs`: 13/13 OK.
- `node --check` OK en los archivos de producción modificados.

La versión interna y externa continúa siendo `v28.0_prod`.
