# v6_1-exp · Gate final de fidelidad de síntesis

Objetivo: comprobar que Gemini verbaliza el dataset certificado por CE sin alterar ni el orden físico ni los valores escalares.

## Prueba manual

1. `¿Qué eventos están finalizados?`
2. `Ordénamelos del más reciente al más antiguo por fecha de inicio.`
3. `Ahora al revés, del más antiguo al más reciente.`

## Criterio de aceptación

- En 2 y 3, la respuesta debe conservar exactamente las fechas que llegan en `resolved_materials`.
- No se permite inventar, corregir ni reformatear fechas durante síntesis.
- El orden visible debe coincidir exactamente con `schema.order_by` y con la secuencia de `rows` certificada por CE.
- No debe aumentar el número de llamadas respecto al flujo normal: decisión + síntesis cuando hay ejecución de datos.
- No se ha ampliado el presupuesto de contexto ni el límite de salida respecto al FIX4.

Si estas tres pasan, ejecutar la misma `ITV v6_1 CRUSH · 40` sin modificar la batería.
