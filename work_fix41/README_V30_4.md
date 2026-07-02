# ControlEvent v16_prod

Versión basada en v30.3.

Cambios principales:

- En **Mapa de productos**, el campo **Pendiente comprar** pasa a llamarse **Compras producto**.
- Se limpia la interacción del botón **Mapa** para que se comporte como el resto de pestañas y no provoque salto visual en iPad.
- Se añade un estabilizador de vistas que refuerza el repintado de **Colaboradores/Ingresos**, **Donaciones** y **Compras** tras login, cambio de evento y cambio de pestaña.
- Mantiene el modo rápido/LITE y la fluidez lograda en iPad y Android.
- No cambia la estructura de datos ni la lógica de INFOEVENTOS, BACKUP ni Excel.

Archivo nuevo:

- `public/app/features/view-refresh-stabilizer.js`
