# CE v22_prod FIX33 - Planificación: prompt compacto variable para Zuzu

Base: CE_v17_PROD_FIX32_PLANIFICACION_TRAZA_GEMINI.

Cambio limitado a Planificación inicial / Encargo total a Zuzu.

Objetivo:
- No condicionar la lógica al prompt de Santiago/Santa Ana; ese prompt queda solo como prueba dura.
- Extraer un brief variable desde cualquier explicación libre del evento.
- Enviar a Zuzu un contexto compacto y útil, no un paquete de ~90.000 caracteres.
- Evitar que, si Zuzu falla, ControlEvent presente una compra 0 € como si fuera una propuesta calculada.

Cambios principales:
1. Extractor genérico de momentos por día:
   - Detecta líneas tipo "día 1", "dia_2", "jornada 3".
   - Lee momentos como desayuno, aperitivo, comida, tardeo/cubatas, merienda, cena y cubatas noche.
   - Para el caso de prueba Santiago/Santa Ana debe detectar 11 momentos, pero sin reglas fijas de ese evento.

2. Extractor genérico de donaciones/existencias por bloques:
   - PRODUCTO EN LA PEÑA
   - DONACIONES DE SOCIOS
   - DONACIÓN DE TIENDA
   - DONACIÓN DE OTROS
   - EXISTENCIAS / YA TENEMOS / PRODUCTOS DONADOS
   Mantiene tipo, donante, responsable, producto y cantidad cuando aparecen en el prompt.

3. Prompt compacto para Zuzu:
   - Se elimina el envío duplicado del prompt original completo en Encargo total.
   - Se entrega brief estructurado, donaciones limpias, reglas de cálculo y catálogo reducido.
   - Catálogo de Encargo total limitado a productos relevantes, manteniendo productos no encontrados como revisables.

4. Rendimiento:
   - Prioridad de modelos: gemini-2.5-flash-lite, gemini-2.5-flash, gemini-flash-latest, gemini-2.0-flash.
   - Timeout de Encargo total reducido para evitar esperas largas.

5. Fallback honrado:
   - Si Zuzu no devuelve compras, ControlEvent conserva donaciones detectadas, pero avisa que la compra no está calculada.
   - No se inventa compra local de seguridad ni menú fijo.

No tocado:
- GRAFICAS.
- RESUMEN PRESUPUESTARIO.
- Globos.
- Fotos.
- Compras normales.
- Donaciones normales.
- Login/bienvenida salvo etiqueta de versión ColtyLAB.

Validación técnica:
- node --check services/event-ai.service.js
- node --check public/app/features/planificacion-inicial.js
- node --check app/features/v17-fix27-welcome-info-general.js
- node --check public/app/features/v17-fix27-welcome-info-general.js
