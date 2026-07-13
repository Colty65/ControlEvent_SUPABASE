# ControlEvent v21_prod · Mapa de recursos global

Cambios aplicados sobre el ZIP v18.11.10:

1. Versión subida a `v21_prod` en front, API, `package.json`, `package-lock.json`, `INFOEVENTO` y `BACKUP`.
2. Se elimina la etiqueta flotante de versión de la esquina superior derecha para no tapar la cabecera. Queda solo la versión oficial de la cabecera.
3. Nuevo botón solo con icono `📊` en la cabecera de **Mapa de recursos**, alineado a la derecha.
4. Nueva ventana gráfica global desde Mapa de recursos:
   - Ingresos en gráfica de queso, con detalle pulsable por tipo de ingreso.
   - Detalle de personas y justificantes al pulsar ingresos.
   - Compras + donaciones juntas por segmento y por destino.
   - Colores tradicionales: compras en rojo y donaciones en naranja/amarillo.
   - Al pulsar segmento: productos de todos los destinos combinados, ordenados A-Z.
   - Al pulsar destino: productos de ese destino, ordenados A-Z.
   - Cálculo bajo demanda para no cargar pesado la entrada al módulo.
5. Nombre ZIP: `CE_v19_PROD_MAPA_GLOBAL.zip`.

Comprobaciones realizadas:

- `node --check` en los JS modificados del front.
- `node --check` en servicios/rutas principales de versión, exportación y Zuzu.
- Búsqueda de restos activos `v18.11.10_prod`, `v18_prod`, `ControlEvent v18_prod` y `ControlEvent_v18_prod` sin resultados.
