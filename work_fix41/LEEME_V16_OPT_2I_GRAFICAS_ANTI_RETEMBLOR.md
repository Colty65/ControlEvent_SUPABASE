# ControlEvent v16_prod - OPT2I GRAFICAS ANTI RETEMBLOR

Versión visible mantenida: `v16_prod`.

## Alcance

Optimización visual de la ventana **GRAFICAS** durante el cambio de evento.

## Cambios

- Se mantiene la gráfica anterior como instantánea estable durante el cambio de evento.
- La ventana real queda oculta pero reservando su altura, para que no se vea el pequeño salto bajo/alto.
- La nueva gráfica V46 se revela solo cuando el render ya está asentado.
- Se alinea el scroll/posición antes de liberar la instantánea para evitar el salto final.
- Se añade evento interno `controlevent:opt1-event-start` en OPT1 para avisar justo al comenzar el cambio.

## No tocado

- Planificación inicial.
- Compras.
- Ingresos.
- Documentos.
- Tickets.
- AVANCE DEL EVENTO.
- Cálculos de gráficas.

## Prueba recomendada

En **GRAFICAS**, cambiar de evento desde el desplegable principal. Debe mantenerse la imagen anterior quieta y después aparecer la nueva sin el retemblor de subir/bajar.
