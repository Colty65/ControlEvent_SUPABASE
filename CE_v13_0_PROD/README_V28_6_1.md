# ControlEvent v5.1.0_prod - ActiveRender desactivado por defecto

Versión correctiva sobre v28.6.

## Motivo

En pruebas reales:

- PC: v28.6 iba bien.
- iPhone 12 mini: iba bien.
- iPad 6ª gen y Android TCL30: `ControlEventActiveRender` empeoraba la sensación de fluidez.
- Al ejecutar `ControlEventActiveRender.disable()`, iPad y Android mejoraban claramente.

Por tanto, v28.10 deja `ActiveRender` **desactivado por defecto**.

## Qué se mantiene

Sigue disponible para pruebas manuales:

```js
ControlEventActiveRender.print()
ControlEventActiveRender.enable()
ControlEventActiveRender.disable()
```

Pero al arrancar la app no sustituye el render legacy.

## Qué NO toca

- INFOEVENTO
- BACKUP
- carga de datos
- ExcelJS bajo demanda
- hotpath cache
- screen lazy
- mantenimiento diferido
- guardado

## Prueba recomendada

Probar sin debug activo:

```js
ControlEventDebug.disable()
```

Valorar fluidez en PC, iPad, Android y iPhone.

Si se quiere verificar:

```js
ControlEventActiveRender.print()
```

Debe indicar `enabled: false` salvo que lo actives manualmente.
