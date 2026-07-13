# ControlEvent v20_prod - HOTFIX Cálculos FIX9

Sin cambio de versión visible: sigue `v20_prod`.

Cambios:

1. **GASTOS CORRIENTES**
   - Deja de tratarse como `Pte. Compra u otros gastos`.
   - Se agrupa como `GASTOS CORRIENTES`.
   - Se pinta en negro, sin rojo.
   - Se considera comprado/realizado, como un TKxx a efectos de resumen.

2. **Refrescar y fotos**
   - Al pulsar `Refrescar`, además de recargar datos, se fuerzan de nuevo las fotos de:
     - Resumen presupuestario / Cálculos por tienda y ticket.
     - Ingresos.
     - Documentos del evento.
   - Se añade cache-busting a miniaturas visibles para evitar que el navegador mantenga fotos antiguas.

3. **No se ha tocado**
   - Versión visible.
   - Sistema de adjuntar/eliminar fotos que quedó funcionando en FIX6/FIX8.
   - Visor de tickets.
   - Logo inicial.
