# HOTFIX50 - corrección real sobre v15_prod

No cambia la versión visible de la app: sigue mostrando `v15_prod`.

Cambios:

1. Modales de justificante de ingreso y foto de ticket:
   - Se elimina cualquier título duplicado del evento dentro del cuerpo.
   - Queda una sola cabecera: texto del modal + título del evento centrado, rojo/verde según estado.

2. AVANCE DEL EVENTO:
   - Se fuerzan colores reales por línea/barra: ingresos azul, fotos ingresos verde, donaciones naranja, compras rojo, documentos verde, fotos tickets morado.

3. Planificación inicial / saldo:
   - Se refuerza el ajuste cuando el saldo operativo supera el 35% de las compras.
   - El ajuste intenta comprar en el orden indicado por el usuario.
   - No baja el colchón por debajo del 20% de las compras iniciales.
   - Se mejora la búsqueda de productos del catálogo para Ron Barceló, Whisky JB, Coca-Cola normal/zero/zero-zero, Beefeater, cerveza y hielo, aunque los nombres del catálogo no coincidan exactamente.
   - También se reintenta el balance justo antes de crear el evento real.

Archivo nuevo: `public/app/features/v15-hotfix25-correccion-real50.js`.
Archivo modificado: `public/app/features/planificacion-inicial.js`.
