# ControlEvent v4_1_exp · VNext P1.15 · ITV Decision Map · NHC

## Objetivo
Convertir cada resultado de las baterías de lenguaje en una decisión de ingeniería: dónde tocar y por qué, sin añadir interpretación lingüística al runtime de Zuzu.

## Categorías
- `OK`: no tocar.
- `ITV`: Zuzu/CE parecen correctos, pero el laboratorio no puede certificar el efecto.
- `CAPABILITY_GAP`: el oráculo demuestra una necesidad para la que VNext no dispone hoy de un contrato general equivalente.
- `CONTINUITY`: existe la capacidad, pero el turno no conserva/materializa el contrato anterior.
- `GEMINI_GUIDANCE`: existe una capacidad suficiente, pero no se selecciona/materializa correctamente.
- `CE_DATA_CONTRACT`: Gemini llega al contrato esperado y la discrepancia aparece en ejecución, semántica del contrato o datos devueltos.
- `DERIVATION_PRESENTATION`: los datos/contrato son adecuados, pero falta calcular, seleccionar o expresar la respuesta pedida.
- `TECHNICAL`: fallo técnico/timeout.
- `INDETERMINATE`: falta evidencia para asignar una capa única.

Cada resultado exporta `decisionDiagnosis` con categoría, zona a tocar, confianza, capacidad esperada, capacidad observada y motivo. La ITV muestra además el agregado `MAPA DE DECISIÓN` y permite filtrar por estas categorías.

## NHC
`services/event-ai.service.js` permanece byte a byte idéntico a P1.14. El clasificador trabaja exclusivamente con `oracle.kind`, grupo de prueba, `resultContext`, herramientas ejecutadas, operación tipada y resultado del oráculo. No interpreta palabras del prompt ni enseña a Zuzu a aprobar la batería.

## Sobre un registro/tablas de combinaciones JSON
La idea es útil si se convierte en un **registro de contratos**, no en una lista de frases ni en una tabla que autoapruebe JSON desconocidos.

Modelo recomendado futuro:
1. Mantener `operation` como discriminador obligatorio.
2. Por operación: claves requeridas, opcionales, tipos, enums, incompatibilidades, resultado esperado y capacidades derivadas.
3. Canonicalizar cada llamada como `operation + claves + tipos`, ignorando los valores concretos.
4. Si la firma está soportada, ejecutar.
5. Si es una variante desconocida de una operación conocida, registrar una **observación PENDING**, pero no convertirla automáticamente en ejecutable.
6. Si la operación/capacidad no existe, registrar `CAPABILITY_GAP` con frecuencia y ejemplos de ITV.
7. Solo una decisión de desarrollo promueve una observación a `SUPPORTED`.

La fuente de verdad debe ser única: idealmente el mismo registro genera el JSON Schema que se entrega a Gemini y la validación de CE. Evitar duplicar una tabla y un schema escritos a mano, porque acabarían divergiendo.
