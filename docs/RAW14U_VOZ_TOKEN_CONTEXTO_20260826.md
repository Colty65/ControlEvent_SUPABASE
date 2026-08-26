# ControlEvent v3_0_exp · RAW14U · Voz, Token Budget y contexto estricto

Base: RAW14T Memory Core + Experiencia semilla.

## Evidencia de la prueba 26/08/2026 19:10

- Memoria DB: correcta; los candidatos históricos llegan de DB persistente.
- Contexto: tras consultar MUNDIAL 4ºs Final, «quién fue a comprar» saltó indebidamente a FUNCION 2026.
- Memoria: tras recordar Cordo, «vuelve a consultarlo ahora» reejecutó el CURRENT en vez del matched_turn_id histórico.
- Comparativa: «en qué evento consumimos más cerveza» heredó un evento en vez de comparar todos.
- Voz: el fragmento «zu» llegó a Gemini y abrió una consulta real.
- Ordenación: la respuesta dijo «de mayor a menor» sin existir operación sort; la lista no estaba ordenada.
- Operaciones: field_name emitido por Gemini se perdía al normalizar remove_field.
- Redacción: una petición narrativa de FUNCION 2026 acabó demasiado inventariada.
- Coste: 14 turnos / 30 llamadas / 299.084 tokens. El resumen de esta conversación y el acuse final consumieron juntos 43.660 tokens aunque son resolubles en local.

## RAW14U

### Voz
- Barge-in usa hasta 5 alternativas ASR.
- Detección tolerante a una desviación corta en «Perdona/Espera».
- La cola «Zuzu/azu/zu» se elimina antes de reabrir la escucha.
- «zu» y residuos equivalentes se descartan localmente y no llegan a Gemini.
- «sí/no/ok/vale» y elecciones numéricas cortas siguen siendo respuestas válidas.

### Carrusel
- Banco activo NUEVO de exactamente 100 frases únicas.
- Variables locales: usuario, nombre, mes, día de semana, año, fecha, hora, momento del día.
- Baraja persistente v44: no se repite una frase hasta agotar las 100.
- Intervalo: 2,5 s DESPUÉS de terminar la frase anterior (evita amontonar voz).
- Si llega la respuesta mientras habla una frase, esa frase termina; luego entra Zuzu.

### Contexto y precisión
- Un evento resoluble no puede secuestrar una continuación: el cambio debe estar anclado en CURRENT_USER.
- Superlativos «en qué evento ... más/menos» fuerzan comparación entre eventos y agrupación/ranking por Evento.
- Orden explícito obliga a materializar sort/rank.
- «reconsultarlo/actualízalo ahora» tras un recuerdo reejecuta el matched_turn_id.
- field_name se conserva al normalizar operaciones locales.
- Petición de redacción/relato/crónica se presenta como prosa cohesionada.

### Token Budget
- Compilador: recent refs 6→4; diálogo 4→2; candidatos históricos enviados 8→5; entidades 12→8.
- Fase final: turnos recientes 6→3; muestra de filas 18→12; episodios compactados.
- «Resume esta conversación» se resuelve por Ledger sin buscar memoria histórica y sin llamadas IA.
- Acuses breves («OK / gracias / muy bien») se resuelven enteramente en local sin llamadas IA.

No hay cambios de esquema SQL respecto a RAW14T.
