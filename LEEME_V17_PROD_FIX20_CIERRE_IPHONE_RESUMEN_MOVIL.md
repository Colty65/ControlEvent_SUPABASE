# ControlEvent v17_prod - FIX20 cierre iPhone + resumen móvil

Base: CE_v17_PROD_FIX19_CIERRE_MOVIL_GRAFICAS.zip

Cambios puntuales:

1. Avance del evento
   - Se añade un botón flotante "✕ Cerrar" abajo a la izquierda dentro de la capa del avance.
   - Se refuerza el cierre en iPhone con touchstart, touchend, pointerup y click, además del botón existente.
   - Se mantiene el cierre tocando fuera del globo en PC/iPad/Android.

2. Resumen presupuestario / Por tienda y ticket
   - Cambio SOLO en móviles con ancho <= 640px.
   - Cada registro pasa a dos líneas: arriba el texto principal; abajo el importe.
   - A la derecha quedan los botones de adjuntar/eliminar y la miniatura.
   - PC e iPad mantienen el diseño anterior.

3. Se mantiene lo de FIX19
   - Botón cerrar del visor de ticket abajo a la izquierda.
   - Eliminación visual de miniaturas duplicadas.
   - Bloqueo de gráficas antiguas de barras durante la entrada a GRAFICAS.

No se han tocado cálculos, datos, permisos, fotos ni visor de detalle.
Versión visible: v17_prod.
