# ControlEvent v4_1_exp · BANK3

## Evolución temporal del saldo
- Cabecera estable en PC: el inspector del punto y las miniaturas ya no cambian la altura ni desplazan las gráficas.
- Botón «Ver movimientos» en el histórico superior.
- Consulta bancaria a pantalla completa, inicialmente Fecha descendente.
- Orden por Fecha, Concepto, Importe y Saldo.
- Cabecera con icono bancario, cuenta/IBAN y rango histórico.
- Cada movimiento muestra fecha de operación/valor, concepto, importe, saldo y TKxx vinculados.
- TKxx históricos en miniatura; clic abre el visor contable/fotográfico existente.
- `balanceTimeline` transporta únicamente metadatos de vínculos TKxx; no cambia la imputación multievento.

## Compras / Donaciones por responsable
- Botón «Responsables / PDF» en Compras y Donaciones.
- Agrupa por responsable y muestra detalle por línea.
- Compras: Tienda, Producto, Uds., Precio, Importe.
- Donaciones: Origen/Tienda, Producto, Uds., Precio, Valor estimado.
- Total por responsable.
- PDF/impresión por responsable o de todos los responsables.

## Compatibilidad
- Sin SQL nuevo.
- Conserva BANK2 y RAW14W multievento.
- Conserva MEMORY FLASHBACK y EVENT COVERAGE de v4_1_exp.
