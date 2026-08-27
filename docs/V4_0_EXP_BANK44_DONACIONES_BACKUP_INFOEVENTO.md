# ControlEvent v4_0_exp · BANK4.4

Correcciones de la prueba del 27/08/2026:

- **Mapa de recursos / donaciones:** `Marcar entregada` pasa por el camino CRUD persistente de HEAD y deja de ser interceptado por los handlers visuales v41.1/v41.2. Se elimina el doble toggle `pointerup + click` que devolvía la ficha a su estado inicial.
- **Histórico bancario:** el aspa de cierre queda fijada al extremo derecho aunque el título esté centrado en posición absoluta.
- **BACKUP:** toda cadena se sanea para XML 1.0. Los textos de más de 30.000 caracteres se sustituyen por un token y se guardan por fragmentos en `TEXTOS_LARGOS`; el importador v26 los recompone antes de restaurar. También se restaura `DONACION_SITUACION` desde `CE_COMPRAS_BBDD`.
- **INFOEVENTO / CUADRE BANCO:** reconoce como conciliados los estados compartidos y/o con diferencia aceptada. Si un movimiento del evento se completa con TKxx de otros eventos, la fila queda en verde y se explican los TKxx externos y, cuando proceda, la diferencia aceptada.
