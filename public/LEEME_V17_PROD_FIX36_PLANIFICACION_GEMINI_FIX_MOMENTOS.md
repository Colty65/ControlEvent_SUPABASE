# CE v17_prod FIX36 - Planificación: corrige llamada Gemini ultracorta

Base: FIX35_GEMINI_ULTRACORTO.

Cambio único funcional:
- Corregida la variable interna `momentos is not defined` en la construcción del contexto ultracorto de Gemini.
- En FIX35 el contexto calculaba `moments` pero devolvía `momentos` como variable inexistente, por eso no había llamada Gemini trazable y se caía al fallback con solo donaciones.
- Ahora el JSON enviado contiene `momentos: moments` y la llamada a Gemini puede ejecutarse.

No se han tocado gráficas, resumen, globos, compras normales ni fotos.

Version visible: v17_prod_FIX36_PLANIFICACION_GEMINI_FIX_MOMENTOS.
