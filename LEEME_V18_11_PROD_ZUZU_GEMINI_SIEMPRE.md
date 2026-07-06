# ControlEvent v18.11_prod · Zuzu/Gemini siempre en el flujo final

Cambios aplicados sobre v18.10_prod:

- Se cambia el flujo de Zuzu para seguir la arquitectura pedida:
  1. El usuario escribe el prompt completo.
  2. Zuzu/Gemini recibe el prompt y devuelve módulos/filtros necesarios en JSON estricto.
  3. ControlEvent extrae los datos oficiales de esos módulos desde su estado/Supabase.
  4. Zuzu/Gemini recibe el prompt original + datos cocinados por ControlEvent y redacta la respuesta final.
  5. ControlEvent solo presenta la respuesta, tablas, gráficas y ficheros.

- Eliminada la restricción de ahorro de cuota introducida en v18.10: el planificador vuelve a consultar Zuzu/Gemini de forma normal.
- Desactivada la caché temporal de planificación/redacción para que cada petición se recontextualice de verdad.
- Se mantienen logs de uso de tokens en Vercel:
  - PASO 1 planificación de datos.
  - PASO 2 respuesta final estructurada.
  - PASO 2 redacción humana.

- Se conserva Gemini 2.5 Flash como modelo prioritario mediante REST v1beta ya existente en el backend, sin añadir dependencias inseguras ni mover la clave al cliente.

- Si ControlEvent calcula localmente un resultado de alta confianza, ese resultado ya no se entrega directamente como respuesta final: se entrega a Zuzu/Gemini para que lo contextualice y redacte.

- PDF / impresión:
  - La cabecera ya no arrastra siempre el evento activo.
  - Si la respuesta corresponde a otro evento, muestra ese evento.
  - Si la respuesta es global, muestra “Consulta global · N eventos”.
  - La fecha/hora va arriba a la derecha y en negrilla.
  - El título del documento se genera como:
    ControlEvent_v18_11_prod-responde_Zuzu_a_<asunto>-aaaammdd-hhmmss.pdf

- Tablas y gráficas:
  - Se mantienen las ordenaciones por evento/tienda/ticket/producto, evento/donante/producto y evento/papel/relacionado/producto.
  - Se conservan las mejoras visuales de gráficas finas de v18.10.

Validación realizada:
- node --check services/event-ai.service.js
- node --check services/event-context.service.js
- node --check public/app/features/v11-3-zuzu-analitica-libre.js
- node --check public/app/features/planificacion-inicial.js
