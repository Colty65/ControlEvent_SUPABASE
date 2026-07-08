# ControlEvent v19_prod — FIX5 colores, iPad y claridad en donaciones

## Cambios aplicados

1. **Colores recuperados y reforzados**
   - Leyendas del queso de **INGRESOS** con texto e importes en el color correspondiente.
   - Registros del detalle de **INGRESOS** pintados con el mismo color de su categoría.
   - Cabecera del modal coloreada por estado:
     - **En curso** → verde
     - **Finalizado** → rojo

2. **INGRESOS**
   - Añadido botón **[Ver todo]** en la ficha de INGRESOS.
   - Se puede ver el detalle completo de ingresos sin filtrar por una sola porción.

3. **iPad / móviles**
   - Mejorada la pulsación sobre las porciones del queso para que responda también en iPad.
   - Añadida protección para que los **RadioButton** no se seleccionen solos al hacer scroll.
   - Reducido el tamaño de radio buttons y textos de filtros para que resulten más cómodos en móvil/iPad.
   - Eliminado el efecto visual molesto de enfoque/cuadro al pulsar sobre el queso.

4. **Texto y cabeceras**
   - Sustituido **COMPRAS + DONACIONES** por **PRODUCTO DISPONIBLE**.
   - Cuando está activa la vista de **Todos los productos**, las cabeceras de los bloques quedan en **gris claro** y con tipografía un poco más grande.

5. **Claridad compra vs donación**
   - En filas de **donación**, el campo **Tienda** queda vacío.
   - En donaciones solo se informa el lado de **Donado / Donante**.
   - En compras solo se informa el lado de **Compras / Tienda**.

6. **Cache busting**
   - Actualizada la referencia del script `v19-mapa-recursos-global.js` en `index.html` para evitar caché antigua.

## Ficheros tocados
- `public/app/features/v19-mapa-recursos-global.js`
- `app/features/v19-mapa-recursos-global.js`
- `public/index.html`
- `index.html`
