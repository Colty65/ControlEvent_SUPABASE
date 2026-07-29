# ControlEvent v25_prod · Cuadre Banco en evento Finalizado

## Cambio solicitado

Cuando el evento activo está **Finalizado**, Cuadre Banco continúa mostrando la conciliación completa en modo de consulta, pero ya no permite utilizar:

- Cuenta bancaria.
- Vista de control.
- Orden temporal.
- Campo de búsqueda.

Los cuatro controles aparecen deshabilitados, quedan fuera de la navegación por tabulador y sus manejadores ignoran cambios provocados por teclado o por eventos de interfaz.

## Vista aplicada al evento Finalizado

Al cargar un evento Finalizado, la cronología se normaliza automáticamente a:

- Vista: **Todos los movimientos**.
- Búsqueda: vacía.
- Orden: **Más joven → más antiguo**.
- Página: primera.

De esta manera, un filtro o búsqueda utilizado anteriormente no puede dejar movimientos ocultos en una pantalla cuyos controles ya están bloqueados.

## Operaciones que siguen disponibles

- Consulta y desplazamiento por la cronología.
- Paginación.
- Botón Actualizar.
- Cierre de la ventana.

Continúan bloqueadas, como ya ocurría, las operaciones de escritura: CSV, fechas, inclusión en saldo, asociación o desvinculación de TKxx y cuadre forzado.

## Instalación

Sustituir el contenido desplegado por el contenido completo de este paquete y realizar una recarga forzada (`Ctrl + F5`).

No requiere cambios SQL. La versión visible se mantiene unificada como **v25_prod**.
