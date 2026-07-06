# ControlEvent v18.10_prod · Zuzu cuota, PDF, tablas y gráficas

Versión construida sobre v18.9_prod.

## Cambios incluidos

### 1. Menos consumo de Gemini
- El planificador de módulos deja de llamar a Gemini cuando ControlEvent ya detecta con seguridad módulos, persona, evento, rango o alcance.
- En informes con tono/opinión/redacción se reserva Gemini para la fase que más aporta: la redacción humana final.
- Añadida caché temporal en servidor para planificación y redacción narrativa repetida.
- Si Gemini devuelve cuota/rate-limit, no se intenta gastar otra llamada con un segundo modelo dentro de la misma petición.

### 2. Cabecera correcta en salida PDF
- La cabecera del PDF ya no pone siempre el evento activo.
- Si la respuesta es de otro evento, muestra ese evento.
- Si la respuesta es global/multievento, muestra “Consulta global · N eventos”.
- Si no corresponde mostrar evento, no mete “evento de prueba · En curso”.
- La fecha y hora pasan arriba a la derecha en negrilla.

### 3. Nombre sugerido del PDF
- El título de la ventana de impresión se genera con el patrón:
  `ControlEvent_v18_10_prod-responde_Zuzu_a_<asunto>-aaaammdd-hhmmss.pdf`
- Para informes de participación/opinión intenta formar asuntos como `Informe_opinion_Colty`.

### 4. Tablas ordenadas
- Las tablas se ordenan antes de enviarse al cliente.
- Criterios principales:
  - Evento + tienda + ticket + producto para compras/gastos/tickets.
  - Evento + donante + tipo + producto para donaciones.
  - Evento + papel + relacionado + producto para participación de personas.
  - Evento + rango + nombre para ingresos/personas.

### 5. Gráficas más finas
- Tipografía menos gruesa en tablas y gráficas.
- Barras más ligeras.
- Etiquetas con saltos de línea y menos solapes.
- Valores cero o muy pequeños mantienen presencia visual mínima.
- Ajustes aplicados también al modo impresión/PDF.

## Validaciones realizadas
- `node --check services/event-ai.service.js`
- `node --check services/event-context.service.js`
- `node --check app/features/v11-3-zuzu-analitica-libre.js`
- `node --check app/features/planificacion-inicial.js`
- `unzip -t` del ZIP final
