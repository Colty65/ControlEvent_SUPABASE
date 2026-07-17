# ControlEvent v22_prod - FIX7

## 1. Misma comparativa, resultado estable
- Una redacción cortada o incompleta ya no se considera un fallo definitivo.
- Tras el reintento guiado del primer modelo, ControlEvent prueba el siguiente modelo antes de recurrir a una redacción local.
- La redacción local de respaldo para comparativas usa ahora las tablas actuales "Resumen económico por evento" y "Participación y documentación por evento", incluyendo todos los eventos y no solo la primera fila.
- Se mantiene la meteorología y la conclusión cuando fueron solicitadas.

## 2. El colegueo no se convierte en filtro
- Saludos como "tronquete", "cómo vas por Tembleque", "ya me conoces" o "curres un poco" se interpretan como tono, no como nombres de persona, tienda, producto o evento.
- En peticiones de agrupación por SEGMENTO/DESTINO se limpian filtros espurios del planificador antes de extraer COMPRAS y PRODUCTOS.

## 3. Gráfica de queso SEGMENTO/DESTINO
- Nueva salida determinista para compras agrupadas por SEGMENTO + DESTINO y situación.
- Incluye queso general, quesos parciales por cada combinación no vacía, tabla de totales parciales y total general.
- Colores fijos: Pte. Compra rojo, TKxx azul y GASTOS CORRIENTES negro.
- Se reconocen como sinónimos: queso, tarta, pastel, pie y donut.

## 4. Evita el informe genérico equivocado
- La palabra "situación" por sí sola ya no activa un informe general del evento cuando se usa para describir el color o estado de una gráfica.

## Validaciones realizadas
- Sintaxis Node correcta en event-ai.service.js, event-context.service.js y v11-3-zuzu-analitica-libre.js.
- Prueba sintética del prompt coloquial: recupera todas las compras aunque el planificador proponga "Tembleque" como filtro.
- Prueba sintética de quesos: total general, parciales, tabla y colores correctos.
- Prueba sintética de comparativa de tres eventos: conserva cifras, saldos y separación entre realizado y pendiente.
