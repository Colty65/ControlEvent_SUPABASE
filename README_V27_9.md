# ControlEvent v16_prod

## Objetivo

Separar **modo producción** y **modo debug** para optimizar la carga en móvil.

En v27.8 los diagnósticos se importaban siempre desde `public/app/main.js`. En v27.9 pasan a cargarse bajo demanda mediante:

```js
ControlEventDebug.enable()
```

o abriendo la app con:

```text
?debug=1
?ceDebug=1
```

## Qué no se toca

No se modifica funcionalmente:

- INFOEVENTO
- BACKUP / descarga de datos
- Carga de datos
- Ingresos
- Compras
- Donaciones
- Mantenimiento real
- Tickets/fotos
- Guardado

## Comandos útiles

Modo producción ligero:

```js
ControlEventDebug.status()
ControlEventDebug.print()
```

Activar diagnósticos sin recargar:

```js
await ControlEventDebug.enable()
```

Activar diagnósticos y recargar:

```js
ControlEventDebug.enable({reload:true})
```

Desactivar diagnósticos:

```js
ControlEventDebug.disable()
```

Una vez activado debug, vuelven a estar disponibles:

```js
ControlEventDiagnostics.inspect()
ControlEventMobilePerformance.print()
ControlEventForms.print()
ControlEventMaintenanceDiagnostics.print()
ControlEventDataIntegrity.print()
```

## Optimización móvil

- Se eliminan los diagnósticos de los imports estáticos de `main.js`.
- Se eliminan los diagnósticos del cache inicial del service worker.
- El shell PWA queda más ligero.
- Los diagnósticos se cargan sólo cuando se solicitan.

## Métrica

`index.html` se mantiene en 447 líneas.
