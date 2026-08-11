# ControlEvent v28.2_prod

Versión de consolidación de Zuzu orientada a reducir redundancia, mejorar el contexto de los informes y hacer más útil la conciliación bancaria sin ampliar ni hardcodear lógica de negocio.

## Cambios principales

- Memoria incremental de hechos: un follow-up evita reconstruir el análisis amplio cuando ya existe contexto suficiente.
- Prioridad a la última propuesta concreta de Zuzu: respuestas como «sí», «hazlo» o equivalentes ejecutan la acción pendiente más reciente.
- Conciliación bancaria enriquecida: cada movimiento puede aportar su justificación de ingreso o tickets asociados, además de importe, concepto y saldo resultante.
- En el informe gráfico general, los movimientos justificados aparecen inmediatamente después de la evolución bancaria; se eliminan visualizaciones redundantes del mismo dataset.
- Refinamientos posteriores de una gráfica bancaria pueden resolverse directamente desde CE, sin volver a pedir a Gemini que redescubra la información.
- Listas de productos ordenadas por defecto por TIENDA > SEGMENTO > DESTINO > PRODUCTO, salvo que el usuario pida otro orden.
- Traza opcional en PDF solo si el usuario la solicita. No incluye secretos, credenciales ni prompts internos.
- Los PDF de follow-up incorporan un contexto causal mínimo de la conversación para que una pregunta como «sí, hazlo» sea comprensible al archivarla.
- Deduplicación de tablas y gráficas por contenido.
- Identidad completa actualizada a v28.2_prod, incluyendo INFOEVENTO, BACKUP externo/interno, cliente y servidor.
- Se conserva sin cambios funcionales la cabecera estable y la lógica de Gráficas > Por destino recuperada en versiones anteriores.

## No hardcode

No se han introducido excepciones para nombres de eventos, personas, tiendas, tickets, productos, destinos, importes o fechas usados en las pruebas. Las reglas nuevas se basan en intención semántica, relaciones entre tablas y metadatos reales de ControlEvent.

## Comprobaciones

- 23/23 pruebas específicas v28.2_prod.
- 40/40 regresiones de calidad Zuzu, banco y acceso genérico a datos de las series v27_prod_1.2, v27_prod_1.3 y v27_prod_1.4.
- 447 archivos JS/CJS/MJS reales comprobados con `node --check`: 0 errores. Hay 12 archivos históricos con extensión `.js` cuyo contenido real es imagen/JSON/HTML y por eso se excluyen correctamente de la comprobación sintáctica JavaScript.
- Las únicas referencias activas a v28.1_prod quedan en listas explícitas de migración de almacenamiento/sesión.

## Nota sobre coste

La arquitectura está preparada para evitar reconsultas redundantes y para resolver follow-ups deterministas directamente en CE cuando sea posible. El coste real de Gemini debe medirse con una ejecución real porque depende de la conversación, datos disponibles y decisiones del modelo.
