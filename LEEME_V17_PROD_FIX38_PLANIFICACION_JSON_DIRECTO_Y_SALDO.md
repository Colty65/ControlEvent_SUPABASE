# v19_prod_FIX38_PLANIFICACION_JSON_DIRECTO_Y_SALDO

Base: FIX37_PLANIFICACION_JSON_BARRIL_EXACTO.

Cambios aplicados solo en Planificación inicial / Encargo total a Zuzu:

1. Zuzu recibe el prompt del usuario formateado como fuente principal, sin convertirlo en una estructura interna pesada.
2. Zuzu recibe PRODUCTOS de catálogo relevantes con nombre, precio, segmento, destino y tienda.
3. En Encargo total se pide JSON directo, no `rows` internas:
   - `menuResumen`
   - `donaciones`
   - `compras`
   - `avisos`
4. ControlEvent convierte ese JSON directo a filas internas después:
   - Donaciones: producto, tipoDonacion, donante, responsable.
   - Compras: producto, tienda, responsable, unidades/precio si vienen.
5. Si Zuzu devuelve donaciones directas, se respetan sus donantes/responsables y el parser local solo añade faltantes.
6. El encabezado genérico “Donaciones y existencias confirmadas” ya no se toma como donante “Existencias”.
7. Si el catálogo cambia formato/capacidad (por ejemplo barril 50l vs 30l), se conserva el producto escrito por Zuzu/usuario como revisable, sin forzar sustitución.
8. Ajuste automático de saldo en frontend:
   - Si saldo = ingresos previstos - compras previstas supera el 25% de compras previstas.
   - Añade compra por prioridad hasta dejar el saldo alrededor de máximo 10%, sin dejar saldo negativo.
   - Prioridad: cerveza, Coca-Cola normal, Coca-Cola Zero, Coca-Cola Zero-Zero, hielo, Ron Barceló, Whisky JB, Ginebra Beefeater, Fantas, tónicas, Sprite, Brugal.

No se han tocado GRAFICAS, RESUMEN PRESUPUESTARIO, globos, fotos ni mantenimientos.
