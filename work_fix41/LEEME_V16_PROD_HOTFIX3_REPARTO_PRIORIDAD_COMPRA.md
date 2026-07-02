# v16_prod HOTFIX3 - Reparto de aumento de compras por prioridad

No cambia versión visible: se mantiene `v16_prod`.

Cambio único aplicado:

- Planificación inicial / ajuste automático de saldo:
  - Si el saldo positivo sobre compras supera el 35%, se añaden compras de una en una.
  - El orden aplicado es:
    1. Coca Cola normal
    2. Ron Barceló
    3. Whisky JB
    4. Tónica
    5. Ginebra Beefeater
    6. Coca Cola Zero Zero
    7. Fanta naranja
    8. Fanta limón
    9. Coca Cola Zero
    10. Ron Brugal
  - Se repite el ciclo hasta dejar el saldo en zona correcta o hasta que el siguiente añadido bajaría el colchón por debajo del 20%.
  - La nota de ajuste ahora suma correctamente todas las líneas añadidas por el equilibrador.

No se han tocado módulos de modales, documentos, resumen, avance, ingresos, compras manuales ni versión.
