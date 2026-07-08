# ControlEvent v18.11.7_prod · Zuzu indirectos y contexto temporal Gemini

Versión centrada en corregir informes de evento donde se solicitaban datos indirectos, especialmente meteorología.

## Cambios

- Se mantiene el flujo: usuario → Gemini planificador → ControlEvent extrae/cocina → Gemini redacta → ControlEvent presenta.
- ControlEvent entrega a Gemini un contexto temporal explícito:
  - fecha actual de ControlEvent;
  - fecha de inicio y fin del evento;
  - estado;
  - relación temporal: futuro, pasado o en curso/hoy.
- Gemini recibe también `datosIndirectos`, empezando por meteorología Open-Meteo cuando se haya consultado.
- Si el usuario pregunta por temperatura, tiempo, lluvia, viento o clima y Open-Meteo devuelve datos, Gemini debe incorporarlos en el texto principal.
- Se prohíbe a Gemini decir “no dispongo de esa información” cuando ControlEvent ya ha obtenido meteorología.
- Si el evento es futuro, el prompt obliga a redactar en futuro/condicional: “hará”, “está previsto”, “se espera”.
- Si Gemini incumple, ControlEvent no redacta localmente: reenvía a Gemini una corrección guiada con los datos concretos y deja traza.
- Los informes con datos del evento, meteorología o información indirecta pasan a Flash en modo `auto`, reservando Flash-Lite para consultas simples.
- Las tablas/gráficas meteorológicas se añaden antes de la redacción narrativa para que Gemini pueda verlas, y se evita duplicarlas en presentación/PDF.
- La tabla de meteorología se etiqueta como `Meteorología prevista` o `Meteorología registrada` según fecha.

## Validación realizada

- `node --check services/event-ai.service.js`
- `node --check services/event-context.service.js`
- `node --check public/app/features/v11-3-zuzu-analitica-libre.js`
- `node --check public/app/features/v18-11-7-version-trace.js`
- Búsqueda de restos funcionales v18.11.6 / v18_11_6.
- `unzip -t` del ZIP final.
