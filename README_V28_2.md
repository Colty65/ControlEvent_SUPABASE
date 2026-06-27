# ControlEvent v16_prod - Mantenimiento diferido para móvil

Versión conservadora centrada en suavizar la entrada a **Mantenimiento** en móvil.

## Cambios

- Mantiene INFOEVENTO, BACKUP, carga de datos y guardado sin cambios funcionales.
- Mantiene ExcelJS bajo demanda: no carga al abrir la app.
- Añade activación diferida de la sección de mantenimiento actual mediante `requestIdleCallback`/`setTimeout`.
- `ControlEventMaintenance` expone ahora `scheduleCurrent()`, `print()` e información de modo diferido.
- `ControlEventScreenLazy.print()` incluye estado de mantenimiento diferido.

## Pruebas recomendadas

```js
ControlEventDebug.status()
ControlEventExcel.info().excelJs.loaded
ControlEventScreenLazy.print()
ControlEventMaintenance?.print?.()
```

Validar también:

- INFOEVENTO
- BACKUP
- Carga de datos
- Ingresos / Compras / Donaciones
- Mantenimiento: Personas, Eventos, Tiendas, Productos, Importación y Acceso

## Resultado esperado

`index.html` permanece en 445 líneas y la app mantiene modo móvil más ligero.
