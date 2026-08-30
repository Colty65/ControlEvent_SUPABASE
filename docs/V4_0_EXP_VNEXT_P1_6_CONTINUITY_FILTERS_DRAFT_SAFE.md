# VNext P1.6 · Continuity Filters + Draft Safe

Objetivos de esta iteración:

- Conservar el fast path de una Interaction factual.
- Hacer continuables los filtros de compras: responsable/mine, orden, estado pendiente/realizada y exclusiones.
- Reparar el contrato de «quién queda por pagar» si Gemini intenta una operación de persona sin sujeto.
- Mantener el escenario Plan B en seguimientos, permitir plan=true y gráfica local sin segunda IA.
- Proteger prompts escritos largos: el textarea ya no es interceptado en capture global, el borrador se persiste en sessionStorage y existe recuperación explícita del último prompt.
- La voz no puede sobrescribir un borrador manual activo.

No requiere SQL.
