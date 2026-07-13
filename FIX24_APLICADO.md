# ControlEvent v20_prod · FIX24

Cambios aplicados sobre FIX23:

1. Desplegable de eventos estable:
   - conserva el orden correcto visto al entrar desde login,
   - vuelve a aplicar ese orden tras seleccionar un evento y abrir de nuevo el desplegable,
   - mantiene estilos de En curso / Finalizado.

2. AVANCE DEL EVENTO:
   - COMPRAS clasifica como Pte. compra toda compra sin TKxx/gasto corriente/donación, corrigiendo eventos donde todo está pendiente.
   - INFO SOCIOS incluye grupos con " y " y excluye socios individuales que ya estén representados dentro de esos grupos.

No se han tocado login, descuentos, Vista aérea, Zuzu, ingresos ni descargas.
