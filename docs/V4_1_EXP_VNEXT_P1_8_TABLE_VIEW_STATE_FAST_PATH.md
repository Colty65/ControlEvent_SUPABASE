# VNext P1.8 · Table View State + Fast Path

## Objetivo
Cerrar el problema recurrente de «quita / pon» en tablas sin añadir un compilador lingüístico. La tabla mantiene un estado de vista reversible.

## Filas
- `store_filter_mode=all|include|exclude` elimina la ambigüedad de listas vacías.
- «quita X» excluye X; «pon X» deshace esa exclusión.
- En modo `include`, «quita X» lo saca del conjunto incluido y «pon X» lo reincorpora.
- «solo tiendas A/B/C» sustituye el conjunto incluido.
- «tabla original» borra filtros de vista conservando evento, responsable, estado de compra y orden base.
- Los nombres truncados se canonicalizan contra el maestro y se evita que palabras genéricas como «tienda(s)» activen `TIENDA DE BARRIO`.

## Columnas
- «quita/oculta columna X» -> `hidden_columns`.
- «pon/recupera columna X» -> operación inversa.
- «solo columnas X,Y» -> `visible_columns`.
- «tabla original» restaura también columnas.

## Continuidad
- Si Gemini no emite tool ante una modificación inequívoca de la tabla anterior, CE sintetiza localmente el mismo contrato `event_purchases` y aplica solo el cambio de vista.
- Una petición plural de quienes ya han pagado cambia a `event_income_status(received)` aunque el turno anterior estuviera centrado en una persona.
- «este evento» se resuelve físicamente al evento visible aunque Gemini lo mande literalmente.

## Latencia
No se añade ninguna llamada IA. Se conserva Gemini + Supabase en paralelo y cierre factual local.
