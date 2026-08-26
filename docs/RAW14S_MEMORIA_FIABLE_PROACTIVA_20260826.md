# ControlEvent v3_0_exp · RAW14S · Memoria fiable + proactiva humana

Fecha: 26/08/2026

## Motivo

Las pruebas RAW14R demostraron que la recuperación episódica funcionaba cuando encontraba un puntero correcto, pero también mostraron fallos de disponibilidad y de enrutamiento: recuerdos recientes no aparecían, una PERSON podía convertirse erróneamente en target_ref, «hace unos minutos» no abría la búsqueda histórica, «vuelve a revisarla» abría memoria cuando debía revisar CURRENT y el payload proactivo perdía human_intro antes de la redacción final.

## Cambios RAW14S

- El índice ce_meta deja de ser autoridad exclusiva: se reconcilia con una ventana reciente de ce_zuzu_conversations/ce_zuzu_turns en cada búsqueda y se deduplica por turn_id.
- Se reproyectan los turnos con las reglas actuales para recuperar entidades plurales people/responsibles/donors/stores/tickets.
- Se añaden referencias temporales humanas: hace unos minutos, hace un rato, hace unas horas, últimamente, recientemente y hace poco.
- Las búsquedas recientes reciben un bonus de recencia para que «últimamente» prefiera conversaciones realmente recientes.
- Se elimina el falso disparador histórico genérico de «vuelve a ...»: «vuelve a revisarla» significa revisar CURRENT salvo referencia explícita al pasado.
- «recordado», «recuerdo(s)», «hemos estado hablando hace unos minutos» y «esa conversación» pueden activar recuerdo.
- La palabra «memoria» aislada (p. ej. «prueba de memoria») no abre por sí sola una búsqueda histórica.
- La proactividad aumenta ligeramente su sensibilidad cuando coinciden entidades y el recuerdo es reciente.
- v75MemoryEpisodeCompact conserva age_band, age_days, age_label, human_intro y match para que las frases humanas lleguen realmente al final writer.
- Nuevo guard: recall_episode/resume_episode rechazan IDs de PERSON/EVENT/STORE/PRODUCT como target_ref.
- El compilador distingue explícitamente revisión de CURRENT frente a recuerdo histórico.
- Las frases meta comprensibles sobre memoria, pruebas, respuestas o quejas no se clasifican como VOICE_NOISE.
- «Dame detalle de esa conversación» vuelve al episodio recordado en CURRENT y no al dataset operativo anterior.

## Micrófonos

No se ha modificado el lifecycle del micrófono en RAW14S. Se mantiene el foco solicitado en memoria.

## Regresiones

- RAW14S memoria fiable/proactiva: 33/33
- RAW14Q memoria episódica: 33/33
- RAW14R memoria proactiva humana: 15/15
- RAW14K coherencia temporal/multientidad: 21/21
- history ranking: OK
- node --check en los dos servicios modificados: OK

No se requiere SQL adicional respecto a RAW14Q.
