# ControlEvent v20_prod FIX25 - bienvenida Peña El Arrastre

Cambio aplicado sobre `CE_v17_PROD_FIX24_IDLE_QUIET.zip`.

## Qué cambia

- Se añade el logo `penya-el-arrastre-welcome.png` en `public/assets/icons/`.
- La pantalla post-login sin evento seleccionado deja de quedarse en blanco: muestra el logo centrado, tamaño medio y sin tarjeta, sombra, texto ni animación.
- Al elegir evento, el logo se oculta inmediatamente antes de cargar la ventana de `GRAFICAS`.
- No se toca carga de datos, cálculos, fotos, permisos ni refrescos.

## Archivos tocados

- `public/index.html`
- `public/app/features/v17-hotfix-logo-graficas-clean.js`
- `public/app/features/v17-fix25-welcome-elarrastre.js`
- `public/assets/icons/penya-el-arrastre-welcome.png`

También se replica el cambio en los duplicados raíz que ya venían en el ZIP.
