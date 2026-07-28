# ControlEvent v24_prod-03 · Cuadre Banco por evento

## Cambios realizados

- Acceso habilitado para usuarios **GD** y **RW**.
- La ventana trabaja siempre con el **evento activo**.
- Se muestran únicamente:
  - movimientos que ya tienen algún TKxx asociado al evento activo;
  - movimientos cuya fecha está comprendida entre `fecha_ini` y `fecha_fin` del evento.
- El selector de TKxx muestra exclusivamente tickets pagados del evento activo.
- El periodo conciliado se calcula desde el movimiento asociado más antiguo hasta el más reciente; mientras no existan asociaciones se muestran las fechas del evento.
- El nombre del evento aparece destacado en verde si está **En curso** y en rojo si está **Finalizado**.
- Semáforo de justificación:
  - verde: todos los TKxx están asociados;
  - naranja: al menos el 50 %, pero no todos;
  - rojo: menos del 50 %.
- Cuando todos los TKxx están justificados se muestra el aviso **Todo está justificado**, manteniendo la posibilidad de revisar y modificar mientras el evento siga En curso.
- Los eventos Finalizados quedan en modo de **solo lectura**. Se puede buscar, filtrar, navegar y revisar, pero no importar, asociar, quitar, forzar ni incluir/excluir movimientos.
- Nuevo check **Cuadrar de manera forzada**, que permite aceptar diferencias entre el importe bancario y la suma de TKxx.
- Tras asociar, quitar, incluir/excluir o forzar un TKxx, la lista vuelve al mismo movimiento y lo resalta temporalmente.
- Navegación explícita con `Av Pág`, `Re Pág`, `Inicio` y `Fin` sobre la cronología.
- Buscador reparado y ampliado a fecha, concepto, importe, saldo y TKxx.
- Desplegables de cuenta y vista enlazados de forma directa, sin las capturas globales que interferían con ellos.
- El saldo dejado por cada movimiento se presenta debajo de su importe, con tipografía menor.
- **Saldo certificado por el banco** sigue siendo global respecto a los eventos: se toma del último movimiento bancario cargado, aunque la lista visible esté limitada al evento activo.
- Versión visible en la parte derecha de la cabecera: `v24_prod-03`.

## Actualización obligatoria de Supabase

Ejecutar completo en **Supabase > SQL Editor**:

`ControlEvent_SQL_V24_PROD_CUADRE_BANCO.sql`

El script es compatible con una instalación previa de v24_prod-02 y añade de forma segura la columna:

`ce_bank_ticket_links.forced_square`

## Archivos principales modificados

- `app/features/v24-cuadre-banco.js`
- `public/app/features/v24-cuadre-banco.js`
- `app/styles/cuadre-banco.css`
- `public/app/styles/cuadre-banco.css`
- `services/bank-reconciliation.service.js`
- `routes/bank-reconciliation.routes.js`
- `ControlEvent_SQL_V24_PROD_CUADRE_BANCO.sql`
- `index.html`
- `public/index.html`
- `package.json`
- `package-lock.json`

## Comprobaciones realizadas

- Sintaxis JavaScript validada con `node --check` en cliente, servicio, rutas y servidor.
- Prueba de servicio con datos simulados para verificar:
  - alcance por evento;
  - unión de movimientos por fecha y por asociación;
  - exclusión de TKxx de otros eventos;
  - semáforo rojo/naranja/verde;
  - cuadre forzado;
  - periodo de conciliación;
  - saldo certificado global;
  - bloqueo de escritura al finalizar el evento.
