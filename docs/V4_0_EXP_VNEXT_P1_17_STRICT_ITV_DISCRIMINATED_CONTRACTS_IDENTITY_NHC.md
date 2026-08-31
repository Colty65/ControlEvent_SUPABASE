# ControlEvent v4_0_exp · VNext P1.17

## Objetivo

P1.17 corrige los dos problemas detectados al auditar las baterías P1.16: el árbitro ITV podía aceptar una respuesta factual con un contrato distinto del esperado, y también podía suspender respuestas correctas por validaciones demasiado literales. Además elimina la duplicación `requested_constraints`, hace el schema de `query_ce` discriminado por `operation` y conserva la procedencia de identidad individual/pareja en `person_event_status`.

## Cambios

1. **ITV exige capacidad factual compatible.** Un `event-summary` ya no puede aprobar si VNext ejecutó `person_event_status`; `event-management` no puede aprobar con `event_summary`; un dossier personal exige `person_profile`.
2. **Falsos KO de objetivos múltiples corregidos.** La validación de asistencia usa una expresión regular válida dentro de `RegExp(...)`; `"asistencia 5 personas"` certifica 5 asistentes.
3. **Dossier personal mínimo.** Si el oráculo acredita ingresos/compras/donaciones no nulos, una respuesta que solo enumera eventos queda incompleta.
4. **Gestión Hitos/LG.** El contenido debe materializar el dominio Hitos/LG además de usar `event_management`.
5. **Schema discriminado por operación.** `query_ce` expone `anyOf` con una rama por cada una de las 23 operaciones canónicas y `additionalProperties:false` en cada rama.
6. **Sin `requested_constraints`.** Una clave estructurada válida se expresa una sola vez. `order_by`, `requested_fields`, `mine`, `responsible`, etc. ya no tienen que repetirse en una lista paralela.
7. **MALFORMED_CALL.** Una clave que no pertenece a la operación o un tipo inválido no se sanea como si fuera un contrato correcto; queda auditado como llamada mal formada. Una operación inexistente sigue siendo `UNSUPPORTED_CAPABILITY`.
8. **`requested_fields` es salida, no filtro.** Se conserva tal cual; además se tolera el JSON estructural de un único campo enviado como string y se normaliza a array.
9. **Operación efectiva.** `capabilityCalls` exporta `effectiveOperation` y el sujeto efectivo después de reparaciones de tipo. ITV juzga la operación realmente ejecutada, no solo la intentada por Gemini.
10. **Identidad con procedencia.** `person_event_status` conserva `queried_person`, `resolved_person`, `income_registered_as` y `attendance_registered_as`. Si un ingreso está registrado como pareja, la respuesta lo dice y no mezcla silenciosamente la identidad individual con la compartida.
11. **Cruce de asistencia por representación registral.** Las representaciones acreditadas por el dossier (`Registrado como`) también participan en el cruce con asistencia. Esto permite que `Colty` pueda enlazarse correctamente con una asistencia registrada como `Colty y Esther`, sin hard-codear esos nombres.
12. **Root cause después del veredicto real.** Como los falsos OK pasan primero a KO, los turnos posteriores del mismo escenario pueden clasificarse correctamente como `CASCADE`.

## NHC

Los cambios de P1.17 trabajan con operaciones, schemas JSON, tipos, campos, entidades y procedencia de datos. No se añade una lista de frases del usuario para decidir módulos.

## Pruebas locales

- `test:vnext-p117`: 25/25 en la construcción inicial.
- `vnext-p110-behavior-regression`: 12/12.
- Las regresiones antiguas P1.10/P1.14/P1.15 basadas en `grep` de build/schema pueden fallar por cambios deliberados de arquitectura o número de versión; no equivalen a un fallo funcional de la conversación.
- No se ejecuta una batería pagada E2E con Gemini desde este entorno. La validación decisiva sigue siendo BÁSICA 50 + MEDIA 60 desde ITV.
