# RAW14M · VOICE ENGINE

Objetivo cerrado de esta revisión: robustecer el circuito de voz sin reabrir la arquitectura conversacional de Zuzu.

## Cambios

- Wake `Hola Zuzu`: abre primero la ventana Zuzu y reproduce un saludo local, sin llamada IA: `Hola, <usuario>. ¿Tienes ganas de que hablemos? Pregúntame algo.`
- Durante cualquier frase local de control se detienen/pausan Web Speech y Voz CE para que Zuzu no se escuche a sí misma.
- La pregunta se mantiene en un buffer local. Un final técnico de SpeechRecognition ya no significa fin semántico de la pregunta.
- Se esperan 3 s de silencio real antes de enviar la pregunta. En Voz CE el VAD mantiene la grabación durante esos 3 s para no perder una continuación dubitativa.
- Orden local reservada `Borra texto` (también `Borrar texto`, `Borra el texto`): limpia únicamente `ceAiPrompt` y el buffer del turno; no toca conversación, contexto, dataset, view ni historial. Respuesta local: `Te escucho de nuevo, <usuario>.` y vuelve a ESCUCHANDO.
- Watchdog de Web Speech: si `start()` no llega a `onstart` en 3,5 s, cae a Voz CE.
- Watchdog no destructivo de `getUserMedia`: a los 6 s marca necesidad de rearme por gesto y deja traza.
- Rearme adicional tras login/restauración de autenticación.
- Estado observable: BOOT, AMBIENT_STARTING, AMBIENT_LISTENING, WAKING, OPENING_ZUZU, GREETING_LOCAL, USER_STARTING, LISTENING, PAUSA_DUBITATIVA, PROCESSING, SPEAKING, REPLY_WINDOW, PARKED, RECOVERY/ERROR.
- `ControlEventVoiceTurns.debugState()` expone fase, historial de fases, buffer, transporte y datos de micrófono para diagnosticar arranques intermitentes.

## Prueba manual prioritaria

En PC, iPhone, iPad y Android, repetir 10 veces:
1. entrar a CE;
2. esperar unas veces inmediatamente y otras 2-5 min;
3. decir `Hola Zuzu`;
4. comprobar apertura inmediata de Zuzu y saludo local;
5. preguntar con una pausa voluntaria de 1-2 s a mitad;
6. comprobar que no envía la pregunta hasta terminar;
7. en otra vuelta dictar texto, decir `Borra texto`, comprobar que solo se vacía la caja de pregunta, oír la confirmación local y volver a dictar;
8. tras la respuesta, no decir nada y comprobar aparcado tras la ventana de réplica.
