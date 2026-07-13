# ControlEvent v21_prod · base limpia desde V19_PROD-FIX18

Base utilizada: `CE_v19_PROD_MAPA_GLOBAL_FIX18.zip`.

Cambios aplicados en esta entrega:

1. Cambio de versión a `v21_prod` en textos visibles, trazas, nombres de PDF/backup/infoevento y cache busting donde aparecía `v19_prod`.
2. `package.json` y `package-lock.json` pasan a `controlevent-v21-prod` / `21.0.0`.
3. Desplegable principal de eventos reforzado:
   - orden estable por `fechaIni` / fecha de inicio,
   - desempate por título,
   - conserva la opción `Selecciona evento...`,
   - mantiene el evento seleccionado al reconstruir,
   - pinta `En curso` en verde y `Finalizado` en rojo.
4. No se añade ningún parche nuevo de logon, no se añade fetch de arranque y no se incorporan los cambios posteriores a FIX18 que rompieron la entrada.

No aplicado todavía en esta base:
- cambios de INFO SOCIOS / Avance del Evento posteriores,
- criterio canónico de socios para Zuzu/Planificación,
- ajustes posteriores al FIX18 salvo versionado y desplegable.
