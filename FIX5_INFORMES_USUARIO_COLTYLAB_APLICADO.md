# ControlEvent v22_prod · FIX5

## Cambios aplicados

### Zuzu · comparativas e informes
- Las consultas SQL/SELECT quedan como comprobación interna y dejan de gobernar la salida normal para usuarios.
- Los totales y saldos de comparativas se calculan prioritariamente con las métricas canónicas y módulos oficiales de ControlEvent.
- Se detectan y descartan agregaciones SQL con uniones directas entre varias tablas de hechos que puedan multiplicar importes.
- Para comparativas de varios eventos se refuerza la carga de datos de cada evento exacto antes de construir el informe.
- La meteorología se consulta solo para el evento al que el usuario la vincula en el prompt; en el caso probado, únicamente SySA 2026.
- Se detectan respuestas cortadas o inconclusas, incluyendo finales como “Es importante”, y se fuerza un reintento completo con conclusión.
- La redacción final recibe instrucciones para no mostrar SELECT, SQL, RPC, tokens, módulos ni trazabilidad.

### Presentación y PDF
- Los títulos técnicos se sustituyen por títulos para usuario final, como “Comparativa de eventos y meteorología”.
- Las tablas y gráficas técnicas de SELECT/SQL se ocultan en consultas normales.
- La trazabilidad queda cerrada por defecto en pantalla.
- El PDF ya no incluye trazabilidad, SELECT/SQL ni el bloque vacío “Archivos generados”.
- Se mantienen las gráficas y tablas operativas útiles del informe.

### ColtyLAB
- La ficha informativa de ColtyLAB se abre al pulsar el logo/bloque ColtyLAB tanto al entrar como después de seleccionar un evento.
- Los manejadores antiguos de “AVANCE DEL EVENTO” quedan interceptados para que no sustituyan la ficha por el globo anterior.
- El título del elemento pasa a “Ver información de ControlEvent”.

## Validaciones realizadas
- Comprobación de sintaxis de todos los JavaScript modificados con `node --check`.
- Prueba real en Chromium del clic sobre ColtyLAB con un evento seleccionado: abre la ficha y no abre ningún globo de avance.
- Prueba real en Chromium de renderizado e impresión de una respuesta simulada con contenido SELECT: el título se humaniza y el PDF elimina trazabilidad, SELECT y “Archivos generados”, conservando tablas y gráficas de usuario.
- Pruebas internas de detección de uniones SQL que multiplican importes, respuesta narrativa cortada y filtrado meteorológico exclusivo de SySA 2026.
