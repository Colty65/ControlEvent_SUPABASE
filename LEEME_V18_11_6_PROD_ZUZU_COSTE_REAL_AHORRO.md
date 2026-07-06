# ControlEvent v18.11.6_prod · Zuzu coste real y ahorro

## Cambios

- La traza ya muestra costes con 5-6 decimales, no redondeados a 0 €.
- La estimación de coste ahora usa salida facturable = `max(candidatesTokenCount, totalTokenCount - promptTokenCount)`, porque Gemini puede incluir tokens internos/thinking en `totalTokenCount`.
- La traza separa entrada, salida facturable, salida visible y tokens ocultos cuando los haya.
- Añadido modo de selección de modelo para redacción final:
  - `CONTROLEVENT_ZUZU_NARRATIVE_TIER=auto` por defecto.
  - `lite/ahorro`: Flash-Lite primero.
  - `flash/calidad`: Flash primero.
- En modo auto, las consultas simples tienden a Flash-Lite y los informes de opinión/exhaustivos/técnicos siguen usando Flash para conservar calidad.
- Alta asistida de compras/OCR mantiene Flash por defecto, pero conserva `CONTROLEVENT_TICKET_AI_TIER=lite` para modo económico.
- Corregido filtro temporal humano: “año pasado”, “este año” y “año que viene” se traducen a año real antes de extraer eventos, evitando arrastrar 20 eventos cuando solo se pedía 2025.

## Nota

La factura real de Google puede variar por impuestos, cambio USD/EUR, caché, región o cambios de tarifa. ControlEvent calcula una estimación para que puedas medir coste por consulta sin esperar al panel de AI Studio.
