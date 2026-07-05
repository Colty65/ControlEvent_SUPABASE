# ControlEvent v18_prod - FIX6 visor fotos Cálculos

Sin cambio de versión visible.

## Cambios
- Se mantiene FIX5 como base porque clip/papelera y miniatura ya funcionan.
- Se corrige el visor ampliado de tickets: si se pincha una miniatura de Cálculos, el modal abre exactamente `img.currentSrc/img.src`, no vuelve a buscar una URL antigua por TKxx.
- Se desactiva el hidratador legacy `v8-4-ticket-images-visible-after-event.js` para evitar rehidrataciones antiguas, renderBudget repetidos y recuperación de URLs viejas.
- Se corta la ráfaga de hidratación de Resumen de `v10-4-app-fixes` cuando está activo el controlador v17 de Cálculos.

## Prueba recomendada
1. Desplegar.
2. Ctrl+F5.
3. Abrir el evento problemático.
4. En Resumen > Cálculos, pinchar la miniatura de TK02.
5. La ampliación debe enseñar la misma foto que la miniatura.
