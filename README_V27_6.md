# ControlEvent v16_prod - Diagnóstico de formularios principales

Versión conservadora posterior a v27.5. No toca funcionalmente INFOEVENTO, BACKUP, carga de datos ni tickets.

## Objetivo

Añadir una capa no intrusiva para preparar la futura extracción de los formularios principales:

- INGRESOS
- COMPRAS
- DONACIONES

Los módulos nuevos sólo leen los formularios, validan campos básicos y comprueban que las acciones legacy siguen disponibles. No sustituyen botones ni guardados.

## Archivos nuevos

```text
public/modules/forms/_forms-runtime.js
public/modules/forms/index.js
public/modules/forms/ingresos-form.js
public/modules/forms/compras-form.js
public/modules/forms/donaciones-form.js
```

## Consola

```js
ControlEventForms.info()
ControlEventForms.print()
ControlEventForms.snapshot()
ControlEventForms.validateAll()
ControlEventForms.ingresos.print()
ControlEventForms.compras.print()
ControlEventForms.donaciones.print()
```

## Seguridad

- INFOEVENTO queda como fuente fiable y no se modifica funcionalmente.
- BACKUP servidor no se modifica funcionalmente.
- Los Excel standalone RESUMEN/GRAFICAS siguen desactivados.
- No se interceptan clicks ni se sustituyen acciones legacy.

## Siguiente paso recomendado

Si v27.6.1 funciona bien, la siguiente versión puede empezar a usar esta capa para extraer una acción concreta de bajo riesgo, probablemente validaciones previas de COMPRAS o INGRESOS, sin tocar todavía el guardado final.
