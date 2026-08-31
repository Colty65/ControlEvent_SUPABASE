# VNext P1.18.1 · GOLDEN 110 ARR hotfix · NHC

Hotfix exclusivamente de la consola ITV.

- Corrige `ReferenceError: arr is not defined` al iniciar GOLDEN 110.
- La causa era que P1.18 introdujo dos usos de `arr(...)` en la UI para `auditValidity.reasons` y `performanceReasons`, pero no declaró el helper local.
- Se añade `const arr = v => Array.isArray(v) ? v : [];`.
- Se incrementa el cache-bust del script para impedir que el navegador reutilice la JS P1.18 defectuosa.
- No modifica `services/event-ai.service.js`, el registro de capacidades, el canonizador, los oráculos ni las preguntas GOLDEN.
- NHC intacto.
