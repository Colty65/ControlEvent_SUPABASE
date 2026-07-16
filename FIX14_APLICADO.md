# FIX14 aplicado sobre ControlEvent v22_prod FIX13

Corrección urgente del bloqueo de login detectado en FIX13.

## Cambios

1. Se ha impedido que el FIX13 haga `/api/state?boot=1` mientras la pantalla de login está abierta.
2. Se ha añadido `v19-fix14-login-unblock.js`, cargado antes del capturador antiguo `v44-7-event-switcher`, para que el botón `Entrar` y la tecla Enter ejecuten un login limpio y controlado.
3. El login FIX14:
   - llama a `/api/login`,
   - guarda `Identificacion`, `Nombre` y `Nivel`,
   - carga catálogo inicial con `/api/state?boot=1`,
   - deja `selectedEventId` vacío,
   - reconstruye el selector de eventos con `Selecciona evento...`,
   - oculta el overlay de acceso,
   - muestra la pantalla de espera de selección de evento,
   - lanza repintados suaves posteriores.
4. Se actualizó cache busting a `FIX14`.

## Motivo

En FIX13 la precarga del desplegable de eventos podía ejecutarse antes de autenticación y dejar el flujo de acceso atrapado en algunos despliegues. FIX14 separa de forma estricta login y boot de eventos.
