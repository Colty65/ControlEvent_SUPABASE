# VNext P1.7 · Filter Engine + Voice Emphasis

- `include_stores` y `exclude_stores` son filtros distintos y persistentes del dataset de compras.
- Nombres truncados con puntos se canonicalizan contra `ce_tiendas`.
- Un filtro positivo («de las tiendas X/Y/Z») no puede convertirse en exclusión.
- Todas las tablas de compras se regeneran desde el mismo subconjunto filtrado.
- La voz elimina emoji/iconos decorativos antes de TTS.
- Remates vocativos como «crack» se separan con pausa mínima y prosodia reforzada, sin cambiar el texto factual.
- La identidad del usuario conectado no se sustituye por el mote del sujeto consultado.
- Se mantiene el fast path: una Interaction factual + datos CE en paralelo.
