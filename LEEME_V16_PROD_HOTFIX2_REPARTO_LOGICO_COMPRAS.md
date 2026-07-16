# ControlEvent v16_prod - HOTFIX2 reparto lógico de compras

Cambio limitado a Planificación inicial.

## Qué corrige

- Mantiene la versión visible como v16_prod.
- No toca modales, cabeceras, documentos, resumen, tickets ni mantenimiento.
- Ajusta únicamente el equilibrado automático de compras cuando queda saldo positivo alto.

## Nueva lógica

Cuando el saldo positivo supera el 35% de las compras previstas:

1. Se calcula el máximo de compra extra manteniendo un colchón mínimo del 20% sobre la compra final prevista.
2. Se evita llenar el sobrante solo con refrescos.
3. Cuando se añade un pack de mezcla/refresco, se intenta acompañar con una botella de ron/whisky/gin:
   - Ron Brugal
   - Whisky JB
   - Ron Barceló
   - Beefeater
4. Se mantiene la prioridad general, pero con reparto más lógico entre bebida fuerte, refrescos/mezclas, cerveza e hielo.

