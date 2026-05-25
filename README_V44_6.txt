ControlEvent v44.6.1

Base: v44.5.1 estable.

Objetivo de la versión:
- Mejorar la experiencia durante el cambio de evento sin tocar lógica de negocio.
- Mostrar una capa “Cargando nuevo evento...” mientras el evento se recompone.
- Bloquear pulsaciones sobre la app durante esa recomposición para evitar ventanas a medio pintar.
- Preservar el desplegable de eventos para que no se quede vacío durante el cambio.
- Añadir estado de cambio de evento al panel PERF.

No se ha cambiado la lógica de guardado de COMPRAS, DONACIONES, INFOEVENTO ni BACKUP.
No se ha tocado el fallo pendiente de Planificación inicial desde móvil vertical.
