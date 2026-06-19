# Hotfix ControlEvent v11.1_prod - Gemini libre: contexto controlado y comparativa explícita

Este hotfix mantiene la versión v11.1_prod y toca solo la funcionalidad Gemini libre.

## Cambios

- Por defecto Gemini recibe SOLO el evento activo seleccionado.
- Se añade modo Comparativa con un checkbox y un desplegable para elegir el evento a comparar.
- El backend ya no añade eventos por coincidencias del texto del prompt.
- `eventosDisponiblesParaSelector` solo informa de eventos disponibles, pero Gemini no debe calcular con ellos salvo que el usuario active Comparativa.
- El contexto enviado a Gemini se limita a `detalleEventosRelevantes`: evento activo y, si procede, evento comparado.
- Se añade aviso local si la petición es demasiado genérica para evitar esperas largas y resultados poco útiles.
- Se sustituye el texto estático de espera por un indicador visual animado con mensajes rotatorios.
- Se mantiene seguridad: Gemini no ejecuta SQL, no modifica BBDD y solo trabaja con JSON calculado por ControlEvent.

## Archivos modificados

- services/event-context.service.js
- services/event-ai.service.js
- public/app/features/v11-0-gemini-libre-evento.js

## Validación

- node --check en los tres JS modificados.
- zip -T correcto.
