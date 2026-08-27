# ControlEvent v4_0_exp · Auditoría ANSWER_BLUEPRINT + ANSWER_PAYLOAD

Fecha: 23/08/2026

## Objetivo

Mejorar la naturalidad de Zuzu sin añadir una segunda llamada a Gemini y sin trasladar a la IA la verdad factual de la respuesta.

Principio de reparto:

- Gemini interpreta el turno y, en la misma llamada, puede proponer un `answer_blueprint` breve.
- ControlEvent ejecuta la consulta/operación, construye un `ANSWER_PAYLOAD` únicamente con hechos reales y rellena el molde.
- Si el molde no es seguro, está incompleto o pide un dato que CE no tiene, se descarta y se usa la redacción determinista anterior.

## Cambios implementados

### 1. Contrato Gemini

`zuzu_turn_record` admite ahora `answer_blueprint` con:

- `template`
- `yes_template`
- `no_template`
- `empty_template`
- `voice_template`

No se crea ninguna llamada IA adicional. `v73CompileTurn` sigue realizando una única interpretación IA por turno.

### 2. Placeholders permitidos

`amount`, `count`, `person`, `product`, `event`, `scope_text`, `people`, `items`, `events`, `subject`, `winner`, `winner_value`, `runner_up`, `runner_up_value`, `difference`, `metric`, `summary`, `detail`.

Los moldes con placeholders desconocidos, referencias a JSON/SQL/Gemini/herramientas internas, cifras, euros o porcentajes se descartan. Para tipos de respuesta factuales se exige además un placeholder compatible con el tipo (`amount` debe incluir `{amount}`, etc.).

### 3. ANSWER_PAYLOAD factual

CE construye después de ejecutar un payload factual por turno. Ejemplos:

- `amount`: importe numérico y formateado.
- `who`: personas materializadas.
- `what`: elementos/productos materializados.
- `whether`: booleano real y sujeto.
- `which_event`: evento(s) materializados.
- `compare`: ganador, segundo, métrica y diferencia cuando son calculables.
- `context` / `conversation_summary`: resumen determinista.

En `whether`, si existe una entidad concreta, CE verifica su presencia en el campo tipado del DATASET; no considera automáticamente verdadero un resultado solo porque el DATASET tenga filas.

### 4. Persistencia y auditoría

El PLAN inmutable conserva `answer_blueprint`. La ejecución conserva:

- `answer_payload`
- `answer_blueprint`
- `answer_blueprint_used`

`ledgerAudit.execution` expone esos valores a ITV.

### 5. ITV

El oráculo estructural usa `ANSWER_PAYLOAD` cuando existe un `expectedResponseKind`:

- `amount` exige valor numérico factual.
- `whether` exige booleano factual y coherencia de sujeto cuando hay entidad esperada.
- `who`, `what`, `which_event`, `compare`, `context` y `conversation_summary` comprueban que el payload contiene la evidencia semántica necesaria.

Esto impide que una frase con apariencia correcta pase como OK si CE no materializó el dato requerido.

### 6. Recall

Al restaurar un snapshot con DATASET se regenera la respuesta factual desde los datos, en vez de reutilizar una respuesta histórica ya envuelta. Para registros sin DATASET se elimina cualquier prefijo `Ahora recuerdo...` previamente persistido antes de añadir el nuevo recordatorio. Se evita así la duplicación acumulativa del preámbulo histórico.

## Validación realizada

- `node --check` sobre todos los JavaScript del proyecto: OK.
- Prueba aislada con el código exacto de las funciones nuevas: OK.
  - acepta molde `amount` con placeholders.
  - rechaza hechos/cifras en el molde.
  - rechaza placeholders desconocidos.
  - inserta importe, producto y evento reales.
  - selecciona rama `yes_template` / `no_template` con booleano factual.
  - comprueba el sujeto real aunque el DATASET tenga filas de otra persona.
  - elimina preámbulos históricos duplicados.
- No se ha podido ejecutar la suite npm completa en este entorno porque las dependencias del proyecto no están instaladas y `npm ci` no pudo completarse dentro del entorno disponible.

## Invariante principal

**Gemini redacta el molde; ControlEvent posee los hechos.**

Un `answer_blueprint` nunca puede sustituir el `ANSWER_PAYLOAD`, cambiar el DATASET ni provocar una segunda consulta a BBDD o una segunda llamada IA.
