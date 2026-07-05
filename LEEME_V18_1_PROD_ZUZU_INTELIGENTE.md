# ControlEvent v18.1_prod · Zuzu inteligente

Versión generada sobre `CE_v18_PROD_ZUZU_PLANIFICADOR_MODULOS.zip`.

## Cambios principales

- Corregida la clave de Zuzu en `services/event-ai.service.js`: la variable `GEMINI_API_KEY` ya se usa correctamente y no queda bloqueada por una variable inexistente.
- Zuzu deja de responder con volcados técnicos de EVENTOS/DOCxx cuando la pregunta pide donaciones o productos.
- Las consultas tipo “qué eventos y qué productos ha/han donado X” ahora se resuelven cruzando DONACIONES por donante/persona y evento.
- Las consultas dentro de un evento concreto respetan solo ese evento y no mezclan otros eventos.
- Las consultas abiertas “qué eventos...” ya no se limitan al evento seleccionado: buscan en todos los eventos cuando el texto lo pide.
- Las gráficas/rankings de productos consumidos usan COMPRAS + DONACIONES + PRODUCTOS, no EVENTOS como dato principal.
- Para rankings temporales por evento se genera una gráfica `stackedBar` con eventos en orden temporal y series por producto.
- Se detectan años escritos en el prompt, por ejemplo 2025, y se filtran los eventos por ese año.
- Se reduce la extracción innecesaria de INGRESOS/TICKETS/DOCUMENTOS en consultas de productos, bajando volumen y evitando el mensaje de “petición más concreta” en casos manejables.
- EVENTOS ya no trae DOCxx salvo que se pida explícitamente DOCUMENTOS/documentos/DOCxx.
- Los listados de respaldo dejan de mostrarse como “fase de diagnóstico” y se presentan como consulta directa.
- Versión visible actualizada a `ControlEvent v18.1_prod`; exportaciones generadas por Zuzu usan sufijo `v18_1_prod`.

## Pruebas realizadas

Se han probado con datos simulados estas tres situaciones:

1. `quiero saber qué eventos y qué productos han donado "Pocholo y Celes"`
   - Devuelve eventos donde aparecen, productos agrupados y detalle de DONACIONES.

2. `En el evento "III Jornada Solidaria vs ELA - DIC24", quiero saber qué productos han donado "Pocholo y Celes"`
   - Devuelve solo ese evento, sin DOCxx ni volcado de EVENTOS.

3. Ranking temporal de los 10 productos más consumidos en 2025 en todos los eventos.
   - Devuelve ranking por unidades, ranking por valor/coste y gráfica temporal `stackedBar` por evento y producto.

## Archivos tocados

- `services/event-ai.service.js`
- `services/event-context.service.js`
- `index.html`
- `public/index.html`
- `public/app/version.js`
- `public/sw.js`
- `package.json`
- `public/app/features/v10-5-app-fixes.js`
- `public/app/features/v16-hotfix1-saldo-avance-version.js`
- `public/app/features/v17-fix27-welcome-info-general.js`
- `public/app/features/v17-fix48-saldo-actual-realizado.js`
- `app/features/v17-fix27-welcome-info-general.js`
- `app/features/v17-fix48-saldo-actual-realizado.js`

## Validación técnica

Ejecutado `node --check` sin errores en los servicios modificados y en los parches frontales tocados.
