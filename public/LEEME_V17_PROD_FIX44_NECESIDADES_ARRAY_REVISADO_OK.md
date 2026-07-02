# v17_prod_FIX44_NECESIDADES_ARRAY_REVISADO_OK

Base: v17_prod_FIX43_NECESIDADES_TEORICAS_SALDO_INFRA.

Cambios:

1. Planificación inicial / Encargo total a Zuzu
   - Gemini ya no recibe un JSON grande ni debe devolver objeto con menuResumen/compras/donaciones.
   - Se le pide SOLO un ARRAY JSON de necesidades teóricas totales.
   - Se fuerza responseSchema de ARRAY simple para evitar cortes JSON.
   - Se reduce el prompt enviado a Gemini.
   - Si Gemini devuelve un array parcial, ControlEvent rescata los objetos completos ya recibidos.
   - Si Gemini falla o devuelve muy poco, ControlEvent completa necesidades base por cálculo local usando el prompt: días, asistentes, cerveza, cubatas, calor, cena real, comida indicada e infraestructura.
   - Después ControlEvent descuenta donaciones/existencias y calcula déficit.

2. Líneas REVISAR / naranja
   - El botón “Dar por revisado” queda operativo mediante listener delegado.
   - Se elimina el botón duplicado dentro de la sublínea de donación.
   - Al revisar, se marcan también copias equivalentes del mismo producto.

3. Saldo e infraestructura
   - Se conserva el ajuste proporcional de saldo.
   - Se mantiene infraestructura cuando el saldo inicial lo permite: secamanos, Fairy, bolsas, lavavajillas, abrillantador, jabón.

No se han tocado gráficas, resumen presupuestario, globos ni fotos.
