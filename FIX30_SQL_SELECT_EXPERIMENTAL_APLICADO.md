# FIX30 SQL SELECT experimental

Base: `CE_v22_PROD_BASE_FIX29_PLANIFICADOR_ZUZU.zip`.

Objetivo: probar el flujo pedido por el usuario en el que Zuzu/Gemini no solo decide módulos, sino que puede devolver `SELECTS_PROPUESTOS` para orientar la extracción de ControlEvent.

Cambios:

- Zuzu planificador sigue decidiendo módulos, eventos, personas implicadas y condiciones.
- Se parsea `SELECTS_PROPUESTOS`.
- Solo se aceptan sentencias que empiezan por `SELECT`.
- Se rechazan múltiples sentencias, comentarios, mutaciones y verbos peligrosos: INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE, MERGE, CALL, EXEC, COPY, GRANT, REVOKE, etc.
- No se ejecuta SQL libre contra Supabase.
- Los SELECT válidos se usan como plan/filtro sobre módulos oficiales ya cargados en memoria.
- Se detectan tablas en FROM/JOIN para reforzar módulos.
- Se detectan condiciones simples de estado de ingreso, incluyendo BANCO, EFECTIVO, BIZUM y PENDIENTE.
- Se detectan nombres/personas/responsables/donantes citados en el SELECT como filtros.
- La traza informa cuántos SELECTs han sido validados o rechazados.

Nota: versión experimental para prueba. Si no convence, volver a FIX29 y seguir por el camino de plantillas cerradas.
