# ControlEvent v25_prod · FIX2 Cuadre Banco operativo

- Eliminado el bucle de MutationObserver que bloqueaba CSV, búsqueda y desplegables.
- INFOEVENTO usa el estado `En saldo` propio del evento y calcula cuadre normal/forzado.
- La hoja CUADRE BANCO contiene exclusivamente movimientos incluidos en saldo.
- Abonos incluidos: `Movimiento positivo conciliado`.
- Justificados y forzados: fondo verde; pendientes: fondo rojo.
- En evento Finalizado se muestran exclusivamente movimientos incluidos en saldo.
- Fichas compactas en escritorio: movimiento a la izquierda y TKxx ordenados a la derecha.
- Diseño móvil específico de consulta y mantenimiento.
- Globos de GRAFICAS fijados hasta X, Escape u otro segmento.
- No requiere SQL nuevo.
