# ControlEvent v4_0_exp · VNext P1.18
## Capability JSON Canonicalizer · Factual Coverage ITV · Structured Focus · GOLDEN 110 · NHC

P1.18 no añade reglas de castellano al runtime. Su objetivo es que Gemini pueda expresar la misma intención mediante formas JSON estructuralmente equivalentes, que CE las canonice y que ITV juzgue hechos/capacidades, no una única ruta interna.

## Cambios aplicados

1. **Registro → canonizador JSON.** Cada llamada `query_ce` queda clasificada como `CANONICAL`, `COMPATIBLE`, `NORMALIZED`, `MALFORMED_CALL` o `UNSUPPORTED_CAPABILITY`.
2. **Compatibilidades inocuas.** `requested_fields` es proyección de salida y se admite de forma general. `scope=all_events` en `events_overview` se elimina como redundancia. `status` de compras puede normalizarse a `purchase_status`.
3. **DERIVE genérico desde variantes estructuradas.** `event_purchases + order_by=amount_desc + top_n=1` se convierte a `derive/MAX`; con `top_n>1`, a `derive/RANK`. Se conserva `source_operation` + `source_args` para ejecutar sobre datos CE reales.
4. **ITV por cobertura factual.** Un oráculo puede admitir más de una capacidad válida. Ejemplos: una petición de donaciones puede satisfacerse con `event_donations` o con `event_summary` si este materializa las donaciones; una pregunta derivada puede resolverse con `derive` o con una operación base que ya entregue el hecho exacto.
5. **Funcional ≠ rendimiento.** Cada caso exporta `functionalStatus`/`functionalReasons` y `performanceStatus`/`performanceReasons`. Una respuesta correcta de 19 s sigue siendo funcionalmente OK y queda KO de rendimiento.
6. **SORT acreditado estructuralmente.** `order_by=amount_desc` certifica `sort:Importe:desc` además de `view_sort`.
7. **Banco SIN REALIZAR.** Ceros explícitos no convierten en KO una respuesta cuyo estado canónico es `CUADRE BANCARIO SIN REALIZAR`; solo se penalizan magnitudes no nulas o tablas históricas incompatibles.
8. **Foco estructurado.** Las capacidades personales disponen de `focus_mode=replace|add`. `replace` sustituye el sujeto vivo; `add` compone varios sujetos deliberadamente. CE no decide esto leyendo la frase.
9. **Guía de herramientas más precisa.** `event_documentation` es estado/recuento documental estructurado; `search_documents` es búsqueda de contenido. `person_profile` es visión global; `person_income_status` es persona dentro de un evento.
10. **GOLDEN 110.** Se congelan las 50 BÁSICAS + 60 MEDIAS usadas como referencia P1.17. Los prompts y escenarios son fijos; al cargar GOLDEN se refrescan los oráculos con el estado actual de CE. Las baterías BÁSICA/MEDIA/DIFÍCIL/EXTREMA siguen siendo exploratorias y regenerables.
11. **ITV visible.** La consola muestra `GOLDEN · 110`, admite 110 casos y separa filtros/veredictos funcionales de `PERF_WARN` / `PERF_KO`.
12. **Auditoría Supabase.** `ce_zuzu_capabilities` refleja el registro P1.18 y `ce_zuzu_capability_observations` conserva firma, JSON bruto, JSON canonizado, clasificación, reparaciones e incidencias. Nada se promueve automáticamente.

## Regla NHC

El runtime no contiene preguntas GOLDEN como reglas ni añade `if/regex` nuevos para reconocer sus frases. Las transformaciones P1.18 dependen de `operation`, claves JSON, tipos, valores enum, identidad resuelta y estado estructurado.

## Uso recomendado de ITV

- **GOLDEN 110:** medir regresión real entre versiones con las mismas preguntas.
- **BÁSICA/MEDIA/DIFÍCIL/EXTREMA:** descubrir lenguaje y situaciones nuevas.
- Analizar primero `functionalStatus` y `decisionDiagnosis`; revisar `performanceStatus` por separado.
- No convertir automáticamente una firma observada en contrato: revisar `COMPATIBLE/NORMALIZED/MALFORMED/UNSUPPORTED` y decidir si corresponde a schema, software CE o nueva capacidad.

## Pruebas locales de construcción

La regresión P1.18 cubre el canonizador, alternativas de cobertura factual, separación funcional/rendimiento, banco, SORT, GOLDEN 110, UI/cache/SQL y NHC. Estas pruebas son estructurales/unitarias; la certificación conversacional real requiere ejecutar GOLDEN/BÁSICA/MEDIA contra Gemini desde la ITV desplegada.
