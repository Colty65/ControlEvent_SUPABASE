# v21_prod_FIX43_NECESIDADES_TEORICAS_SALDO_INFRA

Base: `CE_v17_PROD_FIX42_DIAGNOSTICO_NARANJA_DESTACADO.zip`.

Cambios aplicados:

1. Planificación inicial / Encargo total a Zuzu
   - Cambio de estrategia: Zuzu ya no devuelve compra final ni descuenta donaciones.
   - Zuzu recibe el prompt formateado sin bloques largos de donaciones, momentos del evento, reglas de consumo y catálogo útil.
   - Zuzu debe devolver primero `necesidadesTeoricas`: cantidades totales teóricas necesarias.
   - ControlEvent resta localmente las donaciones/existencias confirmadas y convierte el resultado en compra por déficit.
   - Se mantiene el menú resumen y avisos si Zuzu los devuelve.

2. Regla de saldo positivo
   - Mantiene ajuste si saldo/compras > 25% hasta acercarse al 10%.
   - Se mantiene prioridad proporcional: Coca-Cola acompaña Ron Barceló + Whisky JB + hielo; tónicas acompañan Beefeater + hielo.
   - Si el saldo inicial supera el 50% sobre las compras, añade también infraestructura imprescindible: papel secamanos, Fairy, bolsas de basura, lavavajillas, abrillantador y jabón de manos como INFRAESTRUCTURA - INFRAESTRUCTURA cuando exista o como línea revisable si falta catálogo.

3. Revisión de líneas naranjas
   - Las líneas procedentes del diagnóstico en estado REVISAR siguen resaltadas.
   - Añadido botón `Dar por revisado` en propuesta detallada y en detalle avanzado.
   - Al pulsarlo desaparece el estado naranja pendiente para esa línea/ficha.

No se han tocado gráficas, resumen presupuestario, globos, fotos ni mantenimientos fuera de la visualización ya afectada por FIX42.
