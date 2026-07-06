# ControlEvent v16_prod - HOTFIX4

Cambios aplicados sin cambiar versión:

1. AVANCE DEL EVENTO
   - El dato de INGRESOS del globo se toma del resumen presupuestario/budgetSummary para evitar que aparezcan importes superiores por recalculo de precio/personas.
   - Mantiene los colores ya corregidos.

2. Planificación inicial / ajuste automático de saldo
   - Se añade cerveza SKOL lata 33cl a la prioridad.
   - Orden de reparto:
     1. Coca Cola normal
     2. Ron Barceló
     3. Whisky JB
     4. Tónica
     5. Ginebra Beefeater
     6. Cerveza SKOL lata 33cl
     7. Coca Cola Zero Zero
     8. Fanta naranja
     9. Fanta limón
     10. Coca Cola Zero
     11. Ron Brugal
   - El reparto sigue añadiendo una unidad/pack por vuelta hasta dejar el saldo en umbral correcto sin bajar del colchón mínimo.

No se cambia la versión visible: sigue siendo v16_prod.
