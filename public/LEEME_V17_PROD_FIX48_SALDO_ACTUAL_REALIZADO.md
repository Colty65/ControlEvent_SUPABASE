# CE v21_prod FIX48 - Saldo actual realizado

Cambio mínimo aplicado sobre FIX47.

## Corrección

En RESUMEN PRESUPUESTARIO, `SALDO ACTUAL` se fuerza a:

```text
SALDO ACTUAL = ingresos realmente cobrados - gastos realizados
```

Solo se consideran ingresos realmente cobrados las líneas de ingresos con situación:

- Banco
- Bizum
- Efectivo

Cualquier otra situación, blanco, pendiente o texto no reconocido queda fuera del saldo actual y se considera pendiente para este cálculo.

## Alcance

No se toca Planificación inicial, Zuzu, compras, donaciones, gráficas, globos ni fotos.
