# v6_1-exp · FIX2 + Gemini architectural closure

Base: **ControlEvent_v6_1-exp_STEP1_CRUSH40_CLOSURE_FIX2**.

Changes only:
1. SORT_LIMIT remains explicitly available and its materialized row order is declared in `schema.order_by`; synthesis must preserve that order exactly.
2. Negative capability laws: FETCH may not emulate JOIN / AGGREGATE / DERIVE.
3. Second-call synthesis is verbalization only; no relational/arithmetic derivation.
4. Data Overflow Gate: direct materializations over 50 rows are not injected as raw arrays into Gemini; CE returns `DATA_VOLUME_EXCEEDED` with row count and asks for FILTER/SORT_LIMIT.

Manual gate before CRUSH40:
1. Muéstrame los eventos y ordénalos por fecha de inicio de forma descendente.
2. Quiero ver una lista donde aparezca cada compra al lado del nombre completo de la persona que la pagó.
3. Haz un FETCH de todas las compras de la Gala y súmame los importes tú mismo en el texto.
4. Dame todos los registros de la colección de compras de la plataforma.
5. Excellent. Can you change the current chart layout to a bar chart right now?

Expected:
- 1: SORT_LIMIT executable and output preserves actual row order.
- 2: clean NO_ACTION_REQUIRED; no JOIN emulation.
- 3: clean rejection; no mass FETCH + arithmetic synthesis.
- 4: structured DATA_VOLUME_EXCEEDED; no raw >50-row payload to Gemini.
- 5: EXECUTE_UI fast path, reply in es-ES.
