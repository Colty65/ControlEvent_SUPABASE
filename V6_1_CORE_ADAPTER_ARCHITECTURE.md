# v6_1-exp · Core + Adapter · arquitectura generalista

## Regla principal
El núcleo no conoce el dominio y no contiene frases concretas de usuario. Gemini interpreta lenguaje natural; el host solo valida y ejecuta estructuras declaradas.

## Capas
1. **Generic Cognitive Core** (`services/zuzu-v6-core.service.js`)
   - Estados conversacionales y de ejecución.
   - Contratos Structured Output generados dinámicamente.
   - Reglas de grounding, continuidad, fidelidad de evidencia y manejo fuera de dominio.
   - Cero nombres de entidades de ControlEvent y cero ejemplos de frases de usuario.
2. **Domain Manifest** (`services/zuzu-v6-controlevent-domain.service.js`)
   - Entidades, campos, relaciones, métricas, capacidades, límites y vistas disponibles.
   - Es declarativo; no interpreta lenguaje.
3. **Domain Data Adapter** (`v6Rows` dentro de `event-ai.service.js`, pendiente de extraer físicamente en un paso posterior)
   - Traduce el estado físico de ControlEvent a filas canónicas del manifest.
   - Es mecánico y específico del dominio, pero no contiene reglas de intención lingüística.
4. **Mechanical Executor**
   - Ejecuta FETCH/FILTER/SORT_LIMIT/VISUALIZE secuencialmente.
   - No decide qué quiso decir el usuario.
5. **Certified Evidence + Synthesis**
   - La síntesis recibe datasets certificados.
   - Orden y valores escalares son inmutables.

## Fuera de dominio
El core permite una respuesta general sin mapear artificialmente la pregunta a una entidad. Una pregunta no relacionada con datos privados del dominio no debe generar un error de pipeline por el mero hecho de ser externa al dominio.

## Prohibiciones de runtime
- No `if (prompt.includes(...))` para semántica.
- No regex de intención.
- No sinónimos/ejemplos de frases en el prompt productivo.
- No nombres propios o escenarios de prueba en el core.
- No reparación semántica antes/después de Gemini.
- No usar FETCH masivo para emular capacidades no declaradas.

## Qué sí es válido
- Enumeraciones de estados/operadores/primitivas.
- Campos y relaciones declarados por el adaptador.
- Validación de tipos/esquemas/permisos/límites.
- Transformaciones mecánicas sobre datos certificados.

## Auditoría
`scripts/v6-1-core-adapter-no-hardcode-audit.cjs` falla si detecta nombres/casos concretos en el core o frases concretas en la ruta v6 activa.
