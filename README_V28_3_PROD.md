# ControlEvent v28.3_prod

Fecha: 11/08/2026

## Objetivo

Versión de consolidación de Zuzu centrada en tres problemas observados en v28.2_prod:

1. informes bancarios que prometían contenido que después no se materializaba;
2. movimientos conciliados presentados de forma poco útil o redundante;
3. llamadas Gemini repetidas para volver a presentar datos que ControlEvent ya conocía.

No se añaden reglas de negocio para casos concretos ni se hardcodean eventos, personas, tiendas, tickets, destinos, importes o fechas de la batería de pruebas.

## Cambios principales

### 1. Conciliación bancaria: detalle útil justo debajo de la gráfica

La evolución bancaria se sigue representando con una línea de saldo e indicadores de ingreso/cargo.

Inmediatamente debajo de esa gráfica, dentro del mismo bloque, ControlEvent presenta cada movimiento incluido con:

- fecha/hora;
- importe firmado;
- concepto bancario;
- saldo que deja;
- justificación canónica.

La justificación se construye desde los vínculos reales del Cuadre Banco:

- ingresos: persona/registro de ingreso y forma registrada cuando está disponible;
- cargos: TKxx vinculados y sus importes;
- sin vínculo: se indica expresamente `Sin vínculo justificativo registrado`.

Los ingresos se presentan en verde y los cargos en rojo. Se elimina la antigua visualización decorativa que convertía el ordinal del movimiento en una barra sin significado.

### 2. Informe de movimientos conciliados = ruta determinista

Peticiones como `presenta el informe de movimientos conciliados`, `vuelve a sacarlo` o equivalentes ya no requieren una nueva llamada Gemini.

ControlEvent consulta `event_bank`, genera la gráfica, añade la justificación de cada movimiento y materializa el resultado directamente.

Esto impide que Zuzu diga `aquí tienes el informe` si no existe una salida materializada.

### 3. Follow-up «sí / hazlo»

Se conserva la última propuesta concreta de Zuzu. Un `sí, hazlo` ejecuta únicamente esa ampliación y no reconstruye la intención amplia de turnos anteriores.

Las exclusiones bancarias se muestran con evidencia: fecha, importe, concepto y vínculos registrados. ControlEvent no deduce que un movimiento sea personal, ajeno al evento o de una naturaleza concreta solo por el texto del concepto.

### 4. Menos tokens en análisis generales

En análisis gráficos generales:

- CE preconsulta las fuentes canónicas una sola vez;
- el resumen `brief` del banco enviado a Gemini ya no incluye decenas de filas que CE va a representar después;
- Gemini recibe hechos compactos para razonar, no la cronología completa;
- si el auditor detecta un exceso verbal objetivo en un informe preconsultado, CE aplica una corrección conservadora local en lugar de pagar automáticamente una segunda llamada Gemini.

Gemini sigue interviniendo en interpretación, relevancia, conclusiones y preguntas abiertas.

### 5. Listas de productos

El orden por defecto continúa siendo:

`TIENDA -> SEGMENTO -> DESTINO -> PRODUCTO`

El usuario puede pedir otro orden y su petición prevalece.

### 6. Traza siempre disponible y controlada por el usuario

La traza aparece siempre en pantalla al final de la respuesta, plegada por defecto.

Al desplegarla se muestran, entre otros:

- fuentes/herramientas consultadas;
- filas fuente y filas renderizadas;
- gráficas/tablas materializadas;
- descartes de deduplicación;
- llamadas Gemini;
- tokens facturables/ocultos cuando están disponibles;
- coste estimado;
- reintentos, avisos y auditorías.

El consumo Gemini ya no aparece como una tarjeta independiente fuera de la traza.

#### Regla de PDF

- Traza plegada al pulsar PDF: se elimina completamente del informe. No se exporta ningún dato de traza, ni llamadas, ni tokens, ni coste, ni total/resumen.
- Traza desplegada al pulsar PDF: se exporta completa con todos los detalles visibles de resolución.

### 7. Contexto causal de los PDF

En follow-ups dependientes del contexto se mantiene el bloque `Contexto de la consulta` con los turnos necesarios para entender la respuesta final, incluyendo la última propuesta relevante de Zuzu y la contestación del usuario.

### 8. Versión

Identidad activa unificada a:

- `v28.3_prod`
- `ControlEvent v28.3_prod`
- `ControlEvent_v28.3_prod`
- `ControlEvent_v28.3_prod.zip`

Incluye cabecera, título, frontend, backend, INFOEVENTO, BACKUP exterior e interior, metadatos y descargas. Las referencias a v28.2 que permanecen en código activo son únicamente orígenes de migración de almacenamiento/sesión.

## Elementos deliberadamente no modificados

- comportamiento recuperado de `Gráficas -> Por destino`;
- cabecera estable (icono CE, versión, reloj, Refrescar y Salir);
- normalización lógica de TKxx;
- acceso a catálogos generales no restringidos;
- exclusión de ACCESO/credenciales de las herramientas de Zuzu.

## Validación

- 23/23 pruebas específicas de v28.3_prod.
- 16/16 regresiones de calidad/fechas/gráficas v27_prod_1.2.
- 11/11 regresiones de banco/gráficas v27_prod_1.3.
- 13/13 regresiones de catálogos/detalle de compras v27_prod_1.4.
- 436 archivos JavaScript/CJS/MJS reales comprobados con `node --check`: 0 errores.
- Los 12 ficheros históricos con extensión `.js` que no contienen JavaScript válido ya existían idénticos en v28.2_prod y se excluyen del chequeo sintáctico.
