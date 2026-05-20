# ControlEvent v29.4

Versión correctiva sobre v29.3.

## Objetivo

Mantener el rendimiento conseguido en iPad/Android con V29.2/V29.3, pero corregir el efecto secundario detectado tras login:

- a veces el usuario GD no veía de inicio **Resumen Presupuestario** ni **Gráficas**;
- a veces, tras elegir evento, la app entraba pero no pintaba información hasta pasado un tiempo.

## Corrección

V29.4 añade un bootstrap controlado en dispositivos LITE:

- primer render autenticado tras login: render completo controlado;
- cambio real de evento: render completo controlado;
- resto de renders: se mantiene el render ligero de V29.3;
- sincronización inmediata de visibilidad por rol GD/RW/RO;
- reactivación inmediata de la pantalla actual sin depender de intervalos largos.

## Prueba recomendada

1. Abrir en iPad/Android.
2. Hacer login con usuario **GD**.
3. Confirmar que aparecen desde el principio:
   - INGRESOS
   - DONACIONES
   - COMPRAS
   - RESUMEN PRESUPUESTARIO
   - GRAFICAS
4. Elegir otro evento.
5. Confirmar que la pantalla presenta información sin esperar.
6. Probar INFOEVENTOS y BACKUP como en V29.3.

El diagnóstico sigue disponible con `?ceDiag=1`.
