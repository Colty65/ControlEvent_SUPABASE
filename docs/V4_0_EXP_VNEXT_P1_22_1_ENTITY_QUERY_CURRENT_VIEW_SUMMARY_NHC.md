# VNext P1.22.1 · Entity Query + Current Dataset View + Summary Fallback · NHC

Correcciones generales a partir de la prueba manual del 01/09/2026:

1. `events_catalog + query` se resuelve contra catálogos canónicos antes de validar. Solo coincidencias exactas e inequívocas de persona/evento se tipan (`person_events` / `event_summary`).
2. `events_catalog` no puede borrar una persona canónica nombrada en el turno.
3. Nueva capacidad `view_current`: filtros, orden y columnas actúan sobre la tabla/dataset actual sin reabrir un módulo empresarial. Para resultados auxiliares (memoria/documentos) se conserva un snapshot compacto en `resultContext`, fuera del puente textual de Gemini.
4. `recall_memory(current)` siempre entrega un resumen: primero narración IA; si falla o sale vacía, cierre local factual basado exclusivamente en los turnos recuperados.

NHC: ninguna reparación depende de palabras, nombres concretos o preguntas GOLDEN.
