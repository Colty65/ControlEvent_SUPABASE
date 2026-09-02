# ITV · INTÉRPRETE GEMINI · V1

Objetivo: comprobar la hipótesis arquitectónica más simple antes de seguir modificando Zuzu.

Flujo del laboratorio:

Usuario + estado controlado -> Gemini -> plan JSON mínimo -> validación local.

NO ejecuta ControlEvent, NO consulta Supabase y NO usa function calling.

## Formato del plan

```json
{
  "type": "EXECUTE|CHAT|CLARIFY|UNSUPPORTED",
  "actions": [
    {"capability":"event_summary","arguments":{"event":"SySA 2026"}}
  ],
  "needs_analysis": false,
  "summary": "..."
}
```

## Batería

30 escenarios independientes, repetidos 3 veces = 90 decisiones.

Incluye:
- datos de eventos;
- memoria histórica;
- tablas visibles, filtros, columnas y orden;
- derivaciones;
- multientidad y referentes;
- comparación y análisis;
- conversación sin datos;
- aclaración por ambigüedad;
- capacidad deliberadamente inexistente.

## Cuatro métricas independientes

1. JSON válido.
2. Capacidad conocida.
3. Parámetros ejecutables por el contrato CE.
4. Semántica correcta respecto al escenario.

La batería no concluye nada sobre la ejecución CE: esa será una fase posterior si la interpretación demuestra fiabilidad suficiente.

## Criterio de decisión sugerido

- >=95% semántica y ejecutabilidad: arquitectura intérprete -> CE muy prometedora.
- 85-95%: estudiar por categorías antes de integrar.
- <85%: revisar catálogo/contexto/modelo antes de tocar CE.

## Aislamiento

En esta entrega los hashes de `services/event-ai.service.js` y `public/app/features/v24-cuadre-banco.js` son idénticos a la entrega P2-R + BANK4.8 anterior. El laboratorio no cambia el runtime de Zuzu ni la ventana Evolución Temporal del Saldo.
