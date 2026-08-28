# v4_0_exp · BANK4_13 · MEMORY CONTINUITY / FEEDBACK / VOICE

## Motivo
La prueba del 29/08/2026 confirma que BANK4_12 cerró el contrato de `ce_reference`, pero destapa fallos alrededor del recuerdo: pérdida del sujeto humano en una continuación elíptica, presentación IA después de un KO de ejecución, una confirmación de memoria demasiado permisiva con frases que empiezan por «sí», ausencia de un índice real de recuerdos y quejas del usuario interpretadas como reejecución de datos.

## Cambios
- El `DISCOURSE_FOCUS` conserva la PERSON resultante de una reejecución histórica aunque el nombre no vuelva a aparecer en el texto actual.
- Una continuación como «busca en qué eventos aparece» reutiliza ese sujeto PERSON y consulta su dossier transversal `all_events`; nunca toma al usuario logado como sustituto.
- La confirmación de memoria solo acepta respuestas cortas de confirmación. «Sí, dame una tabla…» conserva la nueva intención.
- Las peticiones de tabla/lista de recuerdos usan el inventario persistente completo de episodios recordables (hasta 200), no un Top-K temático, y pueden ordenarse de antiguo a moderno o al revés.
- El acto conversacional `feedback` queda tipado en el schema de `ce_conversation`; una crítica sin petición factual no ejecuta QUERY/REFERENCE.
- Un KO de ejecución ya no llega a Gemini final. CE presenta su error autoritativo localmente, evitando que la redacción invente personas o datos sobre un resultado inexistente.
- El prompt de presentación evita fórmulas de atención al cliente ante una queja y pide reconocer el despiste de forma breve y natural.
- El mazo de entretenimiento pasa a v47 y cambia exactamente:
  - `Mmm…` → `Ummm...................`
  - `Calla… que ya lo tengo.` → `Calla............... ya lo tengo....., besitos muá.`
  El fallback también usa el nuevo `Ummm...................`.

## NHC
Las reparaciones no contienen nombres de personas/eventos de la prueba. Trabajan con tipos (`PERSON`), foco discursivo persistido, acto conversacional y estado de ejecución. La frase concreta de Clara se usa solo como caso de regresión.
