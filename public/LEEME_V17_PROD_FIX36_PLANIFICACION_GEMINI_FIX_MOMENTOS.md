# CE v19_prod FIX36 - Planificación: corrige llamada Zuzu ultracorta

Base: FIX35_GEMINI_ULTRACORTO.

Cambio único funcional:
- Corregida la variable interna `momentos is not defined` en la construcción del contexto ultracorto de Zuzu.
- En FIX35 el contexto calculaba `moments` pero devolvía `momentos` como variable inexistente, por eso no había llamada Zuzu trazable y se caía al fallback con solo donaciones.
- Ahora el JSON enviado contiene `momentos: moments` y la llamada a Zuzu puede ejecutarse.

No se han tocado gráficas, resumen, globos, compras normales ni fotos.

Version visible: v19_prod_FIX36_PLANIFICACION_GEMINI_FIX_MOMENTOS.
