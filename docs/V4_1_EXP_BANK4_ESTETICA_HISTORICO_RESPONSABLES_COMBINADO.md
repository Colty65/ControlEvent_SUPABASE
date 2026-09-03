# ControlEvent v4_1_exp · BANK4

Remate visual y funcional solicitado el 27/08/2026 sobre BANK3.

## Evolución temporal del saldo
- Cabecera fija y compacta, sin desplazamiento al inspeccionar puntos.
- Icono Eurocaja Rural extraído de la imagen suministrada por el usuario.
- Título `EVOLUCIÓN TEMPORAL DEL SALDO` con mayor jerarquía visual.
- IBAN y rango histórico debajo, en tamaño menor.
- Inspector del movimiento compactado para que entren sus cinco líneas.
- Miniaturas del inspector más próximas al bloque de datos.

## Histórico general de movimientos
- Cabecera `PEÑA EL ARRASTRE` en blanco y con mayor tamaño.
- IBAN y fechas en segundo/tercer nivel visual.
- Icono Eurocaja Rural suministrado por el usuario.
- Se mantienen ordenaciones por Fecha, Concepto, Importe y Saldo; inicial Fecha descendente.
- La columna pasa a denominarse `Justificantes`.
- Cargos: miniaturas TKxx como antes.
- Abonos: se cargan vínculos de ingreso de todos los eventos y se muestran las miniaturas disponibles; al pulsarlas se abre el visor contable.

## Responsables combinados
- Se mantienen Compras / PDF y Donaciones / PDF.
- Nuevo botón en Mapa de recursos y en Vista aérea.
- Por responsable:
  - Compras ordenadas por Tienda + Producto, con total.
  - Línea visual de separación.
  - Donaciones ordenadas por Producto, con valor estimado total.
- PDF individual por responsable y PDF global.

## Regresión
- BANK4: 34/34.
- BANK2 multi-TK: 21/21.
- Cuadre multievento RAW14W: 31/31.
- v4.1_exp Memory Flashback + Bank: 31/31.
- Comprobación sintáctica paralela de JS/CJS/MJS: OK.
