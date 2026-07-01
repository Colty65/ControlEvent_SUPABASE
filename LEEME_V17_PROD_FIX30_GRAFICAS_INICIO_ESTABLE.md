# CE v17_prod FIX30 - Gráficas iniciales estables

Base: CE_v17_PROD_FIX29_SALDO_GLOBOS_GRAFICAS_ESTABLE.zip

Cambios aplicados:

1. GRAFICAS / primera selección tras login
   - Se corrige el caso en el que, al elegir el primer evento después del login, la ventana de Gráficas quedaba pintada en 0,00 € / Sin datos hasta cambiar de ventana o pulsar Refrescar.
   - Al terminar la carga scoped del evento se fuerza un render V46 real cuando hay datos del evento y el gráfico sigue en blanco.

2. Estado scoped de evento
   - Las cargas /api/state?eventId conservan los maestros globales: eventos, personas, productos y tiendas.
   - Si una respuesta scoped trae líneas sin eventId, se normalizan al evento seleccionado para que Gráficas no calcule contra “sin evento”.

3. Selector de evento
   - Se refuerza la sincronía entre state.selectedEventId y el desplegable, evitando que quede visible “Selecciona evento...” mientras la cabecera/estado ya apuntan a un evento.

4. Anti-retemblor en Gráficas
   - Se amplía la ventana de bloqueo de segundo commit y la espera de liberación de la instantánea durante cambios de evento.
   - Se añade un estabilizador final FIX30 que reintenta el render sin escribir repetidamente encima del DOM.

5. Ficha ColtyLAB
   - Pie actualizado a v17_prod_FIX30.

No se cambian cálculos, permisos, compras, donaciones, ingresos ni fotos.
