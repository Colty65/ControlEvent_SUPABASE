# Control Event v6.1 — Hotfix de cargos, donaciones y carga del histórico (25/11/2026)

Base: ControlEvent_v6_1_COMPLETO_DONACIONES_HISTORICO_RENDIMIENTO_20261125.zip.

## Cambios
1. `public/app/features/v24-cuadre-banco.js`: corrige la referencia inválida a `visibleRows` al montar el panel de detalle de tickets de cargo, que podía dejar el visor mostrando indefinidamente las dos animaciones de carga. Usa `rows`, calculada a partir de `detail.lines`. Reutiliza la caché de imágenes por evento para evitar repetir `/api/ticket-images` al abrir cada ticket. Las miniaturas de tickets solo se hidratan cuando entran en la zona visible.
2. `public/app/features/v17-fix23-performance-dom-event-scope.js`: elimina la frase redundante «Situación entrega:» en las tarjetas de donaciones, dejando únicamente Supuesta, Comprometida o Entregada.
3. `public/app/styles/app.css`: reorganiza el formulario de alta de donaciones en pantallas amplias y medianas para mostrar completamente el selector «Responsable» y trasladar «Añadir» a una nueva fila. No modifica compras.
4. `public/index.html`: actualiza versiones de recursos CSS/JS para evitar caché antigua.

## Instalación
Descomprimir **el parche**. Copiar la carpeta `public` sobre la carpeta raíz de tu repositorio Git limpio, conservando `public/app/...`. Comprobar en GitHub Desktop los **4 archivos** de producción, sin archivos `.env`, luego commit y push a `main`. Vercel desplegará según su configuración actual.

## Verificaciones realizadas
- `node --check` de los dos scripts JS modificados: correcto.
- `node scripts/ce-20261125-donaciones-historico-ux-regression.cjs` (actualizado para el nuevo texto): 15/15 comprobaciones.
- `node scripts/ce-bank-history-global-cpu-regression.cjs`: correcto.
- `node scripts/v4-1-exp-bank42-donaciones-situacion-responsables-regression.cjs`: 31/31.

## Pendientes
- No se ha ejecutado la app contra tu Supabase ni se ha probado en navegador de producción. Comprobar TK15 (Función 2026) y otros tickets de cargo de diferentes páginas. Comprobar ingresos, cerrar visor y volver a la misma página y scroll.
- La eliminación del error de render y la reutilización de caché reducen trabajo evitable, pero **no se ha medido** una mejora real en CPU del portátil o Fluid Active CPU de Vercel. Distinguir ambos.
- No hay cambios en la base de datos ni operaciones de escritura.
