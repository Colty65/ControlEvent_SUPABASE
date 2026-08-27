# ControlEvent v4_0_exp · MEMORY FLASHBACK + TK En curso

Fecha: 27/08/2026

## Cuadre Banco
- Se conserva íntegro el cuadre multievento RAW14W.
- El selector de TKxx muestra exclusivamente tickets pagados de eventos cuyo estado real es `En curso`.
- Orden operativo: importe descendente, después evento y número de TK.
- Los vínculos históricos ya existentes de eventos finalizados permanecen en BBDD y no se eliminan al editar un movimiento, aunque queden ocultos en el selector.

## Zuzu · borrador manual
- Desde el primer carácter escrito, el texto pasa a ser `MANUAL_DRAFT` y queda bajo propiedad del usuario.
- Rearmes de voz, callbacks tardíos y renderizados no pueden vaciar ni sobrescribir el borrador.
- El borrador se conserva en `sessionStorage` y solo se limpia al enviar correctamente o mediante limpieza explícita / «Borra texto».

## Zuzu · MEMORY EVIDENCE / FLASHBACK
- Un recuerdo explícito presenta primero la evidencia que produjo el match: fecha, pregunta histórica y extracto de la respuesta histórica.
- Se persiste `MEMORY_ANCHOR` = conversation_id + turn_id exacto.
- «Sí, esa» recupera por defecto la respuesta histórica de ese punto.
- «Qué me dijiste/pregunté exactamente» recupera texto literal.
- «Ponme la conversación completa» reconstruye localmente todas las preguntas/respuestas sustanciales y marca con ★ el turno ancla.
- «Retómala» trabaja por tramos temáticos; «sigue» avanza al siguiente tramo.
- «Hazla entera» conserva la reejecución de episodio completo.
- «Cómo está ahora / actualízalo» reejecuta el PLAN del ancla contra CE actual.
- «Compáralo con ahora» separa snapshot histórico y ejecución vigente.
- Procedencia autoritativa: HISTORICAL_LITERAL, HISTORICAL_SNAPSHOT, HISTORICAL_EVIDENCE, HISTORICAL_TRANSCRIPT, HISTORICAL_REPLAY, CURRENT_REEXECUTION, HISTORICAL_VS_CURRENT.

## Event Coverage
- Para información general de evento se genera una cápsula narrativa compacta obligatoria con Descripción y hasta tres DOCxx relevantes.
- El redactor debe integrar una idea concreta de Descripción y, si existen, una referencia documental antes o junto a los KPI.
- Se mantienen límites de arrays/contexto para no disparar consumo de tokens.

## Versión
- Identidad activa: `v4_0_exp` / `ControlEvent v4_0_exp` / `ControlEvent_v4_0_exp`.
- `package.json`: `controlevent-v4-0-exp`, `4.0.0-exp.0`.
- INFOEVENTO, BACKUP, servidor, cliente, PWA, trazas, nombres de descarga y claves activas migrados a v4_0_exp.
- Se conserva reconocimiento de claves v3 únicamente como compatibilidad de migración/limpieza, nunca como versión activa.
