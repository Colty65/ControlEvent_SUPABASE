# ControlEvent v17_prod_FIX40_DONACIONES_LOCAL_GEMINI_COMPRAS_CAPADAS

Base: CE_v17_PROD_FIX39_DONACIONES_LOCALES_GEMINI_COMPRAS_SALDO.

## Objetivo
Corregir Planificación inicial tras revisar el INFOEVENTO generado por FIX39 y mejorar la lectura visual de Compras/Donaciones.

## Cambios

1. Visualización humana de ids
   - Nuevo módulo `v17-fix40-human-labels-planificacion.js`.
   - Traduce en pantalla `P-id...` y `T-id...` a nombres de PERSONAS/TIENDAS en Donaciones, Compras y Planificación.
   - Solo afecta a la visualización: no modifica base de datos ni datos guardados.

2. Parser de donaciones reforzado
   - Nuevo parser específico para bloques:
     - `Donado socio - Peña El Arrastre / Responsable Colty`
     - `Donado socio - Pocholo y Celes / Responsable Pocholo`
     - `Donado tienda - ... / Responsable ...`
     - `Donado otros - Torres bus / Responsable Juan Carlos García`
   - ControlEvent debe crear las donaciones localmente desde el prompt.
   - Gemini ya no debe devolver las donaciones completas; solo las usa como existencias para calcular déficit.

3. Formato/capacidad protegidos
   - Si Gemini o el buscador encuentra un producto parecido pero cambia formato/capacidad, se conserva el producto escrito y queda revisable.
   - Ejemplos protegidos:
     - barril 50l no se transforma en barril 30l.
     - lata no se transforma en botella 2l.
     - botella no se transforma en lata.

4. Compras absurdas capadas
   - Se añade tope operativo para hielo y tónica si Gemini o el ajuste de saldo infla cantidades.
   - Hielo: tope operativo calculado por personas/días con mínimo 35 bolsas.
   - Tónica: tope operativo por asistentes, evitando miles de latas.

5. Regla de saldo positivo con topes
   - Sigue activa la regla:
     - si saldo / compras > 25%, reforzar compra por prioridad;
     - intentar dejarlo alrededor del 10%.
   - Ahora tiene máximos por producto para no gastar todo inflando una sola línea.

## Validación técnica
- `node --check` ejecutado en los JS modificados.
- ZIP comprobado con `unzip -t`.

## No tocado
- Gráficas.
- Resumen presupuestario.
- Globos.
- Fotos.
- Mantenimientos de datos salvo visualización de ids.
