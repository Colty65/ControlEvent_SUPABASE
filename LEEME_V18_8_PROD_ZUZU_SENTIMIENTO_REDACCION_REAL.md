# ControlEvent v18.8_prod · Zuzu con redacción real y tono humano

Esta versión corrige el problema detectado en los informes: los datos salían bien, pero la redacción seguía siendo mecánica.

## Cambios principales

- La capa fría de ControlEvent sigue calculando datos, tablas, gráficas y CSV.
- Cuando el usuario pide informe, opinión, texto, valoración, chascarrillos, tono coloquial, técnico, financiero, Dirección o socios, se fuerza una segunda fase de Zuzu/Gemini para redactar la respuesta principal.
- Se amplía la detección de intención humana: `opinión`, `qué te parece`, `cómo lo ves`, `cuéntame`, `cositas`, `texto de 1 página`, `cachondo`, `chascarrillos`, `para dárselo`, etc.
- Zuzu recibe los datos oficiales resumidos y debe redactar como Zuzu, no como ControlEvent.
- El prompt de redacción prohíbe empezar con frases mecánicas tipo “He localizado X registros”.
- Para informes de participación de personas, se entrega más detalle a Zuzu para que pueda citar productos, papeles, importes y contexto.
- Si Gemini no responde, se aplica un respaldo local mejorado, pero dejando aviso.
- Versión visible y exportaciones actualizadas a `v18.8_prod` / `v18_8_prod`.

## Validación

- `node --check services/event-ai.service.js`
- `node --check public/app/features/v11-3-zuzu-analitica-libre.js`
- `node --check app/features/v11-3-zuzu-analitica-libre.js`
- `unzip -t` del ZIP final

No se ha podido probar contra Supabase/Gemini real desde este entorno.
