# ControlEvent v4_1_exp · BANK4_22 · MEMORY STATE MACHINE

## Motivo
BANK4_21 logró recuperar el primer episodio, pero los follow-ups de memoria seguían dependiendo de que el Semantic Core inventase correctamente `reference_action` y distinguiese `memory_index` de `recall_episode`. La prueba real del 29/08/2026 mostró fallos en `sí, recuérdamelo`, `¿qué me dijiste entonces?`, `conversación completa`, `última conversación`, `¿de qué hablamos?` y `vuelve a la primera`.

## Cambio
La navegación básica de memoria se convierte en una máquina de estados sobre punteros persistentes:
- ordinales primera/segunda/última/penúltima -> episodio persistente real;
- follow-up de episodio activo -> ancla histórica persistente, no CURRENT genérico;
- pregunta/respuesta literal -> `recall_turn`;
- conversación completa -> `recall_episode` con transcript completo;
- panorámica `qué recuerdas` -> resumen real de memoria, no una promesa vacía de 200 filas;
- lista/tabla de recuerdos -> preview textual + tabla completa;
- búsquedas tipo `estuvimos hablando de X` entran en memoria aunque no incluyan fecha.

Gemini sigue interpretando el resto del lenguaje y los turnos ambiguos. La máquina de memoria no toca queries de negocio ni entidades actuales.

## Robustez de contrato
- Se permiten 2 llamadas Gemini únicamente cuando hay que recompilar un contrato estructural defectuoso.
- Alias estructurales `recalled_episode`, `recalled_turn`, etc. se canonicalizan a acciones CE válidas.
- `memory_literal.field` y `full_transcript` sobreviven a la normalización.
