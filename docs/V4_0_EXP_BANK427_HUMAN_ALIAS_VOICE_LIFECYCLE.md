# ControlEvent v4_0_exp · BANK4_27

## Objetivo
Cerrar tres molestias de experiencia real sin reabrir la arquitectura semántica:

1. Un alias social exacto identifica a la persona individual. Los registros de pareja no compiten por contener su nombre; la pareja debe pedirse explícitamente.
2. Una pregunta nueva corta inmediatamente la lectura anterior. Si se escribe, `beforeinput` protege desde la primera tecla. Durante la nueva espera puede sonar la microfrase de entretenimiento y la respuesta nueva vuelve a leerse desde el principio.
3. La voz reduce la fragmentación: conserva comas, dos puntos y punto y coma dentro de la misma locución y corta por frase/tamaño. Las frases de entretenimiento se pronuncian en un único utterance para evitar medias frases.
4. Toda salida oral, incluida memoria literal y fallback local, pasa por una última aduana que aplica `ce_eventos.nombre_hablado`.

No requiere SQL nuevo.
