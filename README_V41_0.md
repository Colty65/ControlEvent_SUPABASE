# ControlEvent v41.0

Versión generada sobre v40.1.

Cambios principales:

- En la tarjeta **Compras producto** del Mapa de recursos se sustituye `TKxx: Importe` por `GASTADO: XX.XXX,XX € - Pte.Compra: XX.XXX,XX €`.
- **GASTOS CORRIENTES** se computa como gasto ya realizado, igual que un ticket TKXX.
- En compras y donaciones, al dar de alta un registro nuevo ya no se salta automáticamente al registro recién insertado.
- El salto al registro se mantiene solo cuando antes de insertar se detecta que ya existía un duplicado.
- Casitas flotantes reforzadas: en PC/iPad quedan centradas en la derecha; en Android/iPhone quedan encima del botón Menú, ligeramente separadas.
- Botón casita de mantenimiento reforzado para PERSONAS, PRODUCTOS y TIENDAS.
- Versión actualizada a ControlEvent v41.0 en cabecera, backup, service worker y metadatos.

- Se han actualizado también las cadenas internas de versión en los bundles legacy cargados por `index.html` para que INFOEVENTO, backup y cabecera no arrastren v40.1.
