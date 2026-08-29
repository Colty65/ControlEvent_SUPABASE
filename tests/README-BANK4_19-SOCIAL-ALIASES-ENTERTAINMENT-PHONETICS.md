# BANK4_19 · Alias sociales de entrada + entretenimiento fonético

## Motivo
BANK4_18 humanizaba correctamente muchos nombres **al hablar**, pero los motes no estaban
llegando de forma fiable al Semantic Core como candidatos PERSON. La prueba real mostró
`La rubia`, `La Estercita`, `Angelines` y `Manolo` sin candidato tipado, aunque sus nombres
canónicos sí existían en PERSONAS.

## Cambios
- El vocabulario social pasa a ser bidireccional de verdad: alias/mote -> candidato PERSON canónico.
- Matching de alias por palabras normalizadas, sin depender de regex frágiles ni de mayúsculas/acentos.
- Segunda certificación mecánica post-Gemini: si Gemini conserva el mote en `people`, CE lo resuelve
  usando las pistas canónicas del mismo perfil social antes de ejecutar el dossier.
- `Paco` sigue siendo ambiguo cuando puede ser Cordo o Curvas: CE no inventa cuál.
- Se incorpora `Miguel Ángel` -> `Veinticinco`.
- Un `clarify` sin texto ya no rompe el turno por contrato; recibe una pregunta genérica estructural.

## Entretenimiento de voz
- Se elimina toda microfrase que empiece por `Mmm` para evitar que TTS lea «eme, eme, eme».
- Display y audio quedan separados. Por ejemplo, se muestra `Ummmmm...........` pero TTS recibe
  el token minúsculo `ummmmm` como una sola vacilación oral.
- El mazo contiene 20 frases algo más largas, con onomatopeyas y pausas explícitas por cláusula.
- Se conserva completa `Calla............... ya lo tengo....., besitos muá.`.
- Intervalo inicial sigue en 3300 ms y máximo una frase por petición.
- Nuevo build de voz `VOICE-V52` y almacenamiento de mazo v49 para evitar caché previa.
