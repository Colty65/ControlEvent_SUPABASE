# ControlEvent v27.1 - Corrección Excel/Backup

Correcciones sobre v27.0:

1. INFOEVENTO y textos emitidos pasan a usar `ControlEvent_v27_1` en el nombre de fichero y `ControlEvent v27.1` en metadatos.
2. La descarga de datos/backup deja de depender sólo del estado legacy en memoria y se reconstruye desde `/api/state`, con fallback al estado de la app si el servidor no responde.
3. Si el estado efectivo está vacío, se cancela la descarga para evitar un Excel con sólo cabeceras.
4. El botón de descarga de datos queda redirigido al módulo `ControlEventExcel.run('backup')` cuando está disponible.

El `index.html` se mantiene en 447 líneas.
