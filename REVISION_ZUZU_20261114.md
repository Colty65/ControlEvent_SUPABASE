# ControlEvent v6_1-exp — Ajustes Zuzu (14/11/2026)

## Cambios
- Idioma de salida: se refuerza el uso del idioma de sesión (`es-ES`) en el contrato de decisión y en la fase de síntesis, sin traducir los valores literales certificados.
- Alcance: los `FETCH` de entidades con campo `event_id` se limitan por defecto al evento seleccionado **antes** de aplicar filtros posteriores y el límite de lectura directa. Una condición explícita de `event_id` del pipeline permite consultar otro evento.
- Semántica declarativa: `purchases.status = PENDING` indica compra prevista y `REALIZED` compra realizada. Si un evento no tiene compras previstas, se devuelve un conjunto vacío certificado; no se muestra el exceso de datos global como si fuese del evento.
- No se modifican datos ni asociaciones de Supabase.

## Pruebas locales
- 4/4 pruebas específicas de ámbito de evento y pautas de idioma.
- 31/31 pruebas de conciliación multievento.
- Auditoría de ausencia de reglas lingüísticas fijas: OK.
- Revisión de sintaxis: OK.

## Pendiente de verificación real
- Confirmar que Gemini sigue las instrucciones de idioma al responder y que consulta el estado PENDING para las compras previstas del evento en un caso real. No se ha accedido a credenciales ni datos privados del usuario.
