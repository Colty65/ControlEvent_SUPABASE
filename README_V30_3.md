# ControlEvent v15_prod

Base: v30.2.

Correcciones funcionales:

- Mapa de productos queda registrado como pestaña oficial (`currentMainTab = "mapa"`).
- Usuarios RO pueden permanecer en Mapa de productos sin que un render posterior fuerce Resumen.
- Eliminado el desplazamiento automático que hacía saltar la pantalla hacia arriba al pulsar Mapa.
- El botón Mapa mantiene apertura directa, pero la vista ya no se comporta como globo temporal.
- Tras login/cambio de evento, se precalientan Colaboradores, Donaciones y Compras para evitar listas vacías por render LITE.
- Se mantiene el rendimiento de V29.4/V30.2 en iPad/Android.

Prueba recomendada:

1. Login con GD y RW: elegir evento, entrar en Colaboradores, Donaciones y Compras y comprobar que las listas aparecen.
2. Login con RO: verificar que solo se ven Mapa, Resumen y Gráficas.
3. En RO: pulsar Mapa y dejarlo varios segundos; no debe volver solo a Resumen.
4. En PC/iPad: Mapa debe abrir sin salto de pantalla y sin quedarse como globo.
