# Revisión ControlEvent v6_1-exp · 13/11/2026

## Conciliación de ingresos
- Los justificantes se consultan por `event_id` y se identifican por el ID real de `ce_colaboradores` del evento; dos ingresos de igual importe en eventos distintos no son la misma entidad.
- Corregida una desalineación en los resultados paralelos de `listBankIncomes` y `setIncomeLinks`: la variable de snapshots recibía vínculos de ingresos de otros eventos. Se elimina la consulta superflua y se recupera el snapshot de personas correcto.
- Las asignaciones automáticas `AUTO_INGRESO` *no* impiden elegir manualmente el justificante dentro del mismo evento. Al confirmar una asignación manual, se elimina la asignación automática desplazada **solo del evento activo**. Las asignaciones manuales ajenas permanecen protegidas.
- La persistencia automática exige, además de cuadrar el importe, una coincidencia de nombre no vacía entre el titular del ingreso y la descripción bancaria. Coincidencias solo de importe siguen siendo propuestas visuales, no vínculos definitivos. Sin alterar eventos previos.
- La interfaz distingue «Propuesta automática ... puedes reasignarlo» y «Asociado manualmente a otro movimiento de este evento».

## Zuzu v6
- Gemini rechazaba el `responseJsonSchema` con el AST completo por demasiados estados del validador. El transporte ahora exige un `contract_json` de tipo cadena dentro de un sobre JSON trivial.
- El contrato universal sigue generándose por Gemini y siendo validado por ControlEvent (`v6ValidateContract`), manteniendo el único motor v6 sin fallback a versiones anteriores.
- No se han añadido rutas por palabras clave ni reglas por nombre de evento.

## Validación y limitaciones
- `node --check` de los tres ficheros modificados: OK.
- `npm run test:bank-multievento`: 31/31 OK.
- `node scripts/v6-1-universal-contract-regression.mjs`: OK.
- `node scripts/v6-1-core-adapter-no-hardcode-audit.cjs`: OK.
- Hay suites de Zuzu históricas que inspeccionan literalmente el antiguo esquema y dejan de aplicar al nuevo sobre. No hay prueba online de Gemini ni prueba contra la base Supabase de producción.
- Recomendado: realizar backup de Supabase; ejecutar prueba con dos eventos y justificantes de 40 €; asegurar que las asociaciones MANUALES nunca se liberan; consultar Zuzu con «Dame información de este evento» y revisar la traza de coste y ejecución.
- Esta modificación NO aplica cambios SQL ni toca registros de la base de datos por sí misma.
