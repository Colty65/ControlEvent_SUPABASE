# CE v17_prod FIX31 - Planificación inicial con Brief estructurado + Gemini

Base: FIX30_PLANIFICACION_GEMINI_MENU_LIBRE.

Cambios limitados a Planificación inicial / Encargo total a Zuzu:

- Corregida detección de duración: ahora reconoce correctamente `Duración del evento: 3 días` y líneas `Dia 1`, `Dia 2`, `Dia 3`.
- Añadido Brief estructurado del evento antes de llamar a Gemini: duración, asistentes, presupuesto, calor, momentos por día, horarios, cerveza, cubatas, cena real, reglas de comida/bebida y donaciones detectadas.
- Gemini recibe el prompt original completo + el Brief cocinado por ControlEvent.
- `Diagnosticar prompt` muestra el Brief que se enviará a Gemini.
- `Usar diagnóstico como propuesta` ya no crea una propuesta local de 1 día: llama a la misma ruta backend/Gemini que `Generar propuesta`.
- Se conservan propuestas libres de Gemini aunque el producto no coincida exactamente con PRODUCTOS; se muestran como revisables en lugar de descartarlas.
- Se elimina el límite fijo de 35 €/persona cuando el prompt trae presupuesto/límite propios.
- Respuesta devuelve `menuResumen` por día/momento y `briefEvento` para depuración.

No se han tocado GRAFICAS, RESUMEN PRESUPUESTARIO, globos, fotos, login ni módulos normales de compras/donaciones.
