# BANK4_15 · Semantic Core compacto

BANK4_14 no llegó a ejecutar ni una sola llamada IA: el proveedor rechazó el schema de `ce_semantic_turn` con HTTP 400 por exceso de ramificación (`too much branching for serving`). No fue un fallo lingüístico ni de memoria.

BANK4_15 mantiene la arquitectura de intérprete único, pero reduce el contrato de function-calling a dos campos obligatorios:

- `action`: `query | local | set_context | reference | conversation | clarify`
- `payload_json`: un objeto JSON serializado como string con los argumentos de esa acción.

CE parsea `payload_json`, aplica el adaptador estructural canónico y valida el plan. No vuelve a leer la frase del usuario para decidir sujeto, scope, memoria o intención.

También se amplía el presupuesto de evidencia histórica de 450 ms a 1200 ms. La búsqueda sigue siendo evidencia y no decide semántica, pero se evita que una consulta de recuerdo llegue sistemáticamente a Gemini con cero candidatos por una latencia normal de DB.

Se conservan la respuesta humana de BANK4_14 y las microfrases de voz solicitadas (`Ummm...................` y `Calla............... ya lo tengo....., besitos muá.`).
