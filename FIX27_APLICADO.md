# FIX27 aplicado sobre v20_prod FIX24

Objetivo: recuperar el logon fluido y corregir presentación/cómputo de INFO SOCIOS sin tocar descuentos, ingresos, Zuzu, Vista aérea ni descargas.

Cambios:
- Se neutraliza `v20-fix23-prod.js` para que no reconstruya el selector durante el arranque/login.
- Se añade `v20-fix27-prod.js`, selector ligero: no hace fetch, no usa timers de arranque, no actúa mientras está visible el login, solo normaliza el desplegable al abrirlo/cambiar evento o tras evento cargado.
- Se añade placeholder `v20-fix22-prod.js` en `app/features` para evitar 404 de script.
- AVANCE DEL EVENTO / INFO SOCIOS:
  - nombres con " y " cuentan como 2,
  - si asiste solo un miembro de la pareja, cuenta como 1/2,
  - asistentes en columna izquierda verde,
  - no asistentes en columna derecha roja,
  - orden alfabético dentro de cada grupo,
  - área con scroll propio.

No tocado:
- Login original de la app.
- Descuentos.
- Mantenimiento de ingresos.
- Zuzu.
- Vista aérea.
- Descargas.
