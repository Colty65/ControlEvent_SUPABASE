# ControlEvent v4_1_exp · BANK4_8 · Zuzu Z1 scope/context + performance

BANK4_8 corrige los fallos estructurales descubiertos por la ITV ORACLE de BANK4_7.

- El normalizador conserva scopes equivalentes emitidos por Interactions (`event`, `events`, `global`, `conversation`) y los transforma al contrato canónico sin reinterpretar lenguaje.
- Las operaciones aceptan las variantes físicas `type`, `op` y `operation`, incluyendo `order_by`, `sort`, direcciones `ascending/descending` y `desc` booleano.
- Un scope transitorio vacío/inherit hereda exclusivamente el scope factual de CURRENT_CONTEXT; sin contexto canónico cae a `all_events` y nunca inventa un evento.
- IDs canónicos de personas/eventos/productos/tiendas se reconocen directamente y no vuelven a pasar por fuzzy matching.
- La memoria proactiva queda detrás de un presupuesto duro corto (700 ms por defecto) para evitar colas de 16–17 s en conversación operativa.
- ITV carga también el snapshot bancario de solo lectura cuando está disponible.
- FAST sustituye los dossiers personales exhaustivos de cada una de las 108 personas por escaneo directo de actividad y mantiene watchdog por caso.
- Los cambios puros de contexto se validan contra el ledger interno, por lo que una respuesta humana breve como “Vale.” no se considera fallo si el foco tipado quedó correctamente fijado.
