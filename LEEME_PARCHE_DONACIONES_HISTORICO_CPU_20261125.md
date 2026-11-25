# Control Event v6.1 — Parche de donaciones, histórico y visualizador (25-11-2026)

Base: versión completa **ControlEvent_v6_1_COMPLETO_HISTORICO_GLOBAL_20261125.zip**.

## Cambios
- La lista compacta de donaciones muestra **Situación entrega: Supuesta / Comprometida / Entregada**, leyendo el dato guardado y manteniendo el valor histórico de compatibilidad si falta.
- El visor de justificantes abierto desde el histórico se mantiene dentro de la ventana histórica; al cerrarlo vuelve a la lista en la misma página, sin volver a las gráficas. Escape cierra primero el visor. Las actualizaciones asíncronas no reconstruyen el histórico durante la vista ampliada.
- Optimización visual del histórico: desactivado el difuminado de fondo costoso, contenido de filas fuera de pantalla excluido de repintado y miniaturas de ingresos diferidas hasta ser visibles. Se conserva paginación de 60 filas, asociaciones globales y consultas bajo demanda.
- No se ha cambiado código contable ni tablas de Supabase.

## Archivos de producción modificados
1. `public/app/features/v17-fix23-performance-dom-event-scope.js`
2. `public/app/features/v24-cuadre-banco.js`
3. `public/app/styles/cuadre-banco.css`
4. `public/index.html`

## Verificación local
- `node --check` en los dos módulos JavaScript: correcto.
- `node scripts/ce-bank-history-global-cpu-regression.cjs`: correcto.
- `node scripts/v4-1-exp-bank42-donaciones-situacion-responsables-regression.cjs`: 31/31.
- `node scripts/ce-20261125-donaciones-historico-ux-regression.cjs`: 12/12 comprobaciones estáticas.
- Falta prueba en navegador real, compatibilidad con datasets de producción, medición CPU cliente y Fluid Active CPU del servidor. No se puede garantizar eliminación de todos los ruidos del ventilador.

## Aplicación
Sobre el repositorio GitHub conectado a Vercel, **actualizado con los parches anteriores**, copiar las carpetas del ZIP del parche (manteniendo estructura) y reemplazar archivos. En GitHub Desktop comprobar solo 4 archivos de producción modificados; verificar que no exista `.env` entre los cambios. Commit, Push origin, y validar manualmente en producción.

## Comprobaciones recomendadas tras despliegue
1. En Donaciones del evento V Jornada Solidaria, revisar Supuesta, Comprometida y Entregada en las tarjetas compactas.
2. Abrir el histórico global, avanzar por miniaturas, pulsar justificante; al cerrar con X y Escape debe continuar en el histórico en el mismo lugar.
3. Desplazarse con la rueda y comparar ventilación/CPU mediante Administrador de tareas de Windows; consultar aparte Fluid Active CPU de Vercel en Usage.
4. Comprobar que persisten las asociaciones Anais y Colty y que no se alteran importes ni saldos.
