# ControlEvent v21_prod FIX30 — Planificación con Zuzu libre y resumen de menú

Base: `CE_v17_PROD_FIX29_PLANIFICACION_SIN_MENU_FIJO.zip`.

## Cambio aplicado

- Se elimina el enfoque anterior de borrar arroz/paella/barbacoa cuando Zuzu lo propone.
- En `Encargo total a Zuzu`, ControlEvent ya no debe meter compras locales de seguridad ni reconstruir el menú con imaginación local.
- Zuzu recibe el prompt completo del usuario, donaciones/existencias explícitas, catálogo y contexto de planificación.
- Se añade detección operativa de días escritos en el prompt. Si el texto dice 2, 3 o más días, esa duración se envía a Zuzu aunque el campo de días venga a 1.
- Se pide a Zuzu que devuelva `menuResumen` por día y momento:
  - `dia_1 (aperitivo)`
  - `dia_1 (comida)`
  - `dia_1 (tardeo/cubatas)`
  - `dia_1 (cena)`
  - y lo mismo para `dia_2`, `dia_3`, etc.
- El frontend muestra ese resumen al principio de la respuesta antes de las notas y antes del detalle de compras/donaciones.
- Paella/barbacoa ya no se eliminan si Zuzu las propone razonadamente; lo que se evita es que salgan como plantilla fija por defecto.

## Archivos tocados

- `services/event-ai.service.js`
- `public/app/features/planificacion-inicial.js`
- `index.html`
- `public/index.html`
- `app/features/v17-fix27-welcome-info-general.js`
- `public/app/features/v17-fix27-welcome-info-general.js`

## No tocado

- GRAFICAS.
- RESUMEN PRESUPUESTARIO.
- Ordenación de globos.
- Fotos/adjuntos.
- Login.
- Permisos.
