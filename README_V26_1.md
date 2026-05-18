# ControlEvent v26.1 - Modularización de mantenimiento

Versión generada sobre la v26.0 y conservando la corrección v25.9.1 de totales Excel.

## Objetivo de esta versión

Avanzar el paso del plan:

- `v26.1 - Modularizar mantenimiento`

Se han creado controladores específicos para las secciones de mantenimiento sin romper todavía las funciones legacy finales del `index.html`.

## Nuevos módulos

```text
public/modules/maintenance/
  _maintenance-runtime.js
  index.js
  personas.js
  eventos.js
  tiendas.js
  productos.js
  accesos.js
  importacion.js
```

## Qué hace ahora

- `views/mantenimiento.js` instala el runtime de mantenimiento.
- Cada sección tiene su propio módulo controlador.
- Los módulos activan/refrescan su tarjeta correspondiente:
  - Personas
  - Eventos
  - Tiendas
  - Productos
  - Accesos
  - Importación
- Se mantiene compatibilidad con las funciones legacy del monolito:
  - `renderPersonas()`
  - `renderEventos()`
  - `renderTiendas()`
  - `renderProductos()`
  - `renderAcceso()`
  - `importInitialWorkbook()`

## Modo seguro

Esta versión no reescribe todavía los formularios de mantenimiento. Los módulos actúan como controladores seguros, para comprobar el flujo real antes de extraer por completo cada pantalla.

## Comprobación en consola

```js
ControlEventModules.version
ControlEventMaintenance.version
ControlEventMaintenance.info()
ControlEventMaintenance.refreshCurrent()
ControlEventMaintenance.activate('personas')
ControlEventMaintenance.activate('eventos')
ControlEventMaintenance.activate('tiendas')
ControlEventMaintenance.activate('productos')
ControlEventMaintenance.activate('importar')
```

## Prueba recomendada

```bash
npm run dev:supabase
```

Abrir:

```text
http://localhost:3030
```

Probar especialmente:

1. abrir/cerrar mantenimiento;
2. pestaña Personas;
3. pestaña Eventos;
4. pestaña Tiendas;
5. pestaña Productos;
6. Carga inicial;
7. Accesos con usuario GD;
8. exportar INFOEVENTO para confirmar que Excel sigue igual.
