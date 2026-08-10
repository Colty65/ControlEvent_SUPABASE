# ControlEvent v28.0_prod · equilibrio CE / Zuzu

Revisión posterior a la batería de pruebas del 11/08/2026.

## Objetivo

Mantener el ahorro de coste obtenido al resolver de forma determinista las consultas que ControlEvent ya conoce, sin degradar el razonamiento de Zuzu cuando la consulta requiere interpretación, continuidad conversacional o análisis. Las peticiones que piden decidir qué es «importante», «relevante» o «clave» vuelven a Gemini, mientras CE preconsulta los hechos y garantiza las gráficas tipadas.

## Cambios

### Referencias TKxx
- Se conserva el literal real del ticket para mostrarlo al usuario (`TK05`, `TK005`, etc.).
- La comparación es canónica y genérica: `TK5`, `TK05` y `TK005` pueden identificar el mismo número lógico sin perder el formato almacenado.
- El filtro de un TK se aplica antes de compactar las compras.
- No existe ninguna excepción específica para TK05 ni para ningún evento.

### Continuidad CE directo -> Gemini
- Una respuesta directa de ControlEvent queda en el historial local.
- Si el turno siguiente necesita Gemini y contiene referencias como «ese análisis», «esa gráfica», «de esa lista» o equivalentes, se incorpora el contexto local reciente a la entrada de Gemini.
- No se fuerza una llamada a Gemini en el turno determinista solo para mantener memoria.

### Informes y semáforos
- Cero, saldo positivo o ausencia de registros no implican por sí solos verde/rojo.
- Solo se usa una valoración semafórica si existe estado canónico, umbral/objetivo explícito o criterio proporcionado por el usuario.
- 0 tareas pendientes con 0 tareas totales no se interpreta como prueba de finalización.
- 0 hitos no se interpreta como prueba de falta de trazabilidad.
- 0 compras pendientes no demuestra por sí solo cierre financiero/logístico completo.

### Gráficas solicitadas
- Las gráficas explícitamente solicitadas tienen prioridad sobre las automáticas.
- Si se pide concepto + importe + saldo por punto, la ruta directa activa etiquetas estáticas reales para PDF, no solo una promesa de tooltip.
- Cuando el banco dispone de `event_window_timeline`, un informe que pide gráfica de línea prioriza el intervalo del evento.

### Auditoría hecho / inferencia
- La revisión explícita de una respuesta anterior no lanza automáticamente una segunda llamada Gemini para «auditar al auditor»; conserva las advertencias objetivas y evita duplicar coste salvo necesidad real.

### Cabecera
- Se elimina la escritura destructiva de versión sobre contenedores `.appname` / `.appname-stack`.
- La cabecera vuelve a ser la estructura estable de versiones anteriores: icono CE + versión, fecha/hora y botones Refrescar / Salir.
- Se reutiliza el mecanismo de refresco y sesión ya existente; no se implanta una cabecera paralela.

### Gráficas -> Por destino
- Se mantiene el comportamiento estable anterior recuperado en la revisión previa.
- No se expanden tickets completos desde una barra de destino.

## Política de no hardcode

Esta revisión no introduce nombres de eventos, personas, tiendas, productos, importes ni números de ticket concretos en la lógica de producción. Las decisiones se basan en intención, metadatos, campos canónicos y normalización genérica.

## Pruebas

- 19/19 pruebas específicas de v28.0_prod.
- 13/13 regresiones de acceso general a datos de v27_prod_1.4.
- 351 archivos JS/CJS de las áreas de código (`public`, `app`, `services`, `scripts`) verificados sintácticamente sin errores.
- La estructura HTML de la cabecera coincide con la de v27_prod_1.5, salvo el texto de versión.
