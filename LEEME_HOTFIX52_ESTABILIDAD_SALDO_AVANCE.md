# HOTFIX52 - Estabilidad desplegable, saldo y avance

Base: HOTFIX51 rebase 49.

Cambios:
- Se asegura que `public/index.html` cargue también los hotfix 24 y 25 antes del hotfix 26. Esto era clave: la app desplegada desde `public/` no estaba ejecutando esas correcciones.
- Se suaviza el hotfix 25 para que no escanee toda la página en cada mutación/mouseover, reduciendo interferencias con el desplegable principal.
- Se añade protección al desplegable principal de eventos para que no se quede con opciones en blanco mientras está abierto.
- Se fuerza color real por línea/barra en AVANCE DEL EVENTO y cierre más fácil: clic fuera del globo, botón X o autocierre más corto.
- Se refuerza la planificación de saldo dentro de `planificacion-inicial.js`: si saldo/compras > 35%, se añaden compras siguiendo el orden pactado y dejando colchón mínimo del 20%.
- Se recalcula el ajuste de saldo también al repintar la propuesta y justo antes de crear el evento real.
