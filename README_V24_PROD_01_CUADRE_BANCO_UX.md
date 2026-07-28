# ControlEvent v24_prod-01 · Cuadre Banco

## Cambios de esta revisión

- La entrada **Cuadre Banco** abre la ventana directamente desde la primera pulsación. El icono queda excluido del sistema general de globos informativos.
- Se recupera en la cabecera, junto al icono CE, la versión compacta `v24_prod-01`.
- La ficha inicial de ColtyLAB añade **Cuadre bancario** dentro de **Operativa**.
- Rediseño integral de Cuadre Banco con estética de centro de control financiero: saldo orbital, flujo de entradas y salidas, cronología bancaria, progreso visual de justificación y selector de TKxx renovado.
- El acceso continúa siendo exclusivo para usuarios GD.

## Antes del primer uso

Ejecutar en **Supabase > SQL Editor** el fichero:

`ControlEvent_SQL_V24_PROD_CUADRE_BANCO.sql`

## Funcionalidad bancaria

- Importación acumulativa de CSV bancarios, omitiendo movimientos repetidos.
- Inclusión o exclusión individual de cada movimiento en el cálculo del saldo.
- Justificación de reintegros y salidas mediante uno o varios TKxx pagados.
- Un mismo TKxx no puede justificar dos movimientos distintos.
- Estados visuales: sin justificar, pendiente, cuadrado y exceso.
- Integración de Cuadre Banco en INFOEVENTO y BACKUP.
