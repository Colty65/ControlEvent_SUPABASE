# ControlEvent v27_prod_1.2 · Zuzu Fiabilidad Semántica

Esta versión parte de **v27_prod_1.1** y refuerza la inteligencia de Zuzu sin introducir reglas ligadas a eventos, personas, importes o fechas concretas. Las decisiones nuevas se basan en formatos, metadatos, semántica de la petición, contexto conversacional y hechos canónicos devueltos por ControlEvent.

## Cambios principales

### 1. Fechas bancarias robustas
- Se normalizan de forma común fechas ISO (`YYYY-MM-DD` / ISO datetime) y españolas (`DD/MM/YYYY`, `DD-MM-YYYY`).
- Se valida que la fecha exista realmente en el calendario.
- La relación entre dos periodos devuelve `overlap`, `disjoint` o `unknown`.
- Una fecha ausente o no interpretable ya **no se convierte en falso “no solapa”**.

### 2. Saldo bancario e impacto del evento son conceptos distintos
La cronología bancaria expone dos series distintas:
- **Saldo bancario del periodo**: saldo real del ledger en cada movimiento, utilizando el saldo de apertura y/o el saldo posterior disponible en los datos bancarios.
- **Impacto bancario acumulado**: suma de los movimientos mostrados partiendo de base cero.

Zuzu recibe una instrucción explícita para no llamar “saldo de la cuenta” ni “saldo operativo” a una variación base cero.

### 3. Las gráficas generales priorizan información útil del evento
Una petición genérica como “gráfica de los datos más importantes” prioriza economía, asistencia, gestión, documentación y otros resúmenes del dossier. La cronología bancaria se prioriza cuando la pregunta es realmente bancaria: banco, movimientos, conciliación, saldo o evolución bancaria.

La selección de gráficas se ordena globalmente por utilidad semántica, no por el orden accidental de finalización de las herramientas.

### 4. Tablas de anomalías no se fuerzan a gráfica
Las tablas `income_attention` e `income_corrections` se marcan como no graficables. Siguen disponibles para el razonamiento y para tablas, pero CE evita convertir automáticamente una anomalía cualitativa en una gráfica poco informativa.

### 5. “Sí / vale / hazlo” conserva la intención gráfica
Cuando el usuario responde con una afirmación breve, CE revisa el último turno conversacional. Si Zuzu había ofrecido una gráfica, la intención gráfica se hereda aunque el texto actual no contenga la palabra “gráfica”.

Esta lógica es contextual y genérica: no depende de un texto concreto, de un usuario ni de un evento.

### 6. Auditor de presentación
Si la respuesta textual afirma que existe una gráfica pero no se ha podido materializar ninguna visualización válida, se realiza una reparación silenciosa de presentación antes de devolver la respuesta. Así se reduce el caso “Aquí tienes una gráfica…” seguido únicamente por una tabla.

### 7. Auditor de coherencia de periodos
Si la herramienta bancaria ha determinado canónicamente que dos periodos solapan, el auditor rechaza una narración que diga lo contrario; y viceversa. Los estados `unknown` se conservan como incertidumbre, no como conclusión falsa.

## Principio de diseño: sin hardcode de negocio

No se han añadido nombres de eventos, personas, cuotas, importes ni rangos temporales como condiciones de ejecución. Los ejemplos concretos aparecen únicamente en las pruebas de regresión para reproducir fallos observados; **no participan en la lógica de producción**.

La arquitectura sigue el principio:

> Gemini razona y redacta; ControlEvent aporta hechos canónicos, ejecuta herramientas y valida invariantes objetivos.

## Pruebas de regresión

Ejecutar:

```bash
npm run test:v27-1.2
```

o, sin instalar dependencias del proyecto:

```bash
node scripts/test-v27-prod-1-2-zuzu-quality.cjs
```

El test es autocontenido y comprueba la implementación real extraída de `services/event-ai.service.js` para:
- formatos de fecha y fechas imposibles;
- solape, no solape e incertidumbre;
- continuidad conversacional de una afirmación corta;
- detección de promesas de gráfica;
- prioridad de economía en gráficas generales;
- prioridad de cronología en preguntas bancarias;
- diferenciación entre saldo bancario e impacto acumulado;
- exclusión de tablas no graficables;
- límite de una visualización en un follow-up inferido.

## Nota de validación del paquete

La comprobación sintáctica de los JavaScript modificados y las pruebas autocontenidas de esta versión pueden ejecutarse sin dependencias externas. En el entorno de construcción no fue posible completar `npm ci` porque el registro npm configurado devolvió `404` para una dependencia transitiva (`zip-stream@4.1.1`); por ese motivo no se afirma que se haya ejecutado la batería completa de integración con dependencias instaladas.
