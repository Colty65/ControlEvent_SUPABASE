# Control Event v6.1 — Corrección histórico bancario (23/11/2026)

## Punto de partida

Base: `ControlEvent_v6_1-exp_FIX_SALDO_BANCO_IMPACTO_EVENTO_20261115(1).zip`. No se ha recuperado código de la v4.1. La versión desplegada en Vercel no se ha modificado desde este paquete.

## Cambios

1. `public/app/features/v24-cuadre-banco.js`: fusiona asociaciones de justificantes del histórico GLOBAL con las del evento seleccionado, por clave de evento + ID de ingreso o código de ticket. Mantiene miniatura global si el evento activo la desconoce. Un vínculo de ingreso existente sin imagen se muestra igualmente (sin inventar una foto).
2. Histórico paginado **solo en la presentación**: 60 filas visibles por página, ordenación aplicada a todo el conjunto. Se siguen mostrando las 652 filas en el contador; no se modifican los datos, estados, saldos ni imputaciones.
3. Fotos de tickets cargadas progresivamente por visibilidad (`IntersectionObserver`), con deduplicación de solicitudes simultáneas de `/api/ticket-images` por evento. Imágenes de ingresos con `loading=lazy`. Esto reduce la ráfaga de llamadas al abrir la ventana; no garantiza por sí solo un consumo específico de Vercel.
4. `public/app/styles/cuadre-banco.css`: controles de página.
5. `public/index.html`: cambia la versión de la URL del módulo para forzar recarga del JavaScript tras desplegar.
6. `.gitignore` y `.env.example` sin valores reales; el ZIP NO contiene `.env`.

## Pruebas realizadas

- `node --check public/app/features/v24-cuadre-banco.js` — OK
- `node scripts/ce-bank-history-global-cpu-regression.cjs` — OK
- `node scripts/v4-1-exp-bank3-history-responsables-regression.cjs` — 25/25 OK
- `node scripts/v4-1-exp-bank49-manual-state-authority-regression.cjs` — 8/8 OK
- `node scripts/v4-1-exp-bank4-estetica-responsables-regression.cjs` — 33/34 OK; 1 comprobación antigua exige la etiqueta textual BANK4 en el cache bust, reemplazada intencionalmente por la etiqueta actual. Las restantes 33 pasan.

## Alcance y límites

No hay acceso a las tablas privadas de Supabase ni métricas reales de tu cuenta de Vercel en esta ejecución. No es posible asegurar la asociación específica de cada movimiento (ni medir CPU) sin comprobar después en producción. La consulta inicial `/api/bank-reconciliation` sigue cargando la información general de la cuenta: hay que medirla en los registros de Vercel antes de atribuir el consumo a una causa única. La paginación propuesta se realiza **en el navegador**, no reduce por sí sola el tamaño de esa primera respuesta.

## Actualización del repositorio

El ZIP completo se ha creado para reproducir los archivos del proyecto. Como el proyecto v6.1 ya está desplegado, la opción de menor riesgo es aplicar SOLO los tres archivos `public/app/features/v24-cuadre-banco.js`, `public/app/styles/cuadre-banco.css` y `public/index.html` del ZIP de PARCHE a una copia limpia y sincronizada del repositorio, revisar Changes y luego realizar Commit / Push origin. El ZIP de PARCHE incluye también `.gitignore` (seguridad), `.env.example`, este informe y la prueba automatizada. Nunca subas `.env`, ni `.git`, ni las credenciales. No ejecutar SQL ni migraciones.

## Validación manual tras desplegar

1. Entrar al evento «Ingresos y gastos extraordinarios 2026», abrir histórico y comprobar abonos con justificante de la V Jornada Solidaria.
2. Cambiar a «V Jornada Solidaria vs ELA» y verificar que las asociaciones siguen siendo las mismas en el histórico global.
3. Confirmar total de movimientos, saldo, ordenación y paginación.
4. Inspeccionar Requests y Usage / Fluid Active CPU en Vercel antes y después de abrir el histórico con la misma carga; los números dependen del volumen real y del tráfico.

Si un ingreso existe en Supabase pero no hay fila en `ce_bank_income_links` que lo relacione con el movimiento, el histórico seguirá sin poder inventar el vínculo. Ese caso requiere una comprobación de registros concreta, no una asociación automática basada solo en coincidencia de importes.
