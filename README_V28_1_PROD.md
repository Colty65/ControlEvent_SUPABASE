# ControlEvent v28.1_prod

Versión de consolidación de Zuzu y de la identidad de ControlEvent, construida a partir de `v28.0_prod_EQUILIBRADA`.

## Objetivo

Mantener la mejora de coste conseguida en v28.0 sin convertir Zuzu en un mero generador determinista. La frontera queda así:

- **ControlEvent** obtiene, filtra, suma, cruza y representa datos canónicos cuando la respuesta es objetiva.
- **Gemini/Zuzu** interviene cuando hay que seleccionar relevancia, interpretar, relacionar, redactar o razonar.
- No se introducen nombres de eventos, personas, tiendas, tickets, importes o fechas de las pruebas en la lógica de producción.

## Cambios de Zuzu

1. **“Gráficamente” se considera una orden gráfica real.**
   - Formas como `gráficamente`, `visual`, `visualizar`, etc. activan intención gráfica.
   - En un análisis gráfico amplio, CE garantiza las visualizaciones canónicas en el mismo turno aunque la redacción de Gemini no las solicite correctamente.

2. **Seguimientos tipo “sí, dame una gráfica de cada”.**
   - Si el contexto anterior es un análisis global del evento, CE conserva el contexto y materializa las gráficas canónicas sin una nueva ronda innecesaria de Gemini.

3. **Menos llamadas Gemini en análisis preconsultados.**
   - Cuando CE ya ha recopilado dossier/banco/desgloses necesarios, la primera llamada de redacción se hace sin exponer herramientas de nuevo.
   - Se evita que Gemini vuelva a descubrir los mismos datos mediante ciclos de `function_call`.
   - El auditor solo debe añadir una segunda llamada cuando exista una inconsistencia objetiva que corregir.

4. **No se muestran tripas internas.**
   - Se eliminan de la prosa final identificadores de llamada, `tool_id`, `table_key`, claves como `reconciliation_timeline` y expresiones `(ID: ..., clave: ...)`.

5. **“Línea por línea” ya no se interpreta como petición de gráfica.**
   - La palabra `línea` por sí sola no activa visualización.
   - Sigue activándose cuando aparece asociada semánticamente a gráfica, evolución, chart, curva, etc.

6. **Prudencia de inferencias.**
   - Se suavizan afirmaciones categóricas que no estén directamente respaldadas por un hecho canónico.
   - Los semáforos requieren estado/criterio/umbral disponible; un cero o un saldo positivo no reciben color automáticamente por sí mismos.

## Gráficas

- Los gráficos globales usan datasets tipados de economía, asistencia, gestión y banco.
- Las peticiones explícitas de gráfica tienen prioridad sobre visualizaciones automáticas.
- Las etiquetas estáticas de conciliación bancaria para PDF continúan mostrando importe, concepto y saldo, dividiendo la serie en tramos cuando sea necesario.
- El detalle de un ticket solicitado “línea por línea” no genera una gráfica automática adicional.

## Cabecera

Se conserva la estructura estable recuperada en v28.0:

- icono CE;
- versión;
- fecha/hora;
- botón **Refrescar**;
- botón **Salir**.

El hardlock de versión no modifica contenedores de cabecera con `textContent`; solo normaliza nodos dedicados a versión y nombres de descarga.

## Identidad v28.1_prod

Identidad canónica:

- `v28.1_prod`
- `ControlEvent v28.1_prod`
- `ControlEvent_v28.1_prod`
- build `20260811-V28-1-PROD`
- ZIP `ControlEvent_v28.1_prod.zip`

Se aplica a:

- cabecera y título de aplicación;
- versión cliente/servidor;
- INFOEVENTO y sus nombres de descarga;
- BACKUP cliente y servidor;
- metadatos internos de los Excel/backup;
- exportaciones y nombres de fichero;
- bundles legacy activos.

Las referencias a `v28.0_prod` que permanecen en `app/version.js` y `public/app/version.js` son **solo prefijos de migración** para recuperar sesión/preferencias de instalaciones anteriores; no son identidad activa.

## Compatibilidad y pruebas

Pruebas ejecutadas correctamente:

- `test-v28-1-prod.cjs`: **25/25**
- regresión Zuzu v27.1.2: **16/16**
- regresión banco/gráficas v27.1.3: **11/11**
- regresión acceso a datos v27.1.4: **13/13**
- estabilidad heredada + globo de destinos: **12/12**

Total de esta batería: **77/77 pruebas**.

Además, la sintaxis se ha comprobado en **403 archivos JS/CJS/MJS de código fuente real** (`app`, `public/app`, `public/modules`, `services`, `routes`, `server`, `scripts`).

> Algunos ficheros de la raíz del proyecto conservan extensiones `.js` aunque contienen PNG/JSON/HTML históricos; por eso no se incluyen en el recuento de sintaxis JavaScript.

## Comportamiento de “Por destino”

Se mantiene el funcionamiento estable restaurado: el globo de una barra muestra únicamente las líneas imputadas a ese destino/situación y calcula su total con esas líneas. No se vuelve a expandir artificialmente al ticket completo.
