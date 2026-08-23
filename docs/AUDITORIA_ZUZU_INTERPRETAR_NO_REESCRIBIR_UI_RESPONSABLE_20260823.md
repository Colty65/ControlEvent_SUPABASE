# Auditoría Zuzu — interpretar, no reescribir · 23/08/2026

## Principio aplicado

Esta versión endurece una regla de arquitectura: la salida semántica de Gemini se conserva como registro del turno y ControlEvent no debe corregirla silenciosamente para hacerla parecer acertada.

Se separan tres niveles:

1. `geminiPlan`: salida bruta de Gemini.
2. `normalizedPlan`: normalización estructural del registro semántico. Conserva entidades, ámbito, referencias y valores semánticos del turno.
3. `interpretedPlan`: interpretación mecánica para ejecutar en CE. Solo completa detalles físicos derivados de capabilities (por ejemplo, qué columna física representa `amount` o qué rol agrupa un ranking). No se persiste como sustituto del plan semántico.

La ejecución física y el `ANSWER_PAYLOAD` quedan auditables por separado.

## Autoridad de entidades

Se corrigió el fallo observado en la batería humana donde Gemini emitía `person=Vicente` pero un `reuse` del contexto terminaba normalizado como `person=Pocholo`.

Regla vigente:

- una entidad explícita del turno actual nunca es sobrescrita por `reuse`;
- `reuse` solo rellena un slot semántico ausente;
- el contrato indica a Gemini que una entidad heredada debe venir mediante `reuse/from_ref`, no copiada como literal;
- si Gemini emite una semántica equivocada, CE no la corrige a escondidas: la ejecución y la ITV deben hacer visible el fallo.

## ANSWER_BLUEPRINT y ANSWER_PAYLOAD

`ANSWER_BLUEPRINT` pasa a ser acompañamiento verbal, no sustitución de la respuesta factual.

Gemini puede proponer `lead` / `voice_lead` breve y no factual. Se rechaza el acompañamiento si contiene cifras, importes, porcentajes, placeholders, referencias internas o frases de proceso como «comprobando», «analizando» o «voy a consultar».

La respuesta final se compone siempre como:

`[recordatorio histórico] + [lead opcional de Gemini] + [respuesta factual de CE]`

Los antiguos `template`, `yes_template`, etc. se conservan solo por compatibilidad/auditoría y ya no reemplazan el hecho calculado.

`ANSWER_PAYLOAD` sigue siendo el contrato factual que permite certificar `amount`, `who`, `what`, `whether`, `which_event`, `compare`, etc.

## Analítica y capabilities

- `rank`, `compare` y `group` reciben detalles físicos mediante capabilities del dominio sin alterar la semántica.
- CE ya no inventa los sujetos de `compare` cuando Gemini no los ha interpretado.
- se envía a Gemini `RECENT_HOMOGENEOUS` para que expresiones como «los dos» puedan resolverse de forma explícita en el plan.
- `amount` / `units` pueden traducirse mecánicamente a las columnas físicas del DATASET mediante roles, sin reglas específicas por nombre de persona/evento/producto.
- el esquema canónico del DATASET ya no depende de que existan filas: un DATASET `purchases` con cero filas sigue conociendo sus campos de negocio.

## ITV / oráculo

El oráculo contrasta ahora también la entidad física ejecutada y el `ANSWER_PAYLOAD`. Un caso como:

- esperado: Vicente
- plan: Vicente
- `ANSWER_PAYLOAD.subject`: Pocholo

se clasifica KO.

También se mantiene la comprobación de dominio/ámbito/filas/campos/gráfica físicos y de la presencia del payload factual requerido por el tipo de respuesta.

## COMPRAS y DONACIONES — mantenimiento

El origen del desplegable Responsable no se modifica: sigue usando la lista correcta de socios individuales y parejas ya validada por el usuario.

Se cambia solo la composición visual de edición en escritorio:

- Responsable baja a una segunda fila;
- comienza a la izquierda;
- gana anchura suficiente para leer el valor seleccionado;
- los botones de mantenimiento ocupan el resto de la segunda fila;
- en móvil se conserva la composición vertical existente.

## Pruebas ejecutadas

- `npm run test:zuzu-answer-blueprint` → OK
- `npm run test:zuzu-ledger-fixes` → OK
- `npm run test:compras-donaciones-maintenance` → OK
- `npm run test:zuzu-itv-oracle` → OK, incluido caso Vicente esperado / Pocholo ejecutado = KO
- `npm run test:zuzu-history-ranking` → OK
- `npm run test:zuzu-router:observed` → OK
- `npm run test:zuzu-router:dry` → 100 mensajes OK
- sintaxis JavaScript global → 239 ficheros OK

No se pudieron ejecutar las suites que importan el runtime completo (`test:zuzu-ledger`, `test:zuzu-invariants`) porque el ZIP de trabajo no incluye `node_modules` completos y la instalación offline no dispone de todas las dependencias. No se ha simulado ese resultado como OK.

No se ha realizado una llamada real a Gemini desde este entorno. Las baterías FULL-CERT deben volver a ejecutarse en el despliegue para comprobar la interpretación real del nuevo contrato.

## SQL

No hay SQL nuevo en esta modificación.
