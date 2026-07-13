# ControlEvent v20_prod · FIX28

Base: CE_v20_PROD_MAPA_GLOBAL_FIX24 + correcciones funcionales posteriores sin reintroducir los bloqueos de login de FIX25/FIX26/FIX27.

Cambios:

1. Logon
- Añadido `v20-fix28-login-rescue.js` cargado justo después del bloque de login, antes de los capturadores antiguos.
- Intercepta Entrar/Enter de forma prioritaria y hace login directo `/api/login` + carga ligera `/api/state?boot=1`.
- No reconstruye selector, no ejecuta observers globales y no toca Vista aérea/Ingresos en tiempo de logon.
- Mantiene el selector en `Selecciona evento...` tras entrar.

2. Selector de eventos
- Neutralizados `v20-fix22-prod.js` y `v20-fix23-prod.js` como parches de arranque.
- Añadido `v20-fix28-postlogin.js`, que solo actúa tras login/event-ready/event-loaded o al tocar el selector.
- Orden por fecha inicio y color de estado sin trabajo durante login.

3. Avance del evento
- Ficha más grande.
- Letra general mayor.
- Aspa de cierre más visible y accesible.
- INFO SOCIOS en dos columnas: asistentes izquierda verde, no asistentes derecha roja, con scroll propio.
- Parejas/grupos con “ y ” cuentan como 2; asistencia parcial cuenta como 1/2.

4. Zuzu / PERSONAS
- El módulo PERSONAS aplica criterio canónico cuando se pide SOCIO:
  rango SOCIO, excluir z_DEV%, Grupo%, Peña%, parejas con “ y ” sustituyen a sus miembros individuales y cuentan como 2.
- El contexto incluye `sociosCanonicos` para informes, preguntas y planificación.
- El informe local de catálogo de personas suma `Cuenta socios` para no volver a decir 51 cuando el criterio canónico da 33.

5. Planificación inicial
- Para ingresos obligatorios de todos los socios se aplica el mismo filtro base canónico: excluir z_DEV%, Grupo%, Peña% y parejas/grupos sustituyendo a individuales.

No se han tocado descuentos, ingresos, descargas, Vista aérea ni cálculos de saldo.
