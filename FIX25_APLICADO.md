# FIX25 aplicado sobre v20_prod FIX24

Cambios:
- Selector de eventos: se neutralizan los parches anteriores del selector antes de login; el orden por fecha y color se aplican solo al usar el desplegable o al cargar evento.
- AVANCE DEL EVENTO: INFO SOCIOS cuenta nombres con " y " como 2; DONACIONES muestra valor estimado; COMPRAS muestra valores por TKxx/gastos corrientes, Pte. compra y total, y la barra avanza por compras realizadas.
- Zuzu / Planificación Inicial: criterio de SOCIOS ControlEvent reforzado (rango SOCIO, excluye z_DEV/Grupo/Peña, grupos "y" cuentan 2 y sustituyen componentes individuales).
- No se tocan descuentos, ingresos, vista aérea ni descargas.
