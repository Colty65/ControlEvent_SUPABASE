# Hotfix v11.1 - Analítica libre y contexto completo

Base: CE_v11_1_PROD_GEMINI_CONTEXTO_SEGURO.zip.

Cambios:
- La ventana pasa a llamarse **Analítica libre**.
- El botón de entrada en GRAFICAS queda reforzado para iPad con click/touchend/pointerup.
- El contexto seguro enviado a Gemini incluye el detalle calculado de todos los eventos, no solo los seleccionados por coincidencia de texto.
- Se mantiene la seguridad: Gemini no ejecuta SQL ni accede directamente a Supabase. Solo recibe JSON de solo lectura calculado por ControlEvent.
- Se amplía el límite de contexto enviado a Gemini para evitar que se recorten detalles de compras/donaciones/ingresos de eventos citados.

No cambia la versión visible: sigue v11.1_prod.
