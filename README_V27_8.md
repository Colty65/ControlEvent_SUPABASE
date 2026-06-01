# ControlEvent v5.1.0_prod

Fase conservadora de optimización móvil: añade diagnóstico de carga/rendimiento sin tocar la operativa estable.

## No cambia funcionalmente

- INFOEVENTO
- BACKUP / Descarga de datos
- Carga de datos
- Ingresos / Compras / Donaciones
- Mantenimiento
- Guardado

## Nuevo diagnóstico

Archivo nuevo:

```text
public/app/diagnostics/mobile-performance.js
```

Comandos en consola:

```js
ControlEventMobilePerformance.print()
ControlEventMobilePerformance.quick()
ControlEventMobilePerformance.inspect()
ControlEventMobilePerformance.resources()
ControlEventMobilePerformance.scripts()
```

El diagnóstico revisa:

- tamaño aproximado de recursos cargados;
- número de scripts;
- peso de legacy;
- si ExcelJS carga al inicio;
- nodos DOM renderizados;
- memoria JS si el navegador la expone;
- estado del service worker/PWA;
- recomendaciones para móvil.

## Siguiente paso recomendado

v27.9: separar modo producción/debug y empezar a evitar que diagnósticos y ExcelJS se carguen innecesariamente en móvil.
