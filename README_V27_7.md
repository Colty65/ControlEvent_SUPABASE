# ControlEvent v15_prod - Diagnóstico de mantenimiento estable

Versión conservadora. No toca funcionalmente INFOEVENTO, BACKUP, carga de datos ni guardado.

## Nuevo diagnóstico

Se añade:

```text
public/app/diagnostics/maintenance-diagnostics.js
```

Disponible en consola:

```js
ControlEventMaintenanceDiagnostics.print()
ControlEventMaintenanceDiagnostics.inspect()
ControlEventMaintenanceDiagnostics.section('productos')
ControlEventMaintenanceDiagnostics.productPrices()
```

El objetivo es preparar la futura extracción de mantenimiento sin tocar todavía altas, modificaciones ni borrados legacy.

## Estado

- INFOEVENTO: no tocado funcionalmente.
- BACKUP: no tocado funcionalmente.
- Formularios principales: diagnóstico v27.7.
- Mantenimiento: diagnóstico no intrusivo v27.7.
- index.html: 447 líneas.
