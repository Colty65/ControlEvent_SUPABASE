# RAW14R · Memoria proactiva humana

- Mantiene íntegra la memoria episódica RAW14Q.
- La búsqueda proactiva ya no se corta a 4 días: recorre histórico recordable con umbrales crecientes según antigüedad.
- Da más peso a entidades coincidentes aunque cambie el dominio de la consulta (por ejemplo Esther: ficha, compras, donaciones o saldos).
- También puede sugerir recuerdos en conversación social/ociosa cuando la similitud es suficientemente fuerte.
- Introducción temporal calculada por CE y siempre con el usuario:
  - pocas horas: «Vaya cabecita que tienes {usuario}, el tío Zuzu te lo recuerda.»
  - hasta 4 días: «{usuario}, se te ha ido un poco la olla desde hace N días; el tío Zuzu te refresca la memoria.»
  - varios días a unos meses: «Madre mía, {usuario}, esto ya estaba cogiendo polvo en el cajón de Zuzu; espera, que te refresco la memoria.»
  - recuerdo antiguo: «Yo lo tengo fresco {usuario}, ahora te cuento y te pondrás tan contento.»
- La conversación histórica se presenta antes de la respuesta nueva; los datos antiguos siguen siendo solo memoria y la consulta actual usa CE/BBDD vigente.
- No hay cambios SQL respecto a RAW14Q.
