# CE v21_prod FIX34 - Planificación: parser donaciones/momentos + timeout Zuzu

Base: CE_v17_PROD_FIX33_PLANIFICACION_PROMPT_COMPACTO.

Objetivo: corregir los fallos detectados en la traza FIX33 antes de seguir afinando la inteligencia de la propuesta.

Cambios aplicados:

1. Parser genérico de donaciones/existencias
   - Reconoce bloques tipo:
     - PRODUCTO EN LA PEÑA
     - DONACIONES DE SOCIOS
     - DONACION DE TIENDA
     - DONACION DE OTROS
     - DONADO SOCIO - Nombre / Responsable X
     - DONADO TIENDA - Nombre / Responsable X
     - DONADO OTROS - Nombre / Responsable X
     - EXISTENCIAS / YA TENEMOS
   - Mantiene donante, responsable y tipo de donación por bloque.
   - Ya no depende del prompt concreto de Santiago/Santa Ana.

2. Parser genérico de momentos por día
   - Detecta líneas de día/jornada y momentos: desayuno, aperitivo, comida, tardeo/cubatas, merienda, cena y cubatas noche.
   - Si una línea está escrita como `dia_3 (comida): ... cenas`, respeta el momento explícito `comida` y no lo convierte en cena por aparecer la palabra cenas dentro de la descripción.
   - Evita duplicados por día+momento.

3. Prompt a Zuzu sin JSON cortado
   - Se elimina el `.slice()` sobre el JSON completo del contexto, que podía dejar el JSON incompleto.
   - Se envía un contexto compacto válido: brief, momentos, donaciones limpias, reglas y catálogo reducido.
   - Catálogo de encargo total reducido en la llamada real a Zuzu.

4. Timeout Zuzu
   - Encargo total pasa a 25 s de espera real para Zuzu y 28 s de envoltura externa.
   - Si Zuzu no responde, ControlEvent no inventa compras: conserva donaciones detectadas y avisa de que la compra no se calculó.

5. Diagnóstico visible
   - `Diagnosticar prompt` usa el mismo criterio genérico para contar donaciones y momentos.
   - Se mantiene botón de copia de traza.

No se ha tocado:
- Gráficas.
- Resumen presupuestario.
- Globos.
- Fotos.
- Compras normales.
- Login/bienvenida, salvo versión visible ColtyLAB.

Validación técnica:
- `node --check services/event-ai.service.js`
- `node --check public/app/features/planificacion-inicial.js`
- `node --check public/app/features/v17-fix27-welcome-info-general.js`
