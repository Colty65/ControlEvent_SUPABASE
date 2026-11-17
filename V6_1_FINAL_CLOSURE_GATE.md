# v6_1-exp · Gate final antes de CRUSH40

Pasar en una conversación nueva, en este orden:

1. **Dime qué sabes de este evento.**
   - Debe cerrar sin fallo `Unexpected end of JSON input`.
   - No debe haber retry ni fallback.

2. **¿Qué eventos están finalizados?**
   - Debe devolver el conjunto normal de eventos finalizados.

3. **Ordénamelos del más reciente al más antiguo por fecha de inicio.**
   - La presentación materializada debe quedar realmente en DESC por `start_date`.
   - El texto de Zuzu puede ser un acuse breve; no debe inventar una lista antes de que CE ordene.

4. **Suma todos los importes de las compras y agrúpalos por estado.**
   - Debe rechazarse en una sola llamada como capacidad `AGGREGATE` no implementada.
   - No debe hacer FETCH masivo ni segunda síntesis.

5. **¿Qué hora es ahora y qué día es hoy?**
   - Debe responder usando `meta.local_time` y `meta.local_date`.
   - No debe decir que no tiene acceso a fecha/hora.

## Gate
Si las 5 salen bien, ejecutar sin cambios la misma **ITV v6_1 CRUSH · 40**. No modificar la batería.

Objetivo de cierre: ningún KO funcional real en los cuatro defectos anteriores; sin turnos masivos de tokens; mantener mediana/p90 en el entorno de la última línea base.
