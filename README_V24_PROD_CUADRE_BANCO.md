# ControlEvent v24_prod-02 · Cuadre Banco

## Antes del primer uso
Ejecutar en **Supabase > SQL Editor** el fichero:

`ControlEvent_SQL_V26_PROD_CUADRE_BANCO.sql`

## Funcionalidad

- Acceso **solo GD** desde el menú inferior y el menú móvil.
- Importación acumulativa de CSV bancarios; los movimientos repetidos se detectan por huella y no se duplican.
- Cuenta movimientos positivos y negativos para obtener un saldo calculado.
- Cada movimiento puede excluirse del conteo sin eliminarlo.
- Los movimientos negativos pueden justificarse con uno o varios **TKxx ya pagados**.
- Un TKxx no puede utilizarse en dos movimientos bancarios distintos.
- Se muestra el importe justificado, lo pendiente o el exceso y el estado «Cuadrado».
- INFOEVENTO añade la hoja `CUADRE BANCO` para los TKxx del evento seleccionado.
- BACKUP añade `BANCO_IMPORTACIONES`, `BANCO_MVTOS` y `BANCO_TK_LINKS`, tanto en la generación principal del servidor como en el respaldo del navegador.
- Versión unificada: `v24_prod-02`.


## Comprobación con el CSV facilitado

El parser ha reconocido **65 movimientos**, sin avisos ni duplicados internos. El saldo inicial inferido (3.440,28 €) más la variación neta de los movimientos (716,31 €) coincide con el saldo final bancario del fichero: **4.156,59 €**. El CSV original no se incorpora al ZIP para no distribuir información bancaria.


## Revisión v24_prod-02

- Apertura directa desde la primera pulsación, sin globo intermedio.
- Versión compacta recuperada junto al icono CE.
- Cuadre bancario añadido a Operativa en la ficha inicial ColtyLAB.
- Nueva interfaz orbital de conciliación bancaria.
