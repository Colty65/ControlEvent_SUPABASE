# CE_v22_PROD_BASE_FIX28_PARTE6

Base: CE_v22_PROD_BASE_FIX27_PARTE5.

Cambios aplicados:

1. Meteorología en informes Zuzu
   - Si el prompt pide tiempo/meteorología o el plan CE incluye METEO, ControlEvent fuerza la consulta externa a Open-Meteo.
   - La traza muestra explícitamente el Paso 2b con RUN/OK/KO, evento, fechas y localidad.
   - Si no se obtienen datos externos fiables, se añade advertencia y Zuzu no debe inventar previsión.

2. Saldos en informes comparativos
   - Añadido Saldo actual: ingresos efectivamente realizados menos compras realizadas.
   - Añadido Saldo operativo: ingresos previstos menos compras previstas (realizadas + pendientes).
   - Añadidos Ingresos realizados, Ingresos pendientes y Compras previstas a la tabla resumen.
   - Sustituido el gráfico único de saldo por dos gráficos: saldo actual y saldo operativo.

3. Gráficos Zuzu
   - En barras apiladas se añade una línea de valores por evento debajo de la barra para que no se pierdan cifras de segmentos pequeños.
   - Se añade Compras pendientes como serie en el gráfico de ingresos/compras/donaciones.

No tocado: logon, selector, resumen normal, gráficas normales, vista aérea, ingresos/donaciones visuales.
