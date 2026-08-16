# Zuzu Router SOMBRA · v2.0_exp

La fase SOMBRA ya ha cumplido su función de validación. **La producción v2.0_exp usa ya la arquitectura nueva Gemini → herramientas ControlEvent → Gemini → presentación canónica.**

## Producción

La UI de producción **ya no llama automáticamente** a `/api/event-ai/router-shadow`. El clasificador SOMBRA y su endpoint se conservan únicamente para diagnósticos/regresiones manuales.

En producción, cada turno entra en Gemini con el hilo nativo (`previous_interaction_id`); Gemini decide herramientas, ControlEvent ejecuta y verifica datos canónicos y la respuesta vuelve a Gemini antes de que CE materialice tablas/gráficas. No existe una ruta semántica determinista previa que herede por inercia compras, donaciones, banco, etc. al cambiar el usuario de asunto o de evento.

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
