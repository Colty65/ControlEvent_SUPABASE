# ControlEvent v16_prod - OPT3I Resumen reposo en cambio de evento

Base: v16_prod + OPT3H.

No cambia la versión visible: se mantiene v16_prod.

Alcance cerrado:
- Resumen presupuestario / Cálculos por tienda y ticket.
- No toca login.
- No toca selector de eventos.
- No toca /api/state.
- No toca gráficas, compras, ingresos, documentos, tickets ni AVANCE.

Cambios:
1. Mantiene lo bueno de OPT3G/OPT3H: las donaciones quedan clicables rápido.
2. Añade salida temprana ligera antes de recalcular filas si el bloque ya pertenece al evento actual.
3. Cachea durante unos segundos el cálculo de filas de Cálculos por tienda y ticket para evitar recálculos repetidos tras cambiar de evento.
4. Indexa las miniaturas de tickets una sola vez por evento en vez de buscarlas fila a fila.
5. Reduce el trabajo posterior que seguía acelerando el PC después de que la pantalla ya estaba disponible.

Prueba recomendada:
- Entrar en Resumen presupuestario.
- Cambiar entre eventos.
- Volver a Gráficas y regresar a Resumen.
- Comprobar que las filas de donación siguen clicables y que el PC se calma antes.
