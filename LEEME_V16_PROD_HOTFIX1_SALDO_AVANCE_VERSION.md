# ControlEvent v16_prod - HOTFIX1

Base: HOTFIX52.

Cambios aplicados:

1. Versión visible y exportaciones
   - Versión visible cambiada a `v16_prod`.
   - `VERSION`, `VERSION_FILE`, nombre de ventana y etiquetas visibles actualizadas.
   - INFOEVENTO y BACKUP pasan a emitir `ControlEvent_v16_prod` en metadatos/nombres.

2. Planificación inicial / saldo positivo
   - El cálculo de ingresos obligatorios se hace antes de equilibrar saldo.
   - Si `saldo / compras > 35%`, añade compras extra.
   - Mantiene colchón mínimo del 20%.
   - Usa productos del propio evento/propuesta cuando ya existen como donación o compra, y si no, busca en catálogo.
   - Las compras extra se crean como líneas de ajuste separadas, para no marcar ni eliminar compras base al recalcular.

3. Globo AVANCE DEL EVENTO
   - Colores forzados por fila/barra con CSS `nth-child`, para que no vuelvan todas a azul.
   - Cierre más fácil: clic fuera, Escape o scroll.
   - Autocierre más corto.

Prueba recomendada:
- Generar propuesta con ingresos obligatorios y saldo >35%.
- Verificar que aparecen líneas de compra extra y que el saldo queda por encima del 20%.
- Abrir AVANCE DEL EVENTO desde logo ColtyLAB, comprobar colores y cierre.
