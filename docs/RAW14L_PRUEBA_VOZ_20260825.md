# RAW14L · foco canónico, turn-taking de voz y autoridad del resultado

Base: RAW14K. Cambios motivados por la conversación de prueba del 25/08/2026 (31 turnos).

## Correcciones

- Multientidad de personas: si el turno contiene varias PERSON exactas, el compilador no puede fusionarlas en un único nombre. Cada persona viaja como elemento independiente de `people`.
- Asistencia: se añaden modos estructurales `attending_members` y `attending_non_members`; las listas completas de socios asistentes, no socios asistentes y socios no asistentes quedan en `facts`, no en una muestra truncable.
- Presentación de asistencia: si el usuario pide nombres o "uno por uno", se valida que la redacción contenga toda la población solicitada. Si no, Zuzu repara solo la presentación sobre el mismo resultado CE.
- Gráficas: la fase final ya no puede inventar una gráfica decorativa que no estuviera en el plan ejecutado.
- Cambio de evento: un nombre de evento explícito puede pasar el guard si el resolvedor canónico del mismo tipo lo identifica de forma única; después SCC fija el nombre canónico.
- Continuidad: `CURRENT_CONTEXT` prioriza el scope canónico realmente ejecutado sobre el alias literal emitido por el compilador.
- Avisos "En curso": en ámbitos amplios se calculan únicamente con los eventos que aparecen físicamente en la VIEW resultante, no con todos los eventos del catálogo.
- Compras filtradas: los importes de la VIEW actual son autoritativos. Se prohíbe mezclar un total global del evento con el subtotal de una persona/responsable.
- Validación factual de presentación: si la redacción escrita introduce un importe en euros que no existe en el resultado CE autoritativo, se solicita una única reparación de presentación sin cambiar el plan ni consultar datos nuevos.
- Meta-conversación: feedback/correcciones sobre la respuesta anterior y despedidas se mantienen en conversación; un candidato fuzzy aislado no abre una consulta nueva.
- Fuzzy de entrada: candidatos fuzzy débiles (<0,90) no se inyectan al compilador como evidencia autoritativa. El resolvedor tipado posterior sigue admitiendo variantes habladas/escritas cuando Gemini ya ha identificado el tipo (p. ej. persona/evento).

## Voz / micrófono

- Tras cada respuesta hay una ventana natural de réplica de 12 s.
- Si el usuario empieza a hablar, la ventana se renueva mientras continúa la voz, también con el fallback cloud.
- Si no empieza un nuevo turno, la conversación se aparca y el micrófono vuelve a modo ambiental: para continuar se usa de nuevo "Hola Zuzu".
- Al aparcar o cerrar la conversación se detienen tanto SpeechRecognition como la escucha cloud, evitando que el micrófono quede capturando conversación de fondo indefinidamente.

## Regresiones ejecutadas

- RAW14L: 23/23.
- RAW14K: 21/21.
- RAW14J: 19/19.
- RAW14I: 13/13.
- `node --check` correcto en backend Zuzu y módulo de voz.

Los cambios son estructurales y tipados; no incluyen alias hard-code de Carmelo, Gonzalo, Esther, Cito, Vicente, Placidín, Fito/Cito ni nombres de eventos concretos.
