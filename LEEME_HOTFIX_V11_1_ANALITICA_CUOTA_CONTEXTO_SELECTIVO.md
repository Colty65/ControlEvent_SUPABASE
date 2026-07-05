# Hotfix v11.1_prod - Analítica libre, cuota Zuzu y contexto selectivo

Este hotfix no cambia la versión visible: sigue siendo v11.1_prod.

## Motivo
La versión anterior enviaba a Zuzu el detalle completo de todos los eventos. Eso mejora disponibilidad de datos, pero en el plan gratuito de Zuzu puede disparar cuota/tokens y provocar errores tipo `Quota exceeded`, especialmente con modelos como `gemini-2.0-flash-lite`.

## Cambios
- Se mantiene un resumen calculado de todos los eventos.
- Ya no se envía siempre el detalle completo de todos los eventos.
- Se envía detalle completo solo de:
  - evento activo,
  - eventos citados en el prompt,
  - eventos más recientes si el prompt pide “más reciente”, “último”, etc.
- Para preguntas concretas por producto, tienda, responsable o ticket, se añade un bloque filtrado `lineasFiltradasPorPrompt` con coincidencias en todos los eventos. Ejemplo: cerveza, agua, tickets TKxx, tiendas, responsables.
- Se reduce el límite máximo de contexto enviado a Zuzu para evitar peticiones gigantes.
- Se elimina `gemini-2.0-flash-lite` de la lista de fallback de Analítica libre, porque está dando errores de cuota/modelo en algunos entornos.

## Seguridad
Zuzu sigue sin acceder directamente a Supabase, SQL ni BBDD. Solo recibe JSON preparado por ControlEvent, de solo lectura.

## Recomendación
Si aún aparece `Quota exceeded`, revisa en Vercel que no tengas configurado `GEMINI_MODEL=gemini-2.0-flash-lite` y usa preferentemente `gemini-2.5-flash` o `gemini-flash-latest`.
