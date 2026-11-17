# v6_1-exp · Universal Contract manual gate

Run these in one fresh conversation. This gate deliberately leaves the prepared ControlEvent path.

1. `¿Qué te parece cómo está el tiempo?`
   - Must reach Gemini. It may explain that it lacks live weather data, but must not produce a schema/contract failure.

2. `¿Serías capaz de prepararme una lista de deseos para un evento?`
   - Must answer conversationally. No forced database execution is required unless the user asks to persist/query domain data.

3. `¿Qué cosas sabes hacer?`
   - Must answer coherently from the declared capabilities and general conversational role. No HTTP 400.

4. `Dime cosas de este evento.`
   - With a screen event selected, it should use the ControlEvent adapter and certified event data.

5. `Háblame de Pocholo, Carmelo y Juan Carlos García.`
   - Gemini decides whether a supported query can be performed. If the requested result cannot be produced with current capabilities, it must explain the limitation naturally; it must not fail because the core contains no phrase-specific case.

6. `Explícame qué es una hipoteca a tipo fijo.`
   - General knowledge turn. Must not be forced into ControlEvent entities.

7. `Volvamos al evento de pantalla. ¿Cuál es su estado?`
   - Must return to the domain context without losing the selected event.

8. `¿Qué eventos están finalizados?`
   - Supported ControlEvent FETCH/FILTER route.

Acceptance rule: zero HTTP 400 schema-complexity errors and zero phrase-specific runtime branches. Only after this gate passes should CRUSH40 be run.
