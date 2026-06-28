# ControlEvent v16_prod - OPT3B Resumen globos/rendimiento

Base: v16_prod + OPT3 validada.

Alcance cerrado:
- Resumen presupuestario.
- Bloque "Cálculos por tienda y ticket" / `summaryTiendaTicket`.
- Detalle/globos de donaciones y tickets.
- Rendimiento visual de ese bloque.

No se toca:
- Compras.
- Donaciones como módulo.
- Ingresos.
- Documentos.
- Tickets.
- Planificación inicial.
- Gráficas.
- AVANCE DEL EVENTO.
- Versión visible, que sigue siendo v16_prod.

Cambios:
1. Render ligero e inmediato de `summaryTiendaTicket` al entrar/cambiar evento en Resumen.
2. Las filas de DONADO TIENDA / DONADO SOCIO / DONADO OTROS nacen ya con `data-ce-tip` y `data-ce-tip-v21`, sin esperar refrescos tardíos.
3. El clic en una fila abre su detalle directamente con tabla ligera.
4. Se intercepta `renderSummaryList('summaryTiendaTicket', ...)` para evitar que una versión antigua sustituya la lista.
5. Se evita el refresco visible tardío del bloque si los datos no han cambiado.
6. Se reserva altura durante el pintado del bloque para reducir saltos/retemblores.
7. Diagnóstico disponible en `window.ControlEventOpt3B`.

Prueba recomendada:
- Entrar en Resumen presupuestario.
- Revisar "Por tienda y Ticket" ordenado por Tienda y por Ticket/Donación/Otros gastos.
- Pinchar filas DONADO OTROS / DONADO SOCIO / DONADO TIENDA inmediatamente tras cambiar evento.
- Confirmar que el detalle aparece sin esperar 30 segundos y que no hay retemblor posterior.
