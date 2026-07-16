# ControlEvent v22_prod · FIX11 aplicado

Correcciones aplicadas sobre FIX10 tras validación en pantalla:

1. Zuzu / extracción de contexto:
   - Las preguntas de valoración o relato de un evento (“qué tal fue el evento…”, “cómo fue…”, “dime cositas…”, “háblame de este evento”, “resumen/balance/informe del evento”) fuerzan contexto completo del evento: EVENTOS, INGRESOS, COMPRAS, DONACIONES, TICKETS y DOCUMENTOS.
   - Evita que una pregunta por gastos del evento se responda sin INGRESOS por no haberlos extraído.
   - Se acortan los tiempos máximos de llamada narrativa para que Vercel pueda devolver fallback antes de un FUNCTION_INVOCATION_TIMEOUT.

2. Vista aérea:
   - La casa estándar apunta al overlay real ceMapaGlobalOverlay y vuelve al inicio del modal.
   - Las fichas superiores quedan con fondo más translúcido y borde/sombra más finos.

3. Descargas:
   - Ingresos: ING-Evento-Colaborador.jpg.
   - Documentos: DOC-fechaDOC-texto.jpg.
   - Tickets: TKxx-Evento-Tienda.jpg.
   - Se ha cambiado en los módulos que crean la descarga, no solo interceptando el click del enlace.

4. INGRESOS:
   - Guardado de modificación de ingreso con protección local durante el refresco de /api/state, para que no vuelva a pintarse la versión antigua y no haya que guardar dos veces.

5. Caché navegador:
   - index.html y public/index.html actualizados con sufijo FIX11 en los scripts tocados.

Comprobaciones realizadas:
- node --check en servicios y scripts modificados.
- Verificación local de plan Zuzu: “QUE TAL FUE EL EVENTO …” devuelve módulos EVENTOS, INGRESOS, COMPRAS, DONACIONES, TICKETS y DOCUMENTOS.
