# ControlEvent v28.7 - Render activo por pantalla para móvil/tablet

Versión conservadora para mejorar fluidez en iPad y Android.

## Objetivo

El render legacy original repintaba casi todas las zonas en cada acción:

- ingresos
- compras
- donaciones
- resumen
- gráficas
- mantenimiento

En móvil/tablet esto provoca esperas al pulsar una opción. v28.7 instala `ControlEventActiveRender`, que sustituye el render global por un render activo por pantalla: mantiene cabecera, permisos y bloqueo, pero sólo repinta la pestaña visible.

## No toca funcionalmente

- INFOEVENTO
- BACKUP
- carga de datos
- ExcelJS bajo demanda
- guardado
- tickets/fotos

## Comandos

```js
ControlEventActiveRender.print()
ControlEventActiveRender.disable()
ControlEventActiveRender.enable()
```

Si se nota algún comportamiento raro, se puede desactivar temporalmente:

```js
ControlEventActiveRender.disable()
```

## Prueba recomendada

Probar sin debug activo en PC, iPad, Android y iPhone.

```js
ControlEventDebug.disable()
```

Después usar la app normalmente.
