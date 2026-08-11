# ControlEvent v28.4_prod — consolidación Zuzu / coste y orquestación

## Objetivo

Esta versión no amplía la inteligencia de negocio de Zuzu. Consolida la capa Zuzu/ControlEvent para eliminar rondas Gemini redundantes, reutilizar contexto de forma compacta y materializar en CE las salidas deterministas que ya conoce la aplicación.

No se han añadido nuevos parches JS. Los archivos específicos de versión existentes se han renombrado de v28.3 a v28.4 y se han modificado los núcleos ya existentes (`event-ai.service.js` y `v11-3-zuzu-analitica-libre.js`). El paquete conserva el mismo número total de archivos que v28.3.

## Cambios de coste y conversación

- Los informes gráficos generales preconsultan en paralelo únicamente `event_dossier` + `event_bank`.
- El `scope` se entrega correctamente a las herramientas preconsultadas, evitando el antiguo bucle «falta scope → Gemini pide herramienta → CE vuelve a Gemini».
- Cuando existe prefetch, Gemini recibe las fuentes compactadas y realiza una sola llamada de razonamiento sin herramientas.
- Un informe preconsultado ya no paga una segunda llamada Gemini por auditoría factual: CE sanea localmente las frases objetivamente no respaldadas.
- Se elimina el uso acumulativo de `previous_interaction_id` entre turnos de Zuzu. CE conserva una cápsula causal local de los últimos turnos relevantes.
- Las propuestas de Zuzu se guardan como `pendingAction`. Un «sí / hazlo» ejecuta directamente la última propuesta concreta cuando CE puede resolverla de forma determinista. En particular, un desglose de compras propuesto por Zuzu se resuelve mediante `event_breakdowns` con 0 llamadas Gemini.

## Banco y presentación

- La gráfica de conciliación sigue mostrando la evolución bancaria.
- Inmediatamente debajo se muestran los movimientos justificados con fecha, importe, saldo, concepto y justificación canónica.
- Ingreso: relación de ingreso registrada, con presentación verde.
- Cargo: TKxx vinculados, con presentación roja.
- Si no existe vínculo canónico se muestra «Sin vínculo justificativo registrado»; no se inventa una causa.
- `reconciliation_justified_movements`, `movements` y `ticket_links` están marcadas como tablas auxiliares no graficables. Esto elimina el bloque final inútil «1 movimientos / 2 movimientos / ...».
- La política de informe general elimina además referencias bancarias redundantes de `show_tables`.

## Traza y coste total

La traza está siempre disponible en pantalla y plegada por defecto.

- **Traza plegada al imprimir:** el PDF no contiene ningún dato de traza, ni llamadas, ni tokens, ni coste del turno, ni total general.
- **Traza desplegada al imprimir:** el PDF incorpora la traza completa.
- Se añade dentro de la propia traza un **Total general de la conversación Zuzu**, acumulando turnos, llamadas Gemini, tokens y coste estimado en euros.
- El acumulado se mantiene durante la conversación/sesión de Zuzu y se reinicia con «Limpiar Zuzu».

## Fiabilidad

- Se eliminan de forma determinista causas especulativas del tipo «posiblemente por asistencia parcial» cuando esa causa no está en los datos consultados.
- Los informes conocidos se materializan en CE antes de permitir que la respuesta afirme que existe una gráfica o tabla.
- Se mantiene la normalización genérica de TKxx y el detalle producto a producto.
- Las listas de productos conservan el orden por defecto TIENDA → SEGMENTO → DESTINO → PRODUCTO.
- No se han hardcodeado eventos, personas, tiendas, tickets, importes, fechas ni destinos de la batería de pruebas.

## Versión

Identidad activa: `v28.4_prod` / `ControlEvent v28.4_prod` / `ControlEvent_v28.4_prod`.

INFOEVENTO y BACKUP utilizan la identidad v28.4 tanto en nombres externos como en metadatos internos. Las referencias a v28.3 que permanecen en `version.js` y limpieza de sesión son exclusivamente de migración desde la versión anterior.

## Regresión

- 25/25 pruebas específicas v28.4.
- 16/16 regresiones de calidad v27.1.2.
- 11/11 regresiones de banco/gráficas v27.1.3.
- 13/13 regresiones de acceso a datos v27.1.4.
- 369 archivos JS/CJS/MJS de áreas reales de código comprobados con `node --check` sin errores. Los `.js` históricos que en realidad contienen JSON/HTML/binarios no se cuentan como código JavaScript.
