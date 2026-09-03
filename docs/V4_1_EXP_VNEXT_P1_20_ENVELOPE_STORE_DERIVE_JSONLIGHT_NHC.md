# ControlEvent v4_1_exp · VNext P1.20

## Objetivo

P1.20 es una intervención de infraestructura a partir del GOLDEN 110 de P1.19 (91 OK / 19 KO). No añade reglas lingüísticas específicas ni capacidades empresariales nuevas. Se concentra en que las capacidades ya existentes puedan combinarse sin que metadatos de contexto/presentación invaliden el contrato de negocio.

## 1. Envelope canónico

Cada llamada `query_ce` se audita conceptualmente en cuatro planos:

- `subject`: evento(s), persona, tienda, producto, ticket, responsable.
- `query`: parámetros que cambian la consulta/cálculo empresarial.
- `context`: procedencia del dataset, `source_args`, `table_key`, foco y metadatos heredados.
- `presentation`: `requested_fields`, orden, columnas y vista.

El runtime sigue aceptando el JSON plano actual para no romper compatibilidad. El canonizador construye el envelope y evita que contexto/presentación se confundan con la semántica empresarial.

## 2. Compras globales por tienda

Forma compatible:

`event_purchases + store + sin event` → `store_purchases(scope=all_events,status=realized)`.

Si existe un evento real, `store` se convierte en filtro `include_stores` dentro del evento.

## 3. DERIVE y procedencia

- `event/events/person/store` recibidos junto a `derive` pasan a `context/source_args`.
- `table_key` no invalida `derive` ni una vista de compras.
- `event_purchases + derive_operation` se normaliza a `derive`.
- `compare_events + derive_operation` se normaliza a `derive` sobre la comparación.
- El ejecutor mezcla `historyBase + explicitSource`, por lo que un fragmento de procedencia no borra el dataset factual anterior.
- `compare_events(metric=income|purchases|donations|attendance)` puede cerrar localmente el ganador cuando ya dispone de la matriz comparativa, evitando volver a responder solo “he comparado”.

## 4. Persona e ingreso global

- `person_income_status(person=X)` sin evento → `person_profile(person=X, requested_fields=[income])`.
- Un `person_profile` global no falla por un `status` heredado de otro contrato.
- Si el turno no nombra una nueva entidad y el foco estructurado anterior es una persona, se conserva esa persona para el seguimiento.
- Si el turno nombra explícitamente un evento canónico, ese evento sustituye un sujeto personal heredado.

## 5. Operación ausente

Sin releer castellano:

- `person` sin `operation` → `person_profile`.
- `event` sin `operation` → `event_summary`.
- `store` sin `operation` → `store_purchases`.
- `events[]` con dos o más → `compare_events`.
- foco estructurado de persona/evento sin operación → dossier correspondiente.

## 6. Ingresos de evento

`event_income_lines` materializa siempre el total además de indicar el número de líneas. Así, si Gemini elige el detalle cuando la pregunta quería el total, CE no pierde una magnitud factual que ya posee.

## 7. JSON LIGHT / FULL

La ITV ofrece dos exportaciones:

- `JSON LIGHT`: recomendada para análisis normal. Conserva pregunta, oráculo compacto, respuesta, estados, rendimiento, operación/args, envelope y diagnóstico, pero elimina filas/tablas/trazas pesadas.
- `JSON FULL`: forense, conserva todo el contenido previo.

En una simulación sobre el GOLDEN P1.18.1, la forma LIGHT queda alrededor del 24% del tamaño del FULL. Es una referencia de tamaño, no un compromiso fijo.

## 8. Supabase

`sql/ce_zuzu_capability_registry_p120.sql` es idempotente y:

- actualiza el espejo de las 23 capacidades a `20260831-P120`;
- añade `envelope jsonb` a `ce_zuzu_capability_observations` si no existe;
- mantiene las observaciones como auditoría; nunca promocionan automáticamente una combinación.

## 9. NHC

P1.20 no incorpora al runtime ninguna pregunta GOLDEN, nombre de tienda/persona concreto ni patrón de frase para reparar los casos. Las decisiones nuevas se basan en JSON, entidades canónicas, dataset/foco y contratos.

## 10. Validación local

- P1.20 específica: 36/36.
- P1.10 estructura: 10/10.
- P1.10 comportamiento: 12/12.
- ITV contract: OK.
- ITV oracle regression: OK.

Estas pruebas son estructurales/unitarias. La certificación funcional sigue siendo ejecutar GOLDEN 110 real con Gemini.
