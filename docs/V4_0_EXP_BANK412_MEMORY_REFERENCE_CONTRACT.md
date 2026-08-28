# v4_0_exp · BANK4_12 · MEMORY REFERENCE CONTRACT

## Motivo
En la prueba de recuerdo de 29/08/2026 la memoria episódica resolvió correctamente la primera conversación y su follow-up. Sin embargo, una petición de recuerdo por persona (Clara Alvarez García-Brazales) llegó a `ce_reference` con acciones libres (`restore` / `reattempt`). El normalizador CE solo admite las acciones canónicas del protocolo y, correctamente, rechazó esas acciones inventadas.

## Cambio
La function tool `ce_reference` deja de declarar `reference_action` como `string` libre y expone el enum canónico:

- `restore_snapshot`
- `reexecute_plan`
- `reexecute_episode`
- `recall_turn`
- `recall_episode`
- `resume_episode`

No se añade ninguna traducción semántica en CE (`restore` → otra acción, etc.). Gemini sigue siendo quien decide el significado; CE solo publica el contrato válido. Esto mantiene NHC y evita que la recompilación repita una orden imposible.

## No tocado
- Motor de memoria episódica y selección ordinal: ya funcionaban en la prueba.
- Humanización Z1H/voz: sin cambios.
- Detección tipada de entidades: se mantiene el caso observado de `DIA` como STORE candidato para abordarlo con una regla lingüística genérica si llega a interferir, nunca con una excepción hard-code.
