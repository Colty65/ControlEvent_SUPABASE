# ControlEvent v4_1_exp · BANK4_10 · cierre Z1 + EUR

BANK4_10 parte de BANK4_9 y cierra los fallos concentrados por la ITV ORACLE_ACTIVE del 28/08/2026 antes de abrir Z2.

## Cambios funcionales

- SAFE FAST-LOCAL: un resultado de tabla con sort/rank/limit no se cierra localmente mientras la VIEW siga conteniendo varias filas; evita responder con la tabla cruda a preguntas de máximo/mínimo/ranking.
- Continuidad tipada de evento y persona: se mantiene el sujeto activo cuando Gemini no aporta una entidad nueva y se recuperan referencias de año relativo contra el catálogo canónico.
- Comparación multi-entidad: los follow-ups de compras/donaciones sobre varios eventos se reconducen a `comparison`, preservando cada evento y la métrica antes de elegir ganador.
- Documentación: se distinguen justificantes de ingreso, TKxx con imagen y detalle de un TKxx concreto.
- Donaciones: se elimina un filtro `donor` solo cuando contradice estructuralmente al EVENT explícito; los recuentos de donación distinguen registros originales de productos agrupados.
- ITV: valida magnitudes numéricas monetarias con formato español/EUR y no exige recitar el estado bancario cuando la pregunta solo pide un recuento.

## Formato monetario recuperado

Los tipos monetarios vuelven a mostrarse en formato español con símbolo euro, por ejemplo `1.734,00 €`. Se consideran dinero Precio, Importe, Coste/Gasto, Ingresos, Saldo, Valoración, Aportación, compras/donaciones valoradas y derivados (sumas, medias, máximos, mínimos y totales del mismo significado).

No se añade `€` a recuentos o magnitudes físicas: Unidades, Cantidad, Personas, Asistentes, Eventos, Registros, TKxx, Documentos, porcentajes, temperatura, etc. Columnas ambiguas como `Valor` se tipan usando su indicador/fuente canónica, no por el nombre aislado.

La redacción final normaliza expresiones de Gemini como `1734 EUR` a `1.734,00 €` únicamente cuando la cifra ya viene marcada como moneda; no convierte números desnudos de significado desconocido.

## ITV / build

- Build ITV: `20260828-BANK410-Z1-CLOSURE-SAFEFASTLOCAL-EUR`
- Build general: `20260828-V4_1_EXP-BANK410-Z1-CLOSURE-SAFEFASTLOCAL-EUR`
- No requiere cambios SQL.
- Se mantienen deliberadamente sin alterar los 9 DOC huérfanos detectados por FAST; es una incidencia de datos, no un fallo que deba ocultarse desde Zuzu.
