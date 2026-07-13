# ControlEvent v20_prod · FIX23

Cambios mínimos sobre FIX22:

1. Selector de eventos
   - Se fuerza el orden por fecha de inicio también después de seleccionar/cambiar evento.
   - Los eventos En curso se pintan en verde.
   - Los eventos Finalizado se mantienen en rojo.
   - No se toca login ni se añaden precargas.

2. Avance del evento
   - Se usa el globo ligero activo del logo ColtyLAB.
   - Se quita la numeración 1·, 2·, etc.
   - Nuevo orden:
     INGRESOS,
     JUSTIFICANTES DE INGRESOS,
     DONACIONES,
     COMPRAS,
     JUSTIFICANTES DE COMPRA,
     DOCUMENTOS,
     INFO SOCIOS.
   - COMPRAS separa TKxx/Gastos corrientes y Pte. compra.
   - INFO SOCIOS usa la lista de socios filtrada por rango='SOCIO' excluyendo z_DEV%, Grupo%, Peña% y nombres con ' y '.
   - Socios asistentes en verde y no asistentes en rojo.

No tocado: login, ingresos, Vista aérea, descuentos, Zuzu, descargas, cálculos generales.
