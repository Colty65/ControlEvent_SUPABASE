# ControlEvent v15_prod - Modularización Excel y tickets/fotos

Esta versión continúa el plan de modularización sobre v26.1.

## Objetivo

Separar la frontera funcional de:

- Exportaciones Excel / INFOEVENTO / backup.
- Fotos de tickets y almacenamiento de imágenes.

## Nuevos módulos

```text
public/modules/excel/
  _excel-runtime.js
  index.js
  infoevento.js
  backup.js
  resumen-sheet.js
  graficas-sheet.js
  ticket-images-sheet.js

public/modules/tickets/
  _ticket-runtime.js
  index.js
  ticket-images.js
  ticket-modal.js
  ticket-storage.js
```

## Modo de trabajo

La v26.2 está en modo seguro `legacy-bridge`.

Eso significa que los módulos nuevos ya existen, se cargan y exponen API estable, pero las exportaciones reales siguen usando la rutina final estabilizada del monolito (`exportExcel` / `exportSeedWorkbook`) para no romper:

- formato de Excel,
- totales,
- imágenes en CALCULOS_TIENDA_TICKET,
- protección,
- nombres de fichero,
- globos y renderizados relacionados.

## APIs de comprobación en consola

```js
ControlEventRuntime.version
ControlEventExcel.info()
ControlEventTickets.info()
ControlEventExcel.downloadInfoEvento()
ControlEventExcel.downloadBackup()
```

## Prueba recomendada

```bash
npm run dev:supabase
```

Abrir:

```text
http://localhost:3030
```

Comprobar:

1. Login.
2. Ingresos, compras, donaciones, resumen, gráficas y mantenimiento.
3. Adjuntar/eliminar foto de ticket.
4. Exportar INFOEVENTO.
5. Revisar hojas con totales y fotos.
6. Descargar backup si procede.

## Versión

```text
ControlEvent v15_prod
ControlEvent_v15_prod
controlevent-shell-v50-24
```
