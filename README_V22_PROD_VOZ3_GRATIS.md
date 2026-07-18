# ControlEvent v22_prod · VOZ3 GRATIS

Base: **v22_prod_voz2**.

## Objetivo

Mantener el dictado por micrófono y mejorar la lectura sin contratar Azure, OpenAI ni otro servicio. La salida utiliza únicamente `speechSynthesis` y las voces españolas que ofrece cada dispositivo.

## Cambios

- Eliminadas las rutas y servicios TTS de Azure/OpenAI.
- No requiere variables de entorno nuevas ni facturación.
- Perfiles **Femenina recomendada** y **Masculina recomendada**.
- Selector de la voz concreta disponible en ese aparato.
- Clasificación automática que prioriza español de España y voces natural, neural, premium, enhanced u online cuando el navegador las expone.
- Botones **Buscar voces** y **Mejorar voz gratis** con instrucciones adaptadas a iPhone/iPad, Android y Windows.
- La voz elegida se guarda localmente y puede ser distinta en cada dispositivo.
- Lectura por fragmentos cortos para aumentar la estabilidad en Safari, iPhone e iPad.
- Conversión oral de euros, porcentajes, fechas, horas, tickets, temperaturas, kilómetros por hora, litros, mililitros, centilitros y kilogramos.
- Se conserva el micrófono abierto controlado, la lectura automática opcional y los controles de pausa, continuación y detención.

## Compatibilidad prevista

- PC: Chrome y Edge.
- iPhone/iPad: Safari o PWA, sujeto a las voces que WebKit exponga.
- Android: Chrome y motor de síntesis instalado.

La voz no puede ser idéntica en todos los aparatos porque cada sistema ofrece su propio catálogo. En todos los casos el coste de lectura para ControlEvent es **0 €**.

## Sin cambios en Zuzu

No se modifican el planificador, SELECT, extracción, cálculos, redacción, tablas, gráficas ni PDF.
