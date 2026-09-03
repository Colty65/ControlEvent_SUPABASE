# ControlEvent v4_0_exp · Liquidaciones de Compras V1

## Objetivo

Registrar y cerrar liquidaciones de efectivo entre la persona responsable de la caja de la Peña y las personas responsables de compras de un evento, vinculando los TKxx justificativos sin crear ni modificar conciliaciones bancarias.

## Acceso

En la ventana **COMPRAS**, botón **[Liquidaciones]** situado inmediatamente a la derecha de **[Responsables / PDF]**.

## Modelo económico

Debe/Haber se interpreta siempre desde la caja de la Peña:

- **DEBE**: sale dinero de la caja de la Peña hacia la persona responsable de compras.
- **HABER**: entra dinero en la caja de la Peña desde la persona responsable de compras.
- **TKxx**: facturas/tickets aportados por la persona responsable.

Saldo de la liquidación:

`DEBE - HABER - TKxx`

- `0`: liquidación cuadrada.
- positivo: la persona debe devolver ese importe a la Peña.
- negativo: la Peña debe abonar ese importe a la persona.

Ejemplo: DEBE 200 €, TKxx 187 €, HABER 13 € = 0 €.

## Personas

- Responsable de caja: solo personas con rango **SOCIO**. Por defecto se selecciona **Colty** si existe.
- Persona destino/contraparte: debe figurar como responsable de al menos una compra no donada del evento. Si cambia el responsable de las compras, el desplegable se actualiza con esa asignación.

## TKxx elegibles

Se ofrecen únicamente TKxx:

1. del evento activo;
2. cuyas líneas de compra pertenecen a una única persona responsable y esta coincide con la contraparte de la liquidación;
3. que no formen parte ya de otra liquidación;
4. que no estén apareados en `ce_bank_ticket_links`.

La V1 **solo consulta** el Cuadre Banco. Nunca crea, modifica ni elimina vínculos bancarios.

## Estados y permisos

- Los movimientos nuevos nacen **ABIERTA**.
- Al confirmar **[Liquidar transacción/es]**, los movimientos seleccionados y sus TKxx forman una liquidación histórica **CERRADA** y se abre el justificante imprimible/PDF.
- Una liquidación cerrada es inmutable.
- GD/RW pueden reabrirla; solo después de reabrir se pueden modificar sus movimientos y volver a cerrarla.
- RO puede consultar histórico y PDF, pero no añadir, modificar, borrar, cerrar ni reabrir.
- Una liquidación agrupa una única pareja `responsable de caja ↔ responsable de compras`; no mezcla destinos distintos en el mismo documento.

## PDF

El justificante contiene evento, código de liquidación, personas, movimientos Debe/Haber, observaciones, TKxx, totales, resultado y firmas. Usa el diálogo de impresión del navegador, igual que otros PDFs operativos de ControlEvent.

## Supabase

Antes de usar el módulo hay que ejecutar una vez:

`sql/ControlEvent_SQL_V4_0_EXP_LIQUIDACIONES_COMPRAS.sql`

Crea:

- `ce_purchase_settlements`
- `ce_purchase_cash_movements`
- `ce_purchase_settlement_tickets`

El índice único `(event_id, ticket_code)` evita que un mismo TKxx se liquide dos veces en el mismo evento.

## BACKUP / RESTORE

El BACKUP incorpora tres hojas:

- `LIQUIDACIONES`
- `LIQUIDACION_MVTOS`
- `LIQUIDACION_TK`

La restauración integral recrea primero las cabeceras y después movimientos/TKxx, respetando las referencias. Si el SQL aún no está instalado, la exportación no rompe el resto del BACKUP: deja hojas AVISO para el módulo.

## Fuera de alcance V1

No se conecta todavía el cierre de la liquidación con el acto de conciliación bancaria. Una futura versión podrá permitir que cerrar/aprobar una liquidación aparee sus TKxx con el movimiento bancario correspondiente, pero esa automatización queda deliberadamente fuera de esta versión.
