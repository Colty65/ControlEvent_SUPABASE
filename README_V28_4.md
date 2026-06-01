# ControlEvent v50.24 - Perfilador de uso legacy

Versión conservadora. No cambia la operativa estable.

## Objetivo

Preparar la limpieza real del legacy midiendo qué funciones antiguas se usan de verdad durante una sesión normal.

## Nuevo diagnóstico bajo demanda

Primero activa debug:

```js
await ControlEventDebug.enable()
```

Después puedes perfilar una sesión:

```js
ControlEventLegacyUsage.start()
ControlEventLegacyUsage.mark('abrir ingresos')
// usa la app normalmente
ControlEventLegacyUsage.mark('despues de pruebas')
ControlEventLegacyUsage.print()
ControlEventLegacyUsage.stop()
```

## Lo que no toca

- INFOEVENTO
- BACKUP
- Carga de datos
- ExcelJS bajo demanda
- Guardado
- Formularios reales
- Mantenimiento real

## Observación de rendimiento

Las pruebas del usuario indican buena respuesta en iPhone 12 mini, pero pérdida de fluidez en PC/iPad y pesadez en Android. El diagnóstico v28.3 confirma que el legacy sigue siendo grande: unos 20.172 líneas y alrededor de 1,1 MB raw / 224 KB gzip en los bundles legacy. v28.4 mide uso real antes de eliminar o diferir código.
