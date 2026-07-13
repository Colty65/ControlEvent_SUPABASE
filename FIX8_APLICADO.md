# ControlEvent v21_prod · FIX8

Base: CE_v21_PROD_BASE_FIX7.

Corrección puntual:
- Se restaura el catálogo de eventos de ejemplo dentro de `defaultState()` porque al dejarlo vacío el flujo de carga podía quedarse en `Cargando eventos...` tras el login.
- Se mantiene el filtro visual para que `Cena Verano` y `Comida Primavera` no aparezcan en el desplegable final.
- No se toca login, selector, Zuzu, Planificación, Resumen ni Avance respecto a FIX7.

Validado:
- node --check legacy-bundle-before-modules-v30.7.js
- node --check v16-hotfix5-logo-avance-ligero.js
- node --check v19-fix13-prod.js
- unzip -t
