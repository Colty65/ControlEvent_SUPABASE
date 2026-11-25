# CE v6.1 — Histórico global de ingresos automáticos (25/11/2026)

## Incidencia reproducida visualmente

La consulta histórica mostraba los justificantes persistidos en `ce_bank_income_links`, pero no los ingresos que Cuadre Banco mostraba como conciliaciones automáticas calculadas y no guardadas. Ejemplos aportados: 20/11/2026, +656,40 €, Anais; 26/06/2026, +656,80 €, Colty.

## Corrección incorporada

- Nuevo endpoint de **solo lectura** `POST /api/bank-reconciliation/history-income-suggestions`, autorizado solo para GD/RW, con hasta 60 IDs de movimientos.
- La petición se realiza **solo al abrir una página del histórico**, para los abonos sin vínculos ya visibles. Los resultados se memorizan en el navegador hasta la siguiente recarga de Cuadre Banco.
- El servidor verifica IDs reales de movimientos e inclusión guardada en `ce_bank_event_movement_state`, reconstruye los ingresos del evento y busca coincidencias de importe y, cuando existen varias, de nombre. Evita reutilizar ingresos con asociación persistida y descarta ambigüedades entre sugerencias visibles.
- Los resultados inferidos están marcados `AUTO` y su tooltip dice «Posible conciliación automática (no guardada)». **No equivalen a un vínculo persistido** y no se escriben datos en Supabase.
- Se conserva el histórico global, la presentación paginada y la carga perezosa de miniaturas del parche anterior.

## Archivos alterados

- `services/bank-reconciliation.service.js`
- `routes/bank-reconciliation.routes.js`
- `public/app/features/v24-cuadre-banco.js`
- `public/index.html` (versión de URL para invalidar caché)

## Pruebas efectuadas

- `node --check` de los tres módulos JavaScript: correcto.
- `node scripts/ce-bank-history-global-cpu-regression.cjs`: correcto.
- `node scripts/v4-1-exp-bank3-history-responsables-regression.cjs`: 25/25.
- `node scripts/v4-1-exp-bank49-manual-state-authority-regression.cjs`: 8/8.
- Validación de integridad de los archivos ZIP y exclusión de `.env`.

## Límites y precauciones

No hay conexión desde esta sesión a la base Supabase de producción ni a métricas de Vercel. **No se ha confirmado que los dos movimientos de ejemplo se resuelvan en producción**. Si no existe estado de inclusión guardado, si hay dos candidatos indistinguibles o si falta la foto, se mantiene el guion o el marcador sin foto. Para esos casos hay que inspeccionar el ID bancario y su trazabilidad, sin vincular justificantes por simple coincidencia de importe.

Este cambio agrega una pequeña consulta bajo demanda y no certifica una reducción neta de Fluid Active CPU. Hay que contrastar la pestaña Usage/Logs de Vercel con el consumo local del navegador. No incluye SQL, migraciones, inserciones, actualizaciones ni cambios en la contabilidad.

## Despliegue

Sobre la **última v6.1 con el parche de histórico del 23/11**, reemplazar exclusivamente los cuatro archivos anteriores conservando sus rutas. Verificar en GitHub Desktop que `.env` no se ha añadido. Hacer Commit y Push a `main`. Luego recargar la página con Ctrl+F5 y comprobar los movimientos de +656,40 € y +656,80 € desde un evento distinto.
