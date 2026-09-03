# ControlEvent v4_1_exp · VNext P1.16
## Registro canónico de capacidades + DERIVE + mapa de causa raíz · NHC

P1.16 aplica las familias detectadas por ITV P1.15 sin crear reglas por frase. La regla NHC se mantiene: el runtime nuevo describe y valida JSON, contratos, columnas y estado estructurado; no añade detectores de palabras del usuario.

## Lista de trabajo P1.16

1. **Registro canónico de contratos y firmas JSON — HECHO.** `services/zuzu-capability-registry.service.js` es la fuente de verdad. Declara 23 operaciones, claves obligatorias/opcionales, restricciones protegidas, defaults y contrato de resultado.
2. **Guardar tool intentada completa incluso si CE falla — HECHO.** `meta.capabilityCalls` conserva `rawArgs`, `normalizedArgs`, auditoría del registro y error. ITV lo exporta en cada caso.
3. **ROOT CAUSE / CASCADE — HECHO.** En baterías conversacionales, el primer KO de cada escenario queda como causa raíz; KO posteriores del mismo escenario se etiquetan `CASCADE` y conservan `underlyingCategory`.
4. **Falso KO de compras — HECHO.** ITV reconstruye filas UI desde `columns + rows` y certifica `by_product`; distingue líneas de compra de productos distintos.
5. **Certificación SORT — HECHO.** ITV admite evidencia por `order_by` y por `table_view_sort` estructurado.
6. **Cuatro capacidades generales — HECHO.** Se exponen en `query_ce`: `event_documentation`, `event_management`, `store_purchases`, `events_overview`, reutilizando ejecutores CE ya existentes.
7. **Identidad de `person_events` — HECHO.** `person_profile` y `person_events` usan la misma resolución canónica y la misma fuente `person_dossier`.
8. **DERIVE genérico — HECHO.** `SUM`, `COUNT`, `DISTINCT_COUNT`, `MAX`, `MIN`, `AVG`, `RANK`, `DIFFERENCE` operan sobre el dataset factual anterior. No crea intents como `winner_income` o `product_most_expensive`.
9. **`requested_fields` — HECHO.** `event_summary` puede declarar las magnitudes que deben materializarse; el cierre local respeta esa lista. Por defecto el resumen incluye también asistencia.
10. **Schema/ayuda Gemini desde el registro — HECHO.** `query_ce` genera su enum y propiedades desde el registro y Gemini recibe el catálogo de capacidades/contratos. El runtime vuelve a validar el JSON antes de ejecutar.

## Defensa contra argumentos inventados

Campos opcionales que alteran el conjunto (por ejemplo `mine`, `responsible`, filtros, orden, columnas, `metric` o gráfica) deben declararse en `requested_constraints`. Si Gemini añade uno sin declararlo, CE no lo convierte en comportamiento oficial: lo elimina de la ejecución, lo registra como `SANITIZED` y deja rastro para ITV.

Una operación inexistente devuelve `UNSUPPORTED_CAPABILITY`; una operación conocida con JSON inválido devuelve `INVALID_CONTRACT`. Ninguna observación nueva se promociona automáticamente a contrato válido.

## Persistencia Supabase

Ejecutar una sola vez:

`sql/ce_zuzu_capability_registry_p116.sql`

Crea y puebla:
- `ce_zuzu_capabilities`: espejo auditable de las 23 capacidades canónicas.
- `ce_zuzu_capability_observations`: cada firma JSON observada, argumentos originales/saneados, incidencias y reparaciones.
- `ce_zuzu_capability_signature_summary`: vista agrupada por firma con primera vez, última vez y número de apariciones.

La aplicación puede funcionar aunque el SQL todavía no se haya aplicado: el registro de ejecución está en código y la escritura de observaciones es tolerante a tabla ausente. Sin el SQL no quedará histórico persistente de firmas en Supabase.

## NHC

P1.16 no añade regex ni `if` sobre la frase del usuario para seleccionar módulos. Las nuevas decisiones se basan en:
- `operation` y argumentos JSON;
- contratos y enums;
- entidades canónicas;
- datasets y columnas reales;
- historial estructurado `resultContext`.

Las normalizaciones lingüísticas heredadas de versiones anteriores siguen existiendo donde ya estaban; P1.16 no añade otra capa de frases.

## Pruebas realizadas al construir el ZIP

- `node --check` sobre los tres ficheros modificados principales.
- Regresión P1.16: **37/37 OK**. Incluye tests unitarios ejecutando el código real del registro y del bloque puro de ITV, más verificaciones estructurales de cableado.
- Regresión de comportamiento P1.10 de tabla: **12/12 OK**.
- `zuzu-itv-oracle-regression.js`: **OK**.

Algunas regresiones antiguas basadas en `grep` de versión/source dan KO esperados porque P1.16 mueve el schema desde `event-ai.service.js` al registro y cambia deliberadamente el build P1.14/P1.15. No se consideran pruebas funcionales fallidas.

No se ha realizado una batería E2E con Gemini desde este entorno. La prueba decisiva es repetir BÁSICA 50 y MEDIA 60 en ITV con P1.16.
