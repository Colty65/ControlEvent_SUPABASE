# ControlEvent v21_prod · FIX11

Corrección centrada solo en Zuzu / informes para evitar información falsa:

1. Si el prompt nombra eventos exactos en lista, por ejemplo:
   - SySA 2024
   - SySA 2025
   - SySA 2026

   ControlEvent bloquea el alcance a esos eventos y no puede convertirlo en consulta global.

2. Si Zuzu planificador no responde en informes, comparativas, tablas complejas o alcance cerrado:
   - ControlEvent no usa plan local de respaldo.
   - No extrae todos los eventos.
   - No muestra tablas locales.
   - Devuelve un corte de seguridad indicando que no se genera informe para no sacar datos erróneos.

3. Si Zuzu respuesta final no devuelve JSON válido o falla en informes/comparativas:
   - No se sustituye por tablas locales.
   - No se muestran gráficos ni ficheros de respaldo.
   - Se informa de que la respuesta no es segura.

4. La salida compleja sigue el flujo:
   Prompt usuario -> Zuzu planificador -> CE extrae módulos -> Zuzu respuesta final.

Validación:
- node --check services/event-context.service.js
- node --check services/event-ai.service.js
