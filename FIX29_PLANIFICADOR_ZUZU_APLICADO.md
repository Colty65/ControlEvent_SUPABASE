# FIX29 · Planificador Zuzu como inteligencia de módulos/condiciones

Base: CE_v21_PROD_BASE_FIX28_PARTE6

Cambios:

- Zuzu planificador vuelve a ser el responsable de decidir módulos y condiciones de acceso.
- ControlEvent ya no se salta el planificador cuando detecta eventos exactos; solo actúa como barandilla si Zuzu falla.
- Prompt del planificador reducido y alineado con la prueba externa del usuario:
  - pregunta del usuario,
  - evento en pantalla,
  - módulos disponibles,
  - eventos disponibles,
  - salida obligatoria con EVENTOS_SOLICITADOS, MODULOS_NECESARIOS, PERSONAS_IMPLICADAS y CONDICIONES_DATOS.
- Se desactiva el thinking interno en Gemini 2.5 para el planificador (`thinkingBudget: 0`) y se sube maxOutputTokens a 1024 para evitar respuestas truncadas tipo `MODULOS_NECESARIOS: PERSON...`.
- Si el planificador devuelve `EVENTO_ACTIVO` o `EVENTO_EN_PANTALLA`, ControlEvent lo resuelve al evento activo real.
- El planificador puede devolver condiciones de acceso y personas implicadas; ControlEvent las incorpora como filtros auditables.
- Se mantiene la seguridad: ControlEvent no ejecuta SQL libre; los SELECT propuestos por Gemini quedan como orientación/diagnóstico, y CE extrae con módulos oficiales de solo lectura.
- Para preguntas de pagos, el prompt del planificador indica que normalmente bastan INGRESOS y PERSONAS, sin DONACIONES ni COMPRAS salvo petición explícita.
- Para donaciones, el prompt exige respetar el donante literal registrado y no deducir repartos.

Archivos tocados:
- services/event-ai.service.js
