# ControlEvent v28.5.3_prod — disciplina de coste Zuzu

Objetivo de esta versión: mantener la calidad de v28.5.1 y eliminar consumo redundante de Gemini.

## Cambios principales

- `event_bank` entrega a Gemini un resumen agregado en modos `brief/standard`; las cronologías completas permanecen en ControlEvent para renderizar gráficas y tablas.
- Se añaden agregados bancarios canónicos: ingresos/cargos incluidos, movimientos justificados/sin vínculo, movimientos con TK o ingreso asociado, y agregados del intervalo del evento.
- `event_people` añade agregados de ingresos (obligatorio, voluntario y por situación/forma) y en `brief` no transporta la tabla completa de personas.
- Los prefetch `brief` de dossier, desgloses y documentación usan facts, no tablas completas.
- Las opiniones generales preconsultan solo `event_dossier`.
- «Profundiza en ingresos y banco» preconsulta solo `event_people + event_bank` y usa una sola llamada de razonamiento sin herramientas.
- Un prompt gráfico que pide banco + ingresos se resuelve directamente por CE: gráfica bancaria + ingresos por forma de pago, con 0 llamadas Gemini.
- El detalle de movimientos bajo una gráfica bancaria solo se incluye si el usuario pide explícitamente movimientos, detalle, justificación, tickets, conceptos o puntos.
- El informe general conserva la justificación bancaria bajo la gráfica, porque es parte deliberada de ese formato.
- Máximo de 2 llamadas Gemini por turno.
- Techo económico configurable con `CONTROLEVENT_ZUZU_HARD_CAP_EUR`, por defecto `0.010 €`.
- Antes de cada llamada se estima de forma conservadora el coste de entrada/salida; si puede superar el techo, la llamada no se realiza.
- `CONTROLEVENT_ZUZU_MAX_OUTPUT_TOKENS` baja por defecto de 2400 a 1600.
- El auditor factual corrige localmente; no existe una tercera llamada para «corregir la corrección».
- La traza muestra un control explícito de coste: objetivo habitual <= 0,004 €, alerta > 0,008 €, techo 0,010 €.

## Política de coste esperada

- Consultas deterministas/tablas/gráficas conocidas: 0 €.
- Razonamiento normal: objetivo 0,003–0,004 € o menos.
- Consulta compleja: debe mantenerse por debajo de 0,010 €.
- Si una nueva llamada puede romper el techo, CE no la ejecuta.

## No hardcode

No se han introducido nombres de eventos, personas, tiendas, TKxx, importes ni fechas concretas para superar las pruebas. Las rutas se basan en intención semántica, tipo de fuente y estado real de ControlEvent.

## Versión

Identidad completa `v28.5.3_prod`, incluida aplicación, INFOEVENTO y BACKUP interior/exterior. `v28.5.1_prod` se conserva únicamente como origen de migración de claves de sesión/preferencias.

## Validación de construcción

- 13/13 pruebas específicas v28.5.2.
- 16/16 regresión de calidad v27_prod_1.2.
- 11/11 regresión banco/gráficas v27_prod_1.3.
- 13/13 regresión acceso a datos v27_prod_1.4.
- 406 archivos JS/CJS/MJS de código fuente/rutas activos pasan `node --check`.
