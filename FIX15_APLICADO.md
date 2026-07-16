# ControlEvent v22_prod · FIX15

Cambios aplicados:

- Se retira el optimismo/refresco repetido de INGRESOS de FIX12/FIX13 para evitar datos antiguos y temblores.
- El guardado de INGRESOS/COLABORADORES queda en CRUD directo: usa la fila devuelta por Supabase, repinta solo Ingresos y sombrea la fila.
- La baja de Ingresos desaparece en pantalla sin esperar a refresco global.
- Vista aérea: SEGMENTO se desplaza 6 caracteres a la derecha, letra de cabeceras/detalle ajustada.
- Vista aérea: sólo queda iluminada la opción realmente activa: Ver todo de INGRESOS, Ver todo de PRODUCTO DISPONIBLE o el SEG/DEST pulsado.
- Resumen Presupuestario / Cálculos por tienda y ticket: se reordena por tienda o por ticket y los pendientes/totales ya no quedan agrupados todos al final.
- Se reduce la recarga del desplegable de eventos para que no haga boot/fetch repetido al abrir el selector.

