# FIX27_PARTE5 aplicado

Base: CE_v22_PROD_BASE_FIX26_PARTE4.zip

Objetivo: estabilizar informes Zuzu sin tocar frontend ni logon.

Cambios:
- Si el prompt contiene eventos exactos resueltos por ControlEvent, se omite el planificador Gemini/Zuzu y se ejecutan plantillas cerradas directamente.
- La redacción Zuzu recibe un contexto mucho más compacto: resúmenes, socios canónicos, estados y meteorología, no cientos de líneas de detalle.
- El reintento de redacción ya no aumenta el contexto; añade una corrección breve y dirigida.
- Si Zuzu vuelve a no completar la redacción, ControlEvent muestra una redacción técnica local claramente etiquetada, para no dejar el informe vacío ni hacerla pasar por Zuzu.

Archivos tocados:
- services/event-ai.service.js
- FIX27_PARTE5_APLICADO.md

No tocado:
- logon
- selector
- frontend
- ColtyLAB
- Resumen
- Gráficas normales de la app
- Vista aérea
- Donaciones visuales
- Ingresos
