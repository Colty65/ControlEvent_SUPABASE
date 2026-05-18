# ControlEvent v26.0

## Objetivo de esta versión

Esta versión inicia la fase v25.9 de modularización de cálculos sin tocar todavía el flujo visual ni los exportadores Excel del monolito.

El `public/index.html` sigue siendo la base funcional, pero ahora se añaden módulos reales en:

```text
public/app/domain/
  _common.js
  ingresos-calculos.js
  compras-calculos.js
  donaciones-calculos.js
  resumen-calculos.js
  agrupacion-calculos.js
  index.js
```

## Qué cambia

- `public/app/main.js` importa e instala `installDomainCalculations()`.
- `window.ControlEventRuntime.domain` queda disponible tras el arranque.
- `window.ControlEventDomain` queda disponible para depuración.
- `app.calculationsV259` queda disponible junto a los cálculos legacy.
- La versión visible pasa a `ControlEvent v26.0`.
- El cache PWA pasa a `controlevent-shell-v26-0` para forzar actualización.

## Modo de funcionamiento

Por seguridad, los cálculos v25.9 se instalan en modo `shadow`.

Eso significa que los nuevos módulos calculan en paralelo, pero no sustituyen todavía a las funciones legacy que alimentan pantallas y Excel.

Esto evita romper:

- Resumen presupuestario.
- Gráficas.
- Exportación Excel.
- Tickets e imágenes.
- Globos/tooltips de versiones anteriores.

## Cómo probar los cálculos v25.9 en consola

Con la app abierta en navegador:

```js
ControlEventDomain.api.budgetSummary()
ControlEventDomain.api.summaryBySegmento()
ControlEventDomain.api.summaryByDestino()
ControlEventDomain.api.summaryByTiendaTicket()
ControlEventDomain.compareWithLegacy()
```

Para activar comparación automática contra los cálculos legacy:

```js
localStorage.setItem('controlevent:v25.9:compare', '1')
location.reload()
```

Si todo cuadra, en consola aparecerá una validación. Si hay diferencias, se muestran los importes donde difiere.

## Siguiente paso recomendado

Cuando se pruebe esta v25.9 con datos reales:

1. Validar que `ControlEventDomain.compareWithLegacy()` no muestra diferencias importantes.
2. Revisar resumen, compras, donaciones, gráficas y Excel.
3. Si todo coincide, preparar una v26.0 o v26.0 donde las vistas empiecen a usar `app.calculationsV259` en lugar de las funciones legacy.


## v26.0 - Modularización de pantallas de menú

Esta versión mantiene el comportamiento de la v25.9.1 y añade controladores reales para las opciones principales del menú:

- `public/modules/views/ingresos.js`
- `public/modules/views/compras.js`
- `public/modules/views/donaciones.js`
- `public/modules/views/resumen.js`
- `public/modules/views/graficas.js`
- `public/modules/views/mantenimiento.js`
- `public/modules/views/_view-runtime.js`

Los módulos de vista funcionan como capa segura de transición: montan, activan y refrescan cada pantalla llamando a las funciones legacy finales del monolito. Así se empieza a sacar la navegación del `index.html` sin reescribir todavía formularios, eventos internos ni Excel.

Comprobación en consola:

```js
ControlEventModules.version
ControlEventModules.refreshCurrent()
ControlEventViewRuntime.info()
```

Prueba recomendada:

```bash
npm run dev:supabase
```

