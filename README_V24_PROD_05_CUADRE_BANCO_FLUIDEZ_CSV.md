# ControlEvent v24_prod-05 · Cuadre Banco fluido y carga CSV amplia

## Incidencia corregida

Con periodos bancarios largos, la ventana podía quedar aparentemente bloqueada: no respondían **Cargar CSV**, los desplegables ni la búsqueda. El problema no estaba en los movimientos de 2024, sino en dos trabajos repetitivos de la interfaz:

1. cada pulsación reconstruía simultáneamente todos los movimientos del periodo;
2. un observador general volvía a recorrer los controles de cada fila después de cada reconstrucción.

Además, el selector de archivos podía perder la activación real del clic en determinados navegadores.

## Correcciones

- Paginación de la cronología: **60 movimientos por página**.
- La búsqueda se ejecuta con una pausa breve de 140 ms y no reconstruye miles de filas por cada tecla.
- Los resultados filtrados se memorizan hasta que cambian los datos, el filtro, el orden o la búsqueda.
- Las recargas anteriores se cancelan al cambiar rápidamente de cuenta o fechas; una respuesta antigua ya no puede sobrescribir la selección nueva.
- El observador global ignora los cambios internos de Cuadre Banco.
- `Cargar CSV` abre el selector nativo directamente dentro del clic del usuario.
- El campo técnico oculto del fichero queda fuera de la pantalla y no puede interceptar clics de otros controles.
- Indicador visible durante importación y actualización.
- El servicio construye el catálogo de TKxx únicamente para el evento activo, evitando recorrer compras y asociaciones de todos los eventos en cada cambio de cuenta.
- Deduplicación adicional de movimientos repetidos dentro del mismo CSV.
- Después de importar se informa del periodo contenido en el fichero y se avisa si queda fuera de las fechas visibles del evento.
- Navegación entre páginas con botones, `Av Pág`, `Re Pág`, `Inicio` y `Fin`.

## Carga de movimientos desde enero de 2024

1. Abrir un evento **En curso**.
2. Entrar en **Cuadre Banco**.
3. Pulsar **Cargar CSV** y seleccionar el fichero descargado del banco.
4. En **Fecha inicio bancaria**, indicar `01/01/2024`.
5. Indicar la fecha final deseada y pulsar **Aplicar fechas**.

La importación y la visualización son operaciones distintas: los movimientos se incorporan a la base global, y las fechas del evento determinan cuáles se presentan en esa ventana.

## Supabase

Si ya se ejecutó el SQL incluido con `v24_prod-04`, **no hay cambios de base de datos ni es necesario volver a ejecutarlo**. Para una instalación anterior a v24_prod-04, debe ejecutarse `ControlEvent_SQL_V26_PROD_CUADRE_BANCO.sql`.

## Archivos principales modificados

- `app/features/v24-cuadre-banco.js`
- `public/app/features/v24-cuadre-banco.js`
- `app/styles/cuadre-banco.css`
- `public/app/styles/cuadre-banco.css`
- `services/bank-reconciliation.service.js`
- `index.html`
- `public/index.html`
- `package.json`
- `package-lock.json`
- `scripts/test-bank-reconciliation-v24-5-ui.js`
- `scripts/test-bank-reconciliation-v24-5-large-csv.js`

## Comprobaciones

- Sintaxis JavaScript con `node --check`.
- Regresión de periodo inclusivo, cargos, abonos, saldo inicial/final y estado por evento.
- Integración simulada de Supabase.
- Verificación estática del selector CSV, cancelación de peticiones, búsqueda diferida y paginación.
- Prueba generada con **2.500 movimientos bancarios desde el 1 de enero de 2024**.
