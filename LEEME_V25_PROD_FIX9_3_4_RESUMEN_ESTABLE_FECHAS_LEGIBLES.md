# ControlEvent V25_PROD-FIX9-3-4

Base: `CE_V25_PROD_FIX9_3_3_RETEMBLORES_MINIATURAS_NO_ASISTENTES.zip`

## Cambios incluidos

1. **Resumen Presupuestario sin retemblores**
   - Los eventos de ratón heredados se detienen en `window`, antes de llegar a los manejadores antiguos de `document`.
   - Se eliminan animaciones, transiciones, flechas y atributos de globos heredados sin reconstruir continuamente el DOM.
   - Se mantienen estables `Ingresado socios`, `Ingresado no socios` y `Gastos realizados`.

2. **Cálculos por tienda y ticket estable**
   - V17 sigue siendo el único renderizador de las filas.
   - Las etiquetas completas se restauran en el mismo nodo si un hotfix antiguo intenta truncarlas.
   - Las miniaturas tienen tamaño fijo y carga inmediata para evitar saltos de diseño.

3. **Miniaturas de GASTOS REALIZADOS**
   - La búsqueda consulta directamente el repositorio de imágenes cargado por V17.
   - Las miniaturas usan el mismo atributo y el mismo visor que `GRÁFICAS DEL EVENTO`, incluida la descarga.

4. **Fechas legibles en la gráfica histórica bancaria**
   - El eje X adapta automáticamente la densidad de meses al intervalo histórico.
   - En periodos largos ya no se dibuja una etiqueta por cada mes, evitando que las fechas queden apelotonadas.

Cache-buster: `20260802-V25-PROD-FIX9-3-4-RESUMEN-ESTABLE-FECHAS-LEGIBLES`

## Validaciones realizadas

- Sintaxis correcta en los **125 scripts locales activos** de `public/index.html`.
- Pruebas bancarias completas superadas: periodo inclusivo, integración, interfaz con 5.000 movimientos y CSV amplio con 2.500 movimientos.
- Comprobado que el nuevo hotfix se carga el último, después de todos los módulos legacy y de V17.
- Comprobado que las miniaturas de gastos conservan `data-ce-g92-photo="1"` y resuelven imágenes desde el repositorio V17.
- Comprobado que la gráfica histórica limita dinámicamente las etiquetas mensuales a un máximo legible.
