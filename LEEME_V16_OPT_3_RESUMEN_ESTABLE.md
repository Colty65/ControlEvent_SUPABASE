# ControlEvent v16_prod - OPT3 Resumen presupuestario estable

Base: v16_prod + OPT2J validada por usuario.

Alcance cerrado de esta optimización:
- Solo Resumen presupuestario.
- No cambia versión visible: continúa v16_prod.
- No toca cálculos de importes ni datos guardados.
- No toca compras, donaciones, ingresos, documentos, tickets, planificación inicial ni AVANCE DEL EVENTO.

Cambios:
1. Añade `public/app/features/v16-opt3-resumen-estable.js`.
2. Agrupa llamadas repetidas a `renderBudget` para evitar varios repintados de la ventana Resumen.
3. Mantiene altura del panel mientras se pinta para reducir saltos/retemblores.
4. Cache temporal de `budgetSummary` con firma de datos para evitar recalcular varias veces el mismo resumen en ráfagas cortas.
5. No ejecuta renders fantasma de Resumen cuando la pestaña activa no es Resumen.
6. Expone diagnóstico en `window.ControlEventOpt3`.

Prueba recomendada:
- Entrar en Resumen presupuestario con un evento pequeño, medio y potente.
- Cambiar de evento estando dentro de Resumen.
- Verificar que no hay saltos fuertes ni varios repintados.
- Verificar que los importes siguen coincidiendo con Gráficas y Compras.
