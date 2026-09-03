# ControlEvent v4_1_exp · Zuzu VNext P1.2

P1.2 parte de P1.1 y corrige el fallo visual observado en PC: el backend VNext devolvía tablas V26 con filas como objetos, mientras `tableHtml()` esperaba arrays y ejecutaba `r.map()`. El resultado factual quedaba correctamente archivado/PDF, pero la pantalla terminaba en `r.map is not a function`.

Cambios:

- Adaptador de tablas VNext a `columns + rows[]` clásico antes de llegar a la UI.
- `tableHtml()` acepta tanto filas-array legacy como filas-objeto V26, como defensa adicional.
- La lectura completa de Supabase para VNext puede ejecutarse en paralelo (`getState({parallel:true})`); el flujo legacy no cambia.
- En VNext, la lectura de Supabase arranca al mismo tiempo que la Interaction de Gemini y solo se espera si la función elegida necesita datos. Así el tiempo de BBDD se solapa con el tiempo de interpretación.
- La Interaction P1.2 no exige schema JSON final: usa salida de texto nativa cuando no hay tools y function calling nativo cuando sí las hay.
- El límite de salida del turno factual baja a 256–480 tokens y el presupuesto queda en una sola Interaction normal.
- La traza separa `IA`, `espera estado tras IA`, `datos` y `total` para medir el cuello de botella real.

No requiere SQL.
