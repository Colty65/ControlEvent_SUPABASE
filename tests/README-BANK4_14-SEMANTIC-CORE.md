# BANK4_14 · Zuzu Semantic Core + respuesta humana

## Objetivo

BANK4_14 deja de corregir el lenguaje del usuario mediante una cadena de reglas posteriores a Gemini. El turno activo usa un solo marco `ce_semantic_turn`: Gemini decide una vez el acto, sujeto, alcance, referencia, operación y presentación; ControlEvent valida el contrato y ejecuta.

## Cambio de arquitectura

Antes: usuario → Gemini → FocusBindings / Repair* / reglas de elipsis / reglas de feedback / reglas de scope → ejecución.

Ahora: usuario + CURRENT_CONTEXT + RECENT_DIALOGUE + candidatos → Gemini (`ce_semantic_turn`) → validación estructural → ejecución física → presentación humana.

Las funciones Repair históricas se conservan por compatibilidad/regresiones, pero no se invocan desde `runZuzuV73Ledger`.

## Memoria

- Los candidatos históricos son evidencia, no decisión semántica.
- `memory_index` lo decide Gemini; solo después CE carga el inventario completo (hasta 200 episodios).
- El orden del índice (`oldest` / `newest`) viaja en el marco semántico; CE no vuelve a leer la frase.
- `recall_turn`, `recall_episode`, `resume_episode` y snapshots históricos no generan otro recuerdo recordable: se corta la recursión «recuerdo del recuerdo».

## Humanización

La fase final recibe `recent_turns` y `current_context` y tiene instrucciones explícitas para continuar la charla, evitar tono de call-center, no pedir al usuario que repita un contexto disponible y reconocer errores concretos de forma breve. `spoken_answer` se trata como habla real, no como lectura de un informe.

Se mantienen las microseñales solicitadas:

- `Ummm...................`
- `Calla............... ya lo tengo....., besitos muá.`

## Regresión específica

Ejecutar:

```bash
npm run test:v4-bank414
```

La suite comprueba que la ruta activa no ejecuta la cadena semántica Repair*, que solo usa `ce_semantic_turn`, que el estado conversacional se deriva del marco ejecutado y que la capa final conserva las reglas de respuesta humana.
