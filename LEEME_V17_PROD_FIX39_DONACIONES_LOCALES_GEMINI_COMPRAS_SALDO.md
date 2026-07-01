# v17_prod FIX39 - Planificación: donaciones locales + Gemini solo menú/compras + saldo

Base: CE_v17_PROD_FIX38_PLANIFICACION_JSON_DIRECTO_Y_SALDO.zip

Objetivo de esta versión:
- No pedir a Gemini que repita las 40-50 donaciones completas.
- Extraer y crear las donaciones/existencias localmente desde el prompt.
- Pasar a Gemini el prompt formateado, los momentos, un resumen de donaciones y PRODUCTOS relevantes.
- Pedir a Gemini solamente `menuResumen`, `compras` y `avisos`.
- Procesar compras conservando el producto original si cambia formato/capacidad.
- Aplicar regla de saldo positivo después de la propuesta.

Cambios principales:
1. Parser local robusto FIX39 para bloques:
   - `Donado socio - ... / Responsable ...`
   - `Donado tienda - ... / Responsable ...`
   - `Donado otros - ... / Responsable ...`
   - `Producto en la Peña`, `Existencias`, `Ya tenemos`.
2. Gemini ya NO debe devolver donaciones completas; solo las usa para calcular déficit.
3. El prompt a Gemini queda más corto: menú + compras + avisos.
4. Si Gemini devuelve JSON parcial, ControlEvent intenta recuperar arrays completos (`menuResumen`, `compras`, `avisos`) antes de descartar.
5. Regla de saldo positivo backend:
   - ingresos previstos = asistentes × presupuesto objetivo/persona.
   - si saldo/compras > 25%, añade compras por prioridad.
   - objetivo: dejar saldo/compras alrededor de 10%, sin saldo negativo.
   - prioridad: cerveza, Coca-Cola normal, Coca-Cola Zero, Coca-Cola Zero-Zero, hielo, Ron Barceló, Whisky JB, Beefeater, Fantas, tónica, Sprite, Brugal.

No se ha tocado:
- GRAFICAS.
- RESUMEN PRESUPUESTARIO.
- Globos.
- Fotos.
- Compras normales fuera de planificación.
