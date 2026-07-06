# CE v18_prod FIX37 - Planificación: JSON Zuzu y barril exacto

Base: CE_v17_PROD_FIX36_PLANIFICACION_GEMINI_FIX_MOMENTOS.

Cambios acotados:

1. Diagnóstico PRODUCTOS:
   - Corregido el caso Cerveza AMBAR Barril 50l: si el texto contiene 50l, no puede forzar Barril 30l por alias ni por nombre más corto.
   - Se prioriza coincidencia exacta normalizada y coincidencia de tamaño 50/30 antes que alias genérico.

2. Backend Planificación/Zuzu:
   - El matching de productos también distingue Cerveza AMBAR barril 50l y 30l.
   - La lectura de JSON de Zuzu pasa a usar un parser prudente con reparación de comas faltantes entre objetos/arrays y comas colgantes.
   - Si Zuzu devuelve JSON roto, la traza conserva rawTextPreview para poder ver la respuesta real.

No se ha tocado gráficas, resumen, globos, fotos ni compras normales.

Versión visible: v18_prod_FIX37_PLANIFICACION_JSON_BARRIL_EXACTO.
