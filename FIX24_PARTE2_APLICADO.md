# CE_v22_PROD_BASE_FIX24_PARTE2

Base: CE_v22_PROD_BASE_FIX23_PARTE1.

Cambios aplicados solo en backend Zuzu:

- Planificador Zuzu en texto simple, sin JSON obligatorio.
- Zuzu devuelve intención/plan: eventos, módulos, alcance y motivo.
- ControlEvent traduce el plan a plantillas internas cerradas, no ejecuta SQL libre de Gemini.
- Alcance cerrado genérico si el prompt enumera eventos o usa SOLO/exactos/no consulta global.
- Si hay eventos exactos y Zuzu falla, ControlEvent solo puede usar plantillas cerradas sobre esos eventos; nunca caer a 20 eventos ni al evento activo arrastrado.
- `METEO` queda reconocido como módulo de planificación.
- La extracción de módulos en alcance cerrado usa exclusivamente los `eventIds` resueltos por el plan y no mezcla el plan local preventivo.

No se ha tocado frontend, logon, selector, ColtyLAB, Resumen, Gráficas, Vista aérea, Donaciones visuales ni ingresos.
