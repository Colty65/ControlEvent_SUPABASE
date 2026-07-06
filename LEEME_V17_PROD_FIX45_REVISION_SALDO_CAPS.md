# v18_prod FIX45 - revisión manual + límites de compra y proporciones

Base: FIX44_NECESIDADES_ARRAY_REVISADO_OK.

Cambios:

1. Botón "Dar por revisado"
   - Se corrige el listener del botón.
   - Ya no fuerza un render completo de la propuesta al pulsarlo, para que la pantalla no salte.
   - Cambia visualmente a estado verde "Revisado".
   - Elimina el naranja/REVISAR de la ficha y de sus copias equivalentes.
   - Se elimina el botón duplicado en el detalle avanzado; queda como aviso visual, y la decisión se toma desde la ficha principal.

2. Límites máximos operativos de compra
   - Cerveza lata/botellín: máximo 504 uds.
   - Coca-Cola lata/bote sumando normal, zero y zero-zero: máximo 504 uds.
   - Fanta naranja: máximo 168 uds.
   - Fanta limón: máximo 192 uds.
   - Tónica: máximo 120 uds.
   - Sprite lata 33cl: máximo 24 uds.
   - Sprite botella 2l: máximo 10 uds.
   - Otras bebidas: máximo 24 uds.
   - Carne de barbacoa: máximo 300 g/persona/día.
   - Pan barra: máximo 0,55 barras/persona/día.

3. Proporciones de bebidas alcohólicas
   - Ron: 60% Barceló, 30% Brugal, 10% otros/residual.
   - Whisky: 60% JB, 30% DYC 1L, 10% Jhonnie Walker.
   - Ginebra: 55% Beefeater, 30% Larios 1L, 15% Tanqueray/residual.

4. Saldo positivo e infraestructura
   - Se mantiene el ajuste de saldo positivo.
   - Si el saldo inicial supera el 50% de las compras, se puede reforzar infraestructura imprescindible:
     papel secamanos, Fairy, bolsas basura grandes, lavavajillas, abrillantador y jabón de manos.
   - Las líneas de infraestructura se catalogan como INFRAESTRUCTURA - INFRAESTRUCTURA cuando el catálogo lo permite.

No se han tocado gráficas, resumen presupuestario, fotos ni mantenimientos generales.
