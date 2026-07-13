# v20_prod FIX46 - opciones de cálculo y traza por fases

Cambios aplicados sobre FIX45:

1. Planificación inicial
   - Añadidas dos casillas:
     - Ajuste de compras por saldo.
     - Aplicar topes de producto.
   - Si no están marcadas, ControlEvent no aplica saldo ni topes, y no usa cálculo local de emergencia si Zuzu no devuelve necesidades.
   - Si se marcan, el sistema aplica esos ajustes al reejecutar la planificación.

2. Trazabilidad
   - La traza muestra fases separadas:
     - Zuzu / fallback antes de cocinar.
     - Donaciones confirmadas.
     - Déficit base.
     - Topes de producto.
     - Control de coste.
     - Ajuste por saldo.
     - Compra final presentada.

3. Versionado
   - Versión visible: v20_prod_FIX46_OPCIONES_CALCULO_TRAZA.

No se han tocado gráficas, resumen presupuestario, globos ni fotos.
