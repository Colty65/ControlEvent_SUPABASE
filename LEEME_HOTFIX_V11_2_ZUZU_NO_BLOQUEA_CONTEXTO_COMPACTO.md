# Hotfix v11.2_prod - Zuzu contexto compacto sin bloqueo prematuro

Objetivo: evitar que Zuzu rechace casi todas las consultas por tamaño de contexto cuando la petición ya es concreta.

Cambios:
- El planificador ya no rechaza automáticamente al superar 350 KB.
- Se genera contexto compacto por bloques solicitados: compras, ingresos, donaciones, tickets o documentos.
- Para una petición como "lista de compras del evento X" se envían las compras reales completas del evento objetivo, pero sin duplicar datos innecesarios de tickets/documentos/ingresos si no se piden.
- Se reducen catálogos auxiliares y líneas filtradas por prompt para evitar consumo excesivo de tokens.
- Solo se pide más concreción si el contexto sigue siendo enorme incluso en modo compacto.
- Se eleva el límite de contexto antes de recorte en el prompt interno, evitando recortes prematuros.

Seguridad:
- Gemini sigue sin acceso directo a Supabase.
- Gemini no ejecuta SQL.
- Todo lo enviado procede de JSON calculado por ControlEvent y legible para humano.
