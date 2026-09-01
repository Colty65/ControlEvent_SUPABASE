# ControlEvent v4_0_exp · VNext P1.21

## Objetivo
Cerrar las cinco familias residuales detectadas por GOLDEN 110 en P1.20.1 (101 OK / 9 KO) sin añadir hard-code lingüístico ni nuevas capacidades empresariales.

## Cambios
1. **DERIVE conserva la identidad de fila**: cuando `label_field` no se especifica, se usa el identificador natural del dataset (`Evento`, `Producto`, `Tienda`, `Persona`) y nunca el propio campo numérico derivado.
2. **Top-1 estructural**: `event_purchases + order_by=amount_desc + record_count=1` se canoniza a `derive(MAX, amount)` sobre el dataset de compras. `record_count` normal (>1) sigue siendo metadato y no se interpreta como límite.
3. **Resumen documental estructural**: `search_documents` con evento pero sin `query` se canoniza a `query_ce:event_documentation`. `search_documents` queda reservado para buscar contenido concreto.
4. **Catálogo fuerte de `requested_fields`**: `event_summary` publica solo `income, purchases, pending, donations, balance, attendees, valuation, status`; `balance` se describe como saldo operativo canónico. Se mantienen aliases JSON en runtime.
5. **Retry único de function_call malformada**: si Gemini imprime una pseudo-llamada interna como texto y no emite ninguna tool, se concede un solo reintento de protocolo. No se activa en respuestas conversacionales normales.

## NHC
Las nuevas decisiones usan únicamente estructura JSON, tool name, presence/absence de query, columnas y contratos. No se han introducido reglas para nombres, frases o preguntas concretas del GOLDEN.

## Rendimiento
El schema `query_ce` P1.21 mide ~34.6k caracteres, manteniéndose en el rango compacto de P1.20.1 y muy por debajo del schema P1.20 que causó la regresión de ~24 s.

## Prueba de regresión
- `npm run test:vnext-p121`
- `npm run test:vnext-p110`
- `npm run test:zuzu-itv-contract`
- `npm run test:zuzu-itv-oracle`

La validación definitiva sigue siendo GOLDEN 110 en despliegue real con Gemini.
