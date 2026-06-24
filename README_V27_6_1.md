# ControlEvent v15_prod

Versión correctiva sobre v27.6.

## Objetivo

La v27.6 añadió diagnóstico de formularios principales. En producción, `ControlEventForms.print()` mostraba avisos amarillos aunque la app funcionaba correctamente.

## Correcciones

- El diagnóstico ya usa el selector real de evento `selectedEvent`.
- INGRESOS usa los IDs reales: `collabPersona`, `collabNumero`, `collabSituacion`, `collabImporte`.
- DONACIONES usa los IDs reales: `donProducto`, `donUnidades`, `donPrecio`, `donImporte`, `donTicket`, `donDonante`, `donResponsable`.
- Los formularios vacíos o sin producto/persona seleccionada se informan como diagnóstico normal, no como warning estructural.
- Sólo se usa `console.warn` si falta realmente una acción legacy, un botón o un campo estructural.

## No se toca

- INFOEVENTO.
- BACKUP / descarga de datos.
- Carga de datos.
- Guardado real de ingresos, compras y donaciones.
- Mantenimiento.

## Prueba recomendada

En consola:

```js
ControlEventForms.print()
ControlEventForms.snapshot()
ControlEventForms.validateAll()
```

Si los formularios están vacíos, puede indicar que no hay producto/persona seleccionada, pero ya no debería aparecer como error amarillo salvo que falte un campo o acción real.
