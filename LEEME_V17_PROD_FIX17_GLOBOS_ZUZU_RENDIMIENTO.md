# ControlEvent v17_prod FIX17 - Globos y Zuzu

Base usada: CE_v17_PROD_FIX13_TITULO_EVENTO_COLOR_ESTADO.zip

Cambios aplicados:

1. GRAFICAS / DONACIÓN DE PRODUCTO
   - Ordena por Donante y después Producto A-Z.
   - Inserta siempre el total del donante justo al finalizar sus líneas:
     Total <donante> ... importe

2. GRAFICAS / GASTOS, SALDO ACTUAL, SALDO OPERATIVO
   - Ordena por Tienda, después TKxx, después Producto A-Z.
   - Inserta total al terminar cada ticket:
     Total <tienda>, <TKxx> ... importe
   - Inserta total al terminar cada tienda:
     Total <tienda> ... importe

3. GRAFICAS / VALORACIÓN DEL EVENTO
   - Primero muestra DONACIONES DE PRODUCTO con agrupación de donaciones.
   - Después muestra GASTOS PREVISTOS con agrupación de gastos.

4. Zuzu en iPad/iPhone
   - Se aísla el campo de texto de Zuzu de los manejadores globales de input.
   - Se añade contención CSS al modal para no repintar la pantalla de gráficas al teclear.

No se han tocado fotos, miniaturas, visor de tickets, adjuntos, permisos, login ni carga de eventos.
