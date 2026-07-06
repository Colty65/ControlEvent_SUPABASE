# ControlEvent v18_prod FIX26 - móvil resumen + bienvenida ColtyLAB

Base: `CE_v17_PROD_FIX25_WELCOME_ELARRASTRE.zip`.

Cambios aplicados:

1. **Solo móviles tipo teléfono** en `RESUMEN PRESUPUESTARIO`:
   - Los globos de las líneas de INGRESOS SOCIOS, INGRESOS NO SOCIOS, DONACIONES DE PRODUCTO y OPERATIVA ya no se abren con una pulsación simple.
   - Se exige doble pulsación rápida sobre la misma línea.
   - PC e iPad quedan fuera por detección de dispositivo: no cambia su comportamiento.

2. **Solo móviles tipo teléfono** en pantalla de bienvenida sin evento seleccionado:
   - Con el logo de Peña El Arrastre visible, al pulsar el logo ColtyLAB se bloquea la ficha de avance vacía de “Selecciona evento”.
   - Se muestra una ficha informativa de `Control_Event_App` con el texto solicitado y pie `(c)oltyLAB '26 - v18_prod_FIX26`.

Ficheros tocados:
- `public/app/features/budget-tooltips-lite.js`
- `public/app/features/v17-fix26-mobile-resumen-welcome-info.js`
- `public/index.html`
- Copias equivalentes de empaquetado cuando existen.

No se han tocado cálculos, fotos, BD, carga de datos, GRAFICAS ni comportamiento de PC/iPad.
