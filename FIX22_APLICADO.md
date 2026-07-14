# CE_v21_PROD_BASE_FIX22

Base: CE_v21_PROD_BASE_FIX7_DONACIONES_OK.

Cambios limitados:

1. Ficha ColtyLAB sin evento seleccionado
- El selector vacío manda sobre selectedEventId arrastrado.
- Si no hay evento real seleccionado, el logo ColtyLAB abre la ficha de presentación/version.
- Se cierran/eliminan capas antiguas de AVANCE y el botón flotante fantasma Cerrar.
- No se toca logon ni selector.

2. Zuzu planificador
- Planificador ultraligero sigue siendo genérico; no hay lógica ad hoc para SySA.
- Flash primero para el planificador.
- En Gemini 2.5 se envía thinkingConfig.thinkingBudget = 0 para evitar que los tokens internos de razonamiento corten la salida visible.
- maxOutputTokens subido a 1024 solo para el planificador.
- Si Gemini devuelve MAX_TOKENS se considera salida truncada y se corta seguro.
- Parser tolerante de texto normal: EVENTOS_SOLICITADOS, MODULOS_NECESARIOS, MODULOS_NO_NECESARIOS, CONSULTA_GLOBAL, MOTIVO.

3. Extracción CE tras plan de Zuzu
- Si Zuzu planifica, ControlEvent no mezcla módulos del plan local.
- En alcance cerrado o planificado por Zuzu, EVENTOS no significa todos los eventos.
- No se añade evento activo si el prompt lo prohíbe.
- METEO reconocido como módulo permitido para que el planificador pueda pedirlo.

Archivos tocados:
- services/event-ai.service.js
- services/event-context.service.js
- public/app/features/v16-hotfix5-logo-avance-ligero.js
- public/app/features/v17-fix19-touch-close-graphs.js
- public/index.html (cache bust)
- index.html (cache bust)
