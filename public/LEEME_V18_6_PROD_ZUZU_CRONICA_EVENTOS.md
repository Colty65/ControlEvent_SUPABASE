# ControlEvent v18.6_prod · Zuzu con crónica cronológica de eventos

Esta versión refuerza la inteligencia de Zuzu para preguntas humanas del tipo:

> Dame un informe ordenado en el tiempo por la celebración de cada evento, contando detalladamente las cosas que ocurrieron en cada uno de los eventos registrados.

## Cambios principales

- Cuando el usuario pide **todos los eventos registrados**, **cada evento**, **cosas que ocurrieron**, **crónica**, **celebración** u **orden temporal**, ControlEvent ya no responde con una ficha técnica ni con una gráfica genérica.
- Se genera un **informe cronológico** ordenado por `fecha ini` / fecha de celebración.
- `EVENTOS` se usa solo para identificar título, fechas, estado y orden.
- El contenido real del informe sale de:
  - `INGRESOS` / colaboradores
  - `COMPRAS`
  - `DONACIONES`
  - `TICKETS` / fototickets
  - `DOCUMENTOS`
- Se añade tabla `Crónica ordenada por fecha de celebración` con una columna `Qué ocurrió` para cada evento.
- Se añade tabla `Detalle por evento y módulo`, para no mezclar datos y poder auditar qué salió de cada módulo.
- Se generan dos CSV:
  - `Informe_cronologico_eventos_v18_6_prod.csv`
  - `Informe_cronologico_eventos_detalle_modulos_v18_6_prod.csv`
- El planificador reconoce mejor frases como `cosas que ocurrieron`, `cada uno de los eventos`, `celebración de cada evento`, `ordenado en el tiempo` y fuerza extracción de módulos operativos.

## Objetivo

Evitar que Zuzu conteste “lo que le parece” cuando el usuario pide un informe humano. A partir de esta versión, para este tipo de preguntas la app hace una interpretación operativa: **qué pasó realmente en cada evento**, no solo qué datos técnicos tiene la tabla EVENTOS.
