# ControlEvent v20_prod FIX21 - iPhone avance, inicio limpio y doble toque móvil

Base: CE_v17_PROD_FIX20_CIERRE_IPHONE_RESUMEN_MOVIL.zip

Cambios aplicados:

1. AVANCE DEL EVENTO en iPhone
   - El globo activo real es `ceV16Hf5AvanceLayer`, no `ceHf48AvanceLayer`.
   - Se ha conectado el botón circular superior derecho `.ce-v16hf5-close` a `touchstart`, `touchend`, `pointerdown`, `pointerup`, `mousedown`, `mouseup` y `click` en captura.
   - Al pulsar el círculo superior derecho debe cerrarse igual que en Android.

2. Inicio limpio tras login, antes de elegir evento
   - Mientras el usuario está logado pero no hay evento válido elegido se ocultan:
     - menú superior de pestañas,
     - footer inferior,
     - secciones de trabajo,
     - mantenimiento.
   - El selector de evento queda visible para elegir evento.
   - Al seleccionar evento se quita automáticamente el bloqueo visual y se muestran las opciones según permisos.

3. Por tienda y Ticket en iPhone/Android
   - Solo en móviles tipo iPhone/Android, el texto de cada fila necesita doble toque para abrir el globo.
   - La miniatura y los botones de foto siguen funcionando con una sola pulsación.
   - Esto evita que al cerrar una foto ampliada se abra sin querer el globo de una fila situada debajo.

4. Rendimiento
   - Se ha reducido el observador del parche móvil para reaccionar solo ante cambios relevantes: resumen, avance o miniaturas.
   - No se han tocado cálculos, ordenaciones, fotos, permisos ni visor de detalle.

Archivos modificados:
- public/app/features/v17-fix19-touch-close-graphs.js
- public/index.html
- index.html
