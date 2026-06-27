# HOTFIX51 - Rebase sobre HOTFIX49

Base: CE_v15_PROD_HOTFIX49_MODAL_AVANCE_SALDO.zip
Versión visible mantenida: v15_prod

Correcciones:

1. Desactivada la manipulación de títulos de visores de HOTFIX48 y HOTFIX49 para evitar títulos duplicados.
2. Añadido `v15-hotfix25-rebase49-correcciones.js`:
   - Normaliza visores de justificante de ingreso solo sobre clases de modal reales.
   - Normaliza visores de ticket/TKxx solo sobre clases de modal reales.
   - No escanea ni reescribe el body completo.
   - Elimina duplicados de título del evento y de “Justificante de ingreso” dentro del modal.
   - Ordena tablas por Producto A-Z.
   - Fuerza colores de AVANCE DEL EVENTO por línea y por barra.
3. Modificado `planificacion-inicial.js`:
   - El ajuste de saldo usa resolución reforzada de productos por tokens para Ron Barceló, Whisky JB, Coca Cola, Coca Cola Zero, Coca Cola Zero-Zero, Beefeater, cerveza y hielo.
   - Si saldo/compras supera el 35%, añade/refuerza compras siguiendo el orden pactado.
   - No baja el saldo por debajo del 20% de las compras iniciales.

Prueba aconsejada:
- Ctrl+F5 tras desplegar.
- Probar justificante de ingreso y TKxx antes de seguir pruebas largas.
- Probar creación desde planificación con ingresos 660 y compras ~448 para verificar que añade compras extra.
