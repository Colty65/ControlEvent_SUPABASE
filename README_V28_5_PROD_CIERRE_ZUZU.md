# ControlEvent v28.5_prod · cierre de Zuzu

Esta versión no amplía las capacidades de Gemini. Reduce caminos de ejecución y hace deterministas las comparativas y los seguimientos que en v28.4 seguían siendo inconsistentes.

## Principios

1. Un informe gráfico de un solo evento mantiene la ruta económica de v28.4: CE preconsulta hechos canónicos y Gemini razona una vez.
2. Las comparativas de 2 o más eventos se resuelven en CE de forma determinista, con todos los eventos resueltos antes de representar datos.
3. Una comparativa nunca incorpora cronologías bancarias individuales mezcladas. Banco se resume por evento mediante periodo, movimientos conciliados, impacto y saldos. Los movimientos individuales solo se muestran si el usuario los pide expresamente para un evento concreto.
4. Los seguimientos "estos datos", "datos anteriores", "retoma la situación" y similares conservan la lista de eventos comparados y no vuelven al evento activo.
5. "Claro que sí" y otras afirmaciones naturales ejecutan la última propuesta pendiente sin Gemini.
6. Si se promete un desglose de compras, CE materializa tabla y gráfica; una reclamación de "tabla prometida" se resuelve localmente.
7. Las comparativas completas disponen de una matriz homogénea con economía, asistencia, gestión, documentación, tickets y resumen bancario.
8. Las comparativas gráficas de "todos los datos" generan varias gráficas homogéneas, no una sola gráfica arbitraria de precio por socio.
9. Las gráficas de queso solo se usan para métricas no negativas comparables entre eventos.
10. No se hardcodean eventos, años, personas, tiendas, productos, tickets, importes ni fechas de las pruebas.

## Matriz comparativa extendida

Por evento puede incluir: estado, fechas, precio por socio, ingresos, compras realizadas y pendientes, donaciones, saldo operativo, valoración, asistentes, socios/no socios, hitos, tareas LG, justificantes de ingreso, tickets e imágenes, documentos y adjuntos, número de movimientos conciliados, impacto bancario y saldos bancarios de apertura/cierre.

## Coste

La versión conserva la traza y el total general acumulado de la conversación. Las rutas comparativas estructuradas y sus seguimientos gráficos son locales, por lo que su consumo Gemini es 0. Gemini queda reservado para preguntas verdaderamente interpretativas que no tengan una respuesta determinista.

## Trazabilidad PDF

La traza permanece plegada por defecto. Si está plegada al generar el PDF no se incluye ningún dato de traza ni coste total. Si está desplegada se incorpora completa, incluido el total general acumulado.
