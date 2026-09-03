# ControlEvent v4_1_exp · VNext P1.23
## Dialogue State Authority + ITV conversacional adaptativa + guardia PDF · NHC

### Motivo
GOLDEN 110 certifica muy bien capacidades aisladas, pero no demuestra por sí solo que Zuzu mantenga una conversación larga. Las pruebas reales mostraron pérdida de foco, aclaraciones repetidas, promesas sin ejecución, desvíos desde una tabla activa y exportaciones PDF que en algunos casos reducían una conversación larga a un único turno.

P1.23 no añade otra colección de frases. Introduce autoridad de estado conversacional y una ITV donde el usuario sintético decide su siguiente intervención **después** de leer la respuesta real de Zuzu.

### 1. DIALOGUE_STATE autoritativo
Se mantiene un estado estructurado con:
- `active_focus`
- `active_object`
- `pending_intent`
- `last_successful_action`
- `last_user_goal`
- `artifact_visible`

El estado anterior válido tiene prioridad frente a reconstrucciones accidentales desde fragmentos antiguos del historial.

### 2. PENDING_INTENT
Una aclaración ya no reinicia la petición. Si falta información, la petición pendiente conserva herramienta, operación, argumentos conocidos, sujeto, objetivo y campos faltantes. El turno siguiente completa ese contrato en lugar de empezar desde cero.

### 3. ACTIVE_OBJECT / autoridad de continuidad
Cuando existe un objeto activo (dataset, episodio de memoria, persona o evento), una continuación compatible debe operar sobre él. Para abandonar deliberadamente el foco Gemini debe declarar estructuralmente `change_focus=true` o un `focus_mode=replace` coherente.

Esto no interpreta castellano en CE: compara tipos, entidades, operaciones y estado JSON.

### 4. NO EMPTY PROMISE
Si existe una intención pendiente accionable y Gemini devuelve texto sin ejecutar la herramienta correspondiente, VNext hace un único reintento de decisión. La instrucción de sistema prohíbe respuestas de transición que prometan buscar datos después sin haber ejecutado la acción en el mismo turno.

### 5. Filas reversibles
La vista añade:
- `remove_view_filters`: retira filtros concretos y reincorpora filas.
- `reset_filters`: recupera todas las filas preservando columnas y orden.

Por tanto quitar y volver a poner filas deja de depender de reconstruir el dataset desde cero.

### 6. ITV `DIÁLOGO · 24`
No es una lista de 24 preguntas prefijadas.

- Solo el primer mensaje está fijado como semilla.
- Zuzu responde de verdad.
- Después, un usuario sintético separado recibe la conversación real + `DIALOGUE_STATE` y genera el siguiente mensaje.
- Si Zuzu cambia inesperadamente el foco, el usuario sintético puede seguir ese foco, corregirlo, aclararlo, bromear, volver atrás o manipular el objeto activo según resulte natural.
- No existe un orden obligatorio de movimientos.
- Los 24 registros de ITV son **slots de una única conversación**, no 24 casos independientes.

El usuario sintético también evalúa el turno anterior:
- coherencia con el hilo;
- conservación de foco;
- promesa vacía;
- necesidad de herramienta no ejecutada.

Métricas específicas:
- continuidad del hilo (`HILO %`);
- roturas de foco;
- promesas vacías;
- acciones sin herramienta;
- cambios de foco.

### 7. Exportación PDF: guardia contra conversación reducida a 1 turno
La sincronización con servidor ya no sustituye el historial local por una respuesta parcial. Se hace unión por `turnId` y se conserva el historial más rico. Antes de abrir el selector PDF se toma además un snapshot: una sincronización parcial nunca puede reducir el número de turnos exportables.

### 8. NHC
Las decisiones nuevas de P1.23 trabajan con estado, tipos, operaciones, IDs, entidades y JSON. No se añaden reglas runtime para nombres o frases concretas de las pruebas.

Importante: el runtime contiene capas lingüísticas heredadas de versiones anteriores. P1.23 no afirma que todo el código histórico sea libre de heurísticas; afirma que **esta ampliación no añade hard-code lingüístico nuevo**.

### 9. Cómo probar
Primera prueba recomendada: `DIÁLOGO · 24` en FULL-CERT. Observar los primeros 3–4 turnos para confirmar latencia normal y dejar terminar la conversación si se mantiene estable. Exportar `JSON LIGHT`, que incluye la intervención sintética, la evaluación del turno y las métricas conversacionales.

GOLDEN 110 se mantiene como cinturón de regresión de capacidades, no como certificación de conversación humana.
