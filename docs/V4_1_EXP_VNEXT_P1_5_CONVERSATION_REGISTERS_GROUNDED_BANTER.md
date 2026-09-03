# ControlEvent v4_1_exp · VNext P1.5 · Conversation Registers + Grounded Banter

P1.5 mantiene el fast path paralelo de P1.4 (una sola Interaction IA en consultas factuales normales) y separa de forma explícita el dato escrito de su oralización social.

## Registros
- FACTUAL/ESCRITO: pantalla, tablas, PDF e informes. Canónico y sobrio.
- NORMAL: conversación natural sin lenguaje de BBDD.
- CLOSE: amigo cercano de la Peña, con "nosotros", nombres hablados y motes de BBDD.
- BANTER: colegueo fuerte cuando el usuario lo marca; admite lenguaje coloquial y bromas, siempre ancladas a un hecho certificado.

`query_ce` acepta `register=normal|close|banter` y `tease=true` para un amago de vacile en hechos binarios ya certificados. La broma se corrige en la misma locución para no dejar un dato falso vivo. `search_documents` y `recall_memory` aceptan también `register`.

## Compras propias
`event_purchases` acepta `mine=true`. El servidor toma dinámicamente la identidad del usuario conectado, sin preguntar quién es. `order_by=store_product|product|store|amount_desc` ordena la salida. Esto cubre peticiones como "mis compras asignadas, por tienda y producto".

## Plan B / escenarios
Nueva operación `event_scenario` con `income_delta`. Recalcula localmente los ingresos y el saldo operativo hipotético sobre la base canónica sin modificar BBDD. Sirve para preguntas del tipo "si se caen 720 € de ingresos, cómo quedamos".

## Voz social
La capa `vnextP15SpokenAnswer` cubre personas, ingresos, asistencia, resumen de evento, compras, donaciones, banco, tiempo, tiendas, productos, comparativas y escenarios. Pantalla/PDF no reciben esta capa.

## Latencia
No se añade una segunda IA para la humanización. Gemini y Supabase siguen arrancando en paralelo; la oralización se compone localmente. La segunda IA queda reservada para narración/opinión expresamente solicitada.
