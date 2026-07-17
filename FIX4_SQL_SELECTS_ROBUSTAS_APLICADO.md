# V22_prod FIX4 · SELECTs Zuzu robustas

Base: CE_v22_PROD_SQL_SELECT_REAL_FIX3_SEMANTICA_SELECTS.

Cambios:
- Planificador Zuzu recibe regla explícita para normalizar estados con UPPER(TRIM(...)) en SQL: BANCO, EFECTIVO, BIZUM, PENDIENTE, Pte. Compra.
- En agregados se exige COALESCE(SUM(...),0) para evitar métricas nulas.
- Aumentado maxOutputTokens por defecto del planificador a 2048.
- Si el planificador acaba por MAX_TOKENS, ControlEvent NO ejecuta SELECTs parciales.
- Añadido Paso 1b: segunda llamada a Zuzu para devolver solo SELECTs completas.
- Validador SQL reforzado: rechaza SELECTs truncadas por punto/coma/AND/OR/WHERE/JOIN/GROUP BY/ORDER BY/AS/FROM, comillas/paréntesis sin cerrar, texto mezclado o duplicados.
- Se eliminan SELECTs duplicadas antes de ejecutar.
- Si una SELECT devuelve métricas nulas/vacías en filas con etiqueta, se marca como sospechosa y se prioriza cálculo local/plantillas.
- Si todas las SELECTs devuelven 0 filas, no se concluye “no hay datos”; se intenta cálculo local/plantillas.
- Fallback local específico para rankings ejecutivos: ingresos, donaciones por donante/responsable, compras por tienda/responsable y semáforo financiero.

Tocado:
- services/event-ai.service.js

No tocado:
- logon
- selector
- ColtyLAB
- Resumen normal
- Gráficas normales
- Vista aérea
- Ingresos/Donaciones visuales
