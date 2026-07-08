# ControlEvent v18.11.10_prod · Zuzu modelos por funcionalidad y costes

Esta versión mantiene el flujo completo con Gemini pero añade decisión de modelo por tarea y trazabilidad de tokens/coste.

## Política de modelos

- Zuzu planificador de preguntas libres: `gemini-2.5-flash-lite` primero. Es JSON corto y no necesita redacción creativa.
- Zuzu redacción humana/informes: `gemini-2.5-flash` primero. Aquí importa el tono, el informe y la calidad narrativa.
- Zuzu respuesta estructurada: `gemini-2.5-flash` primero.
- Planificación Inicial:
  - Encargo total: `gemini-2.5-flash` primero, porque decide necesidades completas y cantidades.
  - Parcial/replica asistida: `gemini-2.5-flash-lite` primero, con Flash de respaldo.
- Alta asistida de compras / OCR de fotos: `gemini-2.5-flash` primero por calidad de lectura visual. Si se quiere modo económico, usar `CONTROLEVENT_TICKET_AI_TIER=lite`.

## Trazabilidad de consumo

Cada llamada a Gemini añade a la traza:

- modelo usado;
- tokens de entrada;
- tokens de salida/candidatos;
- tokens totales;
- coste estimado en USD y EUR aproximados.

La tarjeta de trazabilidad muestra el total estimado de la consulta.

## Variables opcionales

```env
CONTROLEVENT_ZUZU_PLANNER_MODEL=gemini-2.5-flash-lite
CONTROLEVENT_ZUZU_NARRATIVE_MODEL=gemini-2.5-flash
CONTROLEVENT_ZUZU_STRUCTURED_MODEL=gemini-2.5-flash
CONTROLEVENT_INITIAL_PLAN_AI_MODEL=gemini-2.5-flash
CONTROLEVENT_TICKET_AI_TIER=flash
CONTROLEVENT_USD_EUR=0.92
```

No es obligatorio configurar nada si se aceptan los valores por defecto.
