# ControlEvent v50.24

Versión basada en la v30.4 estable de rendimiento.

## Cambios principales

- Mantiene la fluidez conseguida en PC, iPhone, iPad y Android.
- En **Mapa de productos**, se refuerza el cambio de etiqueta a **Compras producto** también en vistas/cachés móviles.
- Se añade `public/app/features/budget-tooltips-lite.js`.
- Los globos de **INGRESOS EN DINERO** y **DONACION DE PRODUCTO** del Resumen Presupuestario se aíslan del sistema antiguo de tooltips.
- Nuevo globo ligero por clic, sin `mousemove`, sin hover continuo y con tabla desplazable.
- No se modifica el comportamiento de **OPERATIVA**, que ya funcionaba bien.
- No se modifica la lógica de INFOEVENTO, BACKUP, Excel ni cálculos principales.
- Nuevo cache del service worker: `controlevent-shell-v50-24`.
