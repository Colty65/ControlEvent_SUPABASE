# CE v20_prod FIX35 - Planificación: Zuzu ultracorto

Base: CE_v17_PROD_FIX34_PLANIFICACION_PARSER_DONACIONES_MOMENTOS_TIMEOUT.

Objetivo: no añadir otra capa de imaginación local, sino reducir el encargo que recibe Zuzu para que responda rápido y útil.

Cambios:

1. Prompt ultracorto para Encargo total a Zuzu.
   - Zuzu ya no recibe el JSON enorme con catálogo completo, precios, trazas y textos duplicados.
   - Recibe solo: evento, consumos, momentos, donaciones/existencias resumidas, catálogo indicativo muy pequeño y reglas.
   - El prompt queda parecido a una petición humana directa de compras por déficit.

2. Donantes de bloques.
   - Corrige la herencia errónea de `Existencias` desde el encabezado general.
   - Si aparece `Donado socio - X / Responsable Y`, ese encabezado manda sobre el anterior.
   - Mantiene donante/responsable/tipo de bloque cuando se detectan explícitamente.

3. Llamada a Zuzu más ligera.
   - En Encargo total se usa `responseMimeType: application/json`, pero no se fuerza `responseSchema`, para aligerar la llamada.
   - `maxOutputTokens` reducido en Encargo total.
   - Timeout interno ajustado al prompt más corto.

4. Trazabilidad mantenida.
   - La app sigue mostrando la caja negra: días, momentos, donaciones, tamaño real del prompt y respuesta de Zuzu.

No se ha tocado:
- Gráficas.
- Resumen presupuestario.
- Globos.
- Fotos.
- Compras normales.
- Mantenimientos.
