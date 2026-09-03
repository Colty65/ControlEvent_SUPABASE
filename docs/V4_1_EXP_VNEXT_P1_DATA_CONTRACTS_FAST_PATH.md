# ControlEvent v4_1_exp · Zuzu VNext P1

## Objetivo

P1 conserva el principio open-world de VNext P0: cualquier frase humana puede continuar como conversación y no necesita compilarse a una operación CE. La diferencia es que las consultas de datos dejan de usar un `query_ce` genérico y se traducen a contratos empresariales estrechos y verificables.

## Contratos de datos

- `people_catalog`: personas/socios + identidad social.
- `events_catalog`: eventos + nombre hablado.
- `person_profile`: dossier general de una identidad.
- `person_events`: eventos vinculados a una identidad.
- `person_income_status`: estado de ingreso de UNA persona/pareja en UN evento.
- `event_income_status`: filas de ingreso filtradas por estado del propio ingreso.
- `event_income_lines`: líneas de ingreso una por una.
- `event_attendance`: asistencia, sin inferir pagos.
- `event_summary`, `event_purchases`, `event_donations`, `event_bank`, `event_weather`, `event_stores_used`, `event_products`, `compare_events`.

El propósito es que una consulta de ingresos no pueda degradarse a donaciones, asistencia o banco agregado.

## Reparación de tipo

La reparación no depende de vocabulario. Si el modelo pide `event_summary("La Estercita")` pero el registro de entidades acredita que «La Estercita» es una persona, P1 conmuta a `person_profile(Esther)`. El mismo criterio funciona a la inversa para un evento pasado erróneamente como persona.

## Latencia

Ruta normal:

1. Una Interaction corta decide `conversation/data/documents/memory` y, si procede, la operación empresarial.
2. ControlEvent ejecuta el dato localmente.
3. ControlEvent redacta localmente la respuesta factual.

Por tanto, la mayoría de consultas normales consumen **una sola llamada IA**. Una segunda Interaction solo se permite cuando `needs_narration=true`, reservado para redacciones, historias o explicaciones elaboradas solicitadas explícitamente.

La traza desglosa `IA decisión`, `datos`, `IA narración`, `llamadas IA`, tokens y tiempo total.

## Hechos de sesión

Las correcciones explícitas del usuario son hechos válidos de la conversación nativa y deben utilizarse inmediatamente. P1 no afirma haber actualizado Supabase. Si una corrección contradice la BBDD, debe distinguirse la fuente: «según ControlEvent» frente a «según lo que me acabas de indicar».

## Compatibilidad

BANK4_27 permanece como ruta A/B. No requiere SQL adicional.
