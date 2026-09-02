# ITV · INTÉRPRETE GEMINI V2.1

Objetivo: mantener el laboratorio V2 y quitar de Gemini detalles redundantes que ControlEvent puede completar de forma determinista sin reinterpretar lenguaje.

## Cambios sobre V2

1. `event_purchases` compila por defecto a `purchase_status=realized`; Gemini no tiene que repetirlo.
2. `event_income_status` compila por defecto a `status=pending` en este contrato conceptual; Gemini no tiene que repetirlo.
3. `MEMORY/search` acepta un sujeto reconocido (`people`) y el traductor construye la query canónica.
4. `CALCULATE/MAX|MIN|...` no exige `label`; si el dataset tiene una única columna descriptiva distinta del campo numérico, el traductor la usa.
5. `PERSON/event_status` se define expresamente como estado/situación de una persona dentro de un evento, distinto de `profile`.
6. `CHAT/session_summary` se separa expresamente de `MEMORY`: la primera resume la sesión actual; MEMORY solo trata recuerdos históricos almacenados.
7. Si el resolvedor entrega `entity_resolution.status=ambiguous`, el traductor bloquea cualquier ejecución y exige aclaración. Gemini nunca puede convertir una ambigüedad en una elección silenciosa.
8. Nueva métrica `ESTABILIDAD CE 3/3`: comprueba si las tres interpretaciones terminan compilando a la misma orden CE, aunque el JSON conceptual no sea idéntico.

## Principio

CE puede completar defaults, normalizar estructura y aplicar guards de ejecutabilidad. CE no cambia la intención decidida por Gemini.

La batería sigue siendo 30 escenarios × 3, no consulta Supabase y no ejecuta módulos CE.
