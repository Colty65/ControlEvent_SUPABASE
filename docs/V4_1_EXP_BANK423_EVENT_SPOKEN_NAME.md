# BANK4_23 · Nombre hablado de EVENTOS

Se añade `ce_eventos.nombre_hablado` como dato autoritativo para la respuesta oral de Zuzu.

- `titulo`: nombre canónico/visual. No se modifica.
- `nombre_hablado`: cómo debe pronunciarse el evento.
- Si `nombre_hablado` está informado, la capa oral lo usa literalmente.
- Si está vacío, se mantiene como fallback la humanización oral previa.
- El campo se edita en Mantenimiento > EVENTOS, tanto al alta como al modificar.
- El backup Excel incluye `EVENTO_NOMBRE_HABLADO` y la restauración lo recupera.

No se añaden nombres de evento hard-code al motor. Los ejemplos del SQL están comentados y son solo orientativos.
