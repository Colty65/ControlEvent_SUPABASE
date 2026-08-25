# RAW14O · VOICE LIFECYCLE

Objetivo cerrado: que «Hola Zuzu» siga vivo después de cerrar Zuzu y después de periodos de inactividad, y retirar el cambio RAW14N que hacía que Gemini rechazara el catálogo de tools por exceso de branching.

Cambios principales:
- El modal Zuzu emite `controlevent:zuzu-opened` y `controlevent:zuzu-closed`.
- Cerrar Zuzu rearma inmediatamente la escucha ambiental; el gesto de Cerrar se reutiliza para superar restricciones del navegador.
- El globo «Conversando con Zuzu / Hola Zuzu» pasa a ser un control de REARME y sanea estados conversacionales huérfanos.
- Watchdog periódico detecta overlay desaparecido, escucha ambiental parada y sesiones Web Speech envejecidas; renueva Web Speech preventivamente.
- Focus/visibility rearman la escucha ambiental.
- Se mantiene Borra texto local, cuarentena post-borrado y pausa humana de 3 s.
- La criba semántica de audio sigue en la primera llamada Gemini, pero ya no añade `input_quality`/`input_note` a todas las tools. Si Gemini considera que el audio es basura, usa `ce_conversation` + `incoherent_input` y nota `VOICE_NOISE:`. Los cambios radicales de asunto/evento siguen siendo válidos.
