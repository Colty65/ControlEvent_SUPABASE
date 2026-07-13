# ControlEvent v20_prod - FIX19 cierre móvil + gráficas

Base: CE_v17_PROD_FIX18_ORDENACION_RENDIMIENTO.zip

Cambios puntuales:

1. Avance del evento
   - El globo se puede cerrar en iPad/iPhone/Android pulsando fuera del globo o el botón Cerrar.
   - El botón del globo se normaliza a "✕ Cerrar" y queda abajo a la izquierda dentro del globo.

2. Visor de tickets desde miniaturas
   - El botón "✕ Cerrar" pasa de abajo derecha a abajo izquierda para evitar tocar otra miniatura al cerrar.
   - Los visores antiguos también se fuerzan a cerrar desde abajo izquierda si aparecen.

3. Miniaturas duplicadas
   - En cada línea de Cálculos por tienda y ticket se conserva una sola miniatura.
   - Si hay duplicado, se prioriza la miniatura que lleva detalle contable de ticket.

4. GRAFICAS
   - Se ocultan las gráficas antiguas de barras para que no se vean durante la primera carga o el cambio de evento.
   - Se mantiene el bloqueo visual hasta que el render V46 de quesos esté disponible.

No se han tocado:
- Fotos/adjuntos de mantenimiento.
- Permisos.
- Zuzu.
- Ordenaciones de datos de FIX18.
- Versión visible, que sigue siendo v20_prod.
