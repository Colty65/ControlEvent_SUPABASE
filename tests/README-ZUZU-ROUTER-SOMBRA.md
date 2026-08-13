# Zuzu Router SOMBRA · v30_prod

Esta primera fase **no cambia la respuesta actual de Zuzu**.

## Producción

Después de que `/api/event-ai/analyze` haya terminado y la respuesta ya esté pintada, la UI llama a `/api/event-ai/router-shadow`.
El Router Gemini solo devuelve una clasificación estructurada de la pregunta (tubería, sujeto, evento, operación, filtros y herencias). No consulta Supabase ni ejecuta las herramientas de Zuzu y su decisión no interviene en la respuesta vigente.

La traza de Zuzu muestra el bloque `SOMBRA · Router Gemini` para poder comparar durante uso real lo que habría decidido la arquitectura nueva.

## Banco de 100 mensajes

`zuzu-router-shadow.cases.json` contiene:

- 55 consultas transaccionales independientes.
- 15 conversaciones de 3 turnos = 45 mensajes.
- Total: 100 mensajes.

La batería valida únicamente **enrutamiento/contexto**, no cifras de negocio.

### Validar el banco sin Gemini

```bash
npm run test:zuzu-router:dry
```

### Ejecutar las 100 clasificaciones contra Gemini

```bash
npm run test:zuzu-router
```

Por defecto los turnos conversacionales heredan el estado esperado del turno anterior para localizar cada fallo de forma aislada. Para probar propagación real de decisiones:

```bash
node scripts/zuzu-router-shadow-suite.js --cascade
```

Ninguna de estas pruebas escribe datos en ControlEvent.
