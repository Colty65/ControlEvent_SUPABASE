# ControlEvent v18.7_prod · Zuzu con planificador semántico reforzado

Versión generada sobre `v18.4_prod`.

## Cambios aplicados

### 1. PERSONAS ya no se limita al evento activo
Cuando el usuario pregunta por personas registradas en el sistema, SOCIOS, DONANTES o rangos del maestro PERSONAS, ControlEvent trata la consulta como catálogo global.

Ejemplo corregido:

- `dame las personas SOCIO registradas en el sistema`

Ahora debe consultar `PERSONAS` con filtro `Rango = SOCIO` y no devolver donantes del evento activo ni titular la respuesta como `PERSONAS - evento de prueba`.

### 2. Nuevo filtro `rangos`
Se añade soporte real a `filters.rangos` en el planificador de Zuzu y en la extracción local.

Valores esperados:

- `SOCIO`
- `DONANTE`
- `NO SOCIO`

### 3. “Papel de X en cualquiera de los eventos”
Se refuerza la detección de consultas de participación transversal aunque el usuario no escriba explícitamente “donante”, “responsable” o “colaborador”.

Ejemplo corregido:

- `dime el papel de "Carmelo y Lucia" en cualquiera de los eventos`

Ahora fuerza búsqueda en todos los eventos operativos y cruza:

- `INGRESOS`
- `COMPRAS`
- `DONACIONES`
- `PERSONAS`

### 4. Zuzu vuelve a usarse para aclarar contexto
El flujo queda así:

1. Zuzu planifica módulos, eventos y filtros humanos.
2. ControlEvent extrae módulos oficiales y humanizados.
3. Si es un caso de alta confianza, ControlEvent calcula sin inventar.
4. Si hace falta redacción/estructura más abierta, se llama a Zuzu con el contexto ya limpio.

### 5. Cabeceras más limpias
Los módulos maestros (`PERSONAS`, `PRODUCTOS`, `TIENDAS`) ya no arrastran nombre del evento activo cuando la pregunta es global del sistema.

## Validaciones realizadas

- `node --check services/event-ai.service.js`
- `node --check services/event-context.service.js`
- `node --check public/app/features/v11-3-zuzu-analitica-libre.js`
- `node --check public/app/features/v10-5-app-fixes.js`
- Prueba local de contexto con:
  - personas SOCIO registradas en el sistema
  - papel de “Carmelo y Lucia” en cualquiera de los eventos

## Nota
No se ha probado contra Supabase real ni contra tu despliegue Vercel porque aquí no están tus credenciales. La corrección se ha hecho sobre el motor de planificación/extracción y la salida estructurada de Zuzu.
