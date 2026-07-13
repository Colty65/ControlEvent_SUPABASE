# ControlEvent v20_prod FIX27 — ColtyLAB bienvenida general

Base: `CE_v17_PROD_FIX26_MOBILE_RESUMEN_WELCOME_INFO.zip`.

## Cambio aplicado

- La ficha informativa al pulsar el logo **ColtyLAB** cuando todavía no hay evento elegido ya no está limitada a móviles.
- Ahora funciona en **PC, iPad y móviles**, siempre que la app esté en la pantalla de bienvenida con el logo de Peña El Arrastre y sin evento seleccionado.
- Se mantiene intacto el comportamiento de FIX26: en **RESUMEN PRESUPUESTARIO**, la doble pulsación rápida para abrir globos sigue aplicándose solo a móviles tipo teléfono.

## Archivos tocados

- `index.html`
- `public/index.html`
- `app/features/v17-fix27-welcome-info-general.js`
- `public/app/features/v17-fix27-welcome-info-general.js`

## No tocado

- Carga de eventos.
- Gráficas.
- Fotos / adjuntos.
- Permisos.
- Cálculos.
- Doble pulsación móvil de los globos del resumen.
