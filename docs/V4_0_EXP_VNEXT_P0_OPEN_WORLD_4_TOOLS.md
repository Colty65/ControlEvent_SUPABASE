# ControlEvent v4_0_exp · Zuzu VNext P0

Prototipo paralelo a BANK4_27. No sustituye el Ledger vigente.

## Objetivo

Probar una conversación **open-world**: un mensaje humano no tiene que compilar siempre a un dominio de CE. Gemini puede conversar normalmente y solo usa herramientas cuando necesita datos.

## Las 4 herramientas

1. `resolve_entity`: nombres canónicos, motes y nombres hablados.
2. `query_ce`: datos estructurados de ControlEvent.
3. `search_documents`: descripción, documentos y evidencias.
4. `recall_memory`: memoria persistente de conversaciones anteriores.

## Qué se elimina del camino crítico

- Semantic Core / Query Frame del Ledger.
- MEMORY EVIDENCE GATE en cada turno.
- Reparación lingüística posterior a Gemini.
- Auditor IA de una tercera llamada.

Un turno sin datos debe resolverse con una única Interaction. Un turno con datos normalmente necesita dos: decisión de tool + respuesta con el resultado.

## Cómo probar

En la ventana Zuzu aparece el botón **🧪 VNext**. Es un modo A/B de sesión. Al activarlo se borra el `previousInteractionId` para no mezclar arquitecturas.

Pruebas recomendadas:

- `Dame info de La Estercita`
- `Una lista de socios con su nombre hablado incluido`
- `¿El primo ha pagado Función 2026?`
- `No, me refiero a los ingresos y a quién queda por pagar`
- `Por cierto, a una persona nueva le llamamos Pepito` (debe conversar, no fallar)
- `Vale, cambiamos de tema`
- `Recuérdame alguna conversación sobre Gonzalito`
- `Busca en los documentos de Función 2026 algo sobre ...`

La traza VNext muestra Interactions, rondas de tools, tiempo total, tokens y coste para poder compararlo con BANK4_27.
