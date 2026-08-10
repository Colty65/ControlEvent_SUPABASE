# ControlEvent v27_prod_1.5 · Candidata estable

Fecha: 10/08/2026

Esta versión parte de v27_prod_1.4 y se centra en estabilización, no en añadir más capas de inteligencia.

## 1. GRAFICAS · detalle exhaustivo de barras Por destino

Se añade `public/app/features/v27-prod-1-5-detail-globes.js` y se carga al final del frontend.

- Los globos de todas las barras `Comprado`, `Donado` y `Pte.Compra` de `Por destino` se reconstruyen desde `state.compras` del evento activo.
- El detalle no depende de una lista intermedia potencialmente incompleta.
- Se muestran todos los registros coincidentes con el destino y el estado de la barra.
- Para compras: Tienda, Ticket, Producto, Cantidad, Precio y Total, con subtotales por ticket y tienda.
- Para donaciones: Donante, Producto, Cantidad, Precio y Total.
- Se mantiene la infraestructura existente de justificantes/miniaturas.
- No hay `slice`, top-N ni límite fijo de filas en este parche.
- No contiene destinos, productos, tiendas, tickets, eventos ni importes hardcodeados.

## 2. Zuzu · continuidad de tablas grandes

Se corrige el problema observado en la secuencia D1→D5 de v1.4:

- `al lado`, `ordénalo`, `agrúpalo`, `totaliza`, `simplemente la tabla`, `A-Z` y expresiones equivalentes heredan el dataset estructurado del hilo anterior.
- `prodcutos` y la forma correcta `productos` activan el mismo detector de detalle.
- Si el hilo venía de catálogo general + compras de evento, el follow-up conserva ambos ámbitos.
- Las salidas masivas ya no deben narrarse fila a fila: Gemini resume y CE materializa la tabla completa.
- Si Gemini termina sin texto final pero ya existe una tabla canónica obtenida, CE rescata la respuesta y muestra la tabla en lugar de devolver error.

## 3. Compras por Segmento/Destino

`event_purchase_lines` añade:

- `by_segment_destination`: Segmento → Destino → Producto, orden A-Z, con unidades, precios registrados, importe, nº de registros y tiendas.
- `totals_by_segment_destination`: total canónico por Segmento/Destino.

`master_catalog(products + event)` añade:

- `catalog_with_event_purchases_by_segment_destination`: TODO el catálogo, sin eliminar productos no comprados, ordenado por Segmento/Destino/Producto.
- `catalog_purchase_totals_by_segment_destination`: totales de la superposición de compras por Segmento/Destino.

## 4. Gráfica bancaria PDF

La detección de etiquetas estáticas ya no depende del orden de las palabras. Peticiones como:

`concepto del movimiento + importe + saldo que deja`

activan el modo de etiquetas estáticas aunque el usuario no diga primero «importe» y luego «concepto».

## 5. Coste / contexto Gemini

Para `master_catalog` y `event_purchase_lines`, Gemini recibe una muestra estructural más pequeña (32 filas estándar / 72 full), mientras ControlEvent conserva y presenta todas las filas completas en tabla y CSV. Esto reduce consumo sin recortar la información entregada al usuario.

## 6. Seguridad y no-hardcode

- ACCESO / usuarios de acceso / credenciales siguen excluidos de los catálogos generales.
- No se han introducido nombres de eventos, personas, tiendas, productos, tickets, destinos, importes ni fechas concretas en la lógica nueva.

## 7. Regresión

- v1.2: 16/16
- v1.3: 11/11
- v1.4: 13/13
- v1.5: 12/12
- Total: 52/52 pruebas
- Sintaxis Node validada en los JS/servicios modificados.

## Criterio de congelación

Esta versión se plantea como candidata a congelación funcional. Si las pruebas reales confirman:

1. globos completos en todas las barras de Por destino,
2. D1→D5 sin truncado narrativo ni salida vacía,
3. etiquetas visibles en la gráfica bancaria cuando se piden,

la recomendación es dejar de añadir «inteligencia» y pasar a mantenimiento/regresión, corrigiendo solo fallos concretos.
