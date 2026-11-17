# ControlEvent v6_1-exp · Conversation-First Canonical Cognitive Compiler

La instrucción maestra activa está embebida en `v6SystemPrompt()` de `services/event-ai.service.js`.

Prioridad de esta revisión: conversación coherente antes que visualización, voz u optimización. El Context Packet incorpora `conversation_state`, hasta 6 turnos recientes visibles, Thread Graph y Evidence Ledger. Gemini sigue siendo el único intérprete semántico; CE solo persiste/expone estado mecánico y valida/ejecuta.

No existe fallback cognitivo v4/v5.
