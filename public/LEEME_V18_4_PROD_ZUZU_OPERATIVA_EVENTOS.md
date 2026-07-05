# ControlEvent v18.4_prod · Zuzu orientada a actividad real del evento

Esta versión refuerza Zuzu para que, cuando el usuario pregunte por un evento, no conteste con la ficha técnica de EVENTOS salvo que se pidan datos técnicos como fecha, precio o estado.

## Cambios principales

- Preguntas de tipo “datos/info/dossier/qué ocurrió en el evento” ahora cargan módulos operativos: INGRESOS, COMPRAS, DONACIONES, TICKETS y DOCUMENTOS.
- Comparativas entre eventos ya no se resuelven con una tabla EVENTOS ni con una gráfica de auditoría; se genera resumen operativo por evento: ingresos, compras, pendientes, donaciones valoradas, saldo, colaboradores, tickets y documentos.
- Preguntas como “dónde participó Cito y con qué” buscan en todos los eventos si no se cita uno concreto y cruzan INGRESOS, COMPRAS y DONACIONES. También respetan “finalizados”.
- Si una persona no aparece, Zuzu devuelve un cero útil y explica que no hay registros operativos; no vuelca la tabla técnica de eventos.
- Preguntas sobre el tiempo de una celebración no inventan meteorología: se indica que ControlEvent no tiene previsión externa y se muestra la información operativa disponible del evento.
- El planificador local gana peso frente a interpretaciones flojas de Zuzu: se priorizan módulos y filtros deducidos por ControlEvent.
- La animación de avance de Zuzu ahora se fuerza a verse y completar fases antes de pintar la respuesta.

## Validación técnica

- `node --check services/event-ai.service.js`
- `node --check services/event-context.service.js`
- `node --check public/app/features/v11-3-zuzu-analitica-libre.js`
