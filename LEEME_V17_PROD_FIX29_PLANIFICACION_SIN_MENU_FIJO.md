# ControlEvent v18_prod FIX29 — Planificación Zuzu sin menú fijo

Base: `CE_v17_PROD_FIX28_PLANIFICACION_ZUZU_PROMPT_REAL_VERSION_OK.zip`.

## Cambio aplicado
- Se refuerza **Planificación inicial > Encargo total a Zuzu** para que el texto del usuario mande sobre el menú.
- Se añade un filtro anti-menú fijo en backend y frontend: en Encargo total se eliminan compras de **arroz/paella/marisco** si el usuario no pide literalmente paella, arroz, fideuá, marisco, gambones/gambas o almejas.
- También se eliminan compras de **barbacoa** (lomo, morcilla, panceta, chorizo) si el usuario no pide literalmente barbacoa, brasa, parrilla, plancha, asado o esos productos.
- Se corrige la lógica local antigua: la palabra genérica **comida/comer** ya no dispara arroz/paella; la palabra genérica **cena** ya no dispara barbacoa.
- El prompt enviado a Zuzu incluye la intención de menú detectada y reglas más duras: comida genérica no significa paella, cena genérica no significa barbacoa.
- El backend devuelve `version: v18_prod_FIX29_PLANIFICACION_SIN_MENU_FIJO`.
- La ficha ColtyLAB de bienvenida muestra `v18_prod_FIX29_PLANIFICACION_SIN_MENU_FIJO`.

## No tocado
- Ordenación de globos.
- GRAFICAS.
- Saldos.
- Login.
- Bienvenida, salvo la marca visible de versión.
- Fotos / adjuntos.
- Compras y donaciones normales fuera de planificación.
