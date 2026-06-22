# ControlEvent v5.1.0_prod

Fase de optimización móvil: carga diferida por pantalla.

## Cambios

- Añade `public/app/navigation/screen-lazy.js`.
- Formaliza la activación de pantalla inicial después del primer pintado.
- Mantiene módulos de pantalla bajo demanda; no precarga todas las vistas al arrancar.
- Expone `ControlEventScreenLazy` para inspección.
- Mantiene ExcelJS bajo demanda de v28.0.
- No toca funcionalmente INFOEVENTO, BACKUP, carga de datos ni guardado.

## Pruebas recomendadas

```js
ControlEventDebug.status()
ControlEventScreenLazy.print()
ControlEventModules.info()
ControlEventExcel.info().excelJs.loaded
```

`ControlEventExcel.info().excelJs.loaded` debe seguir en `false` hasta generar un Excel.
