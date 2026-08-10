# ControlEvent v27_prod_1.3 · Zuzu Banco + Gráficas Ejecutables

Esta versión parte de **v27_prod_1.2** y corrige los problemas observados en la batería real de informes 1→B del 10/08/2026.

El objetivo no es añadir respuestas prefabricadas, sino reforzar la arquitectura para que Zuzu entienda mejor el contexto bancario, obtenga la fuente correcta y entregue realmente la visualización solicitada.

## Principio obligatorio: sin hardcode de negocio

No se han introducido condiciones ligadas a:
- nombres de eventos;
- personas concretas;
- importes concretos;
- fechas concretas de eventos;
- TKxx concretos;
- proveedores concretos.

Las nuevas decisiones se basan únicamente en:
- intención semántica del turno;
- contexto de conversación;
- tipo de herramienta y metadatos;
- periodo configurado del Cuadre Banco;
- movimientos y vínculos reales devueltos por ControlEvent;
- esquema de la tabla que se va a representar.

## 1. Router bancario: Cuadre Banco primero

Dentro del contexto de un evento, `event_bank` pasa a ser la fuente primaria para preguntas sobre:
- banco;
- movimientos bancarios;
- conciliación;
- Cuadre Banco;
- saldo bancario del periodo;
- tickets/ingresos que justifican movimientos.

`event_bank_timeline` queda como fuente secundaria para históricos explícitos o cuando realmente haga falta una cronología alternativa.

Si Gemini intenta usar directamente el histórico para una consulta bancaria de evento, ControlEvent devuelve una señal de reintento para que solicite primero `event_bank`.

## 2. `event_bank` incorpora una serie canónica para gráficas

La herramienta devuelve ahora `reconciliation_timeline`, construida con los movimientos **incluidos en la conciliación del evento**.

Cada fila contiene:
- Momento;
- Fecha;
- Tipo: INGRESO / CARGO / NEUTRO;
- Movimiento firmado;
- Impacto bancario acumulado;
- Saldo bancario del periodo;
- Concepto;
- Evidencia (TKxx, ingreso vinculado o inclusión en conciliación).

El saldo de cada punto usa el ledger de Cuadre Banco y, cuando está disponible, `eventBalanceAfter`.

## 3. La conciliación ya no se sustituye por el histórico general

Zuzu recibe una regla explícita: no debe presentar el histórico completo de la cuenta como si fuera la conciliación del evento.

Si el usuario pide expresamente el histórico completo, esa petición sí puede usar la herramienta histórica.

## 4. Las modificaciones de una gráfica heredan la intención visual

Ya no solo se conserva la intención con respuestas como «sí» o «hazlo».

También se reconocen follow-ups del tipo:
- «pon encima de cada punto...»;
- «cambia los colores...»;
- «añade el importe...»;
- «pon el concepto y el saldo...»;
- «¿por qué no la has pintado?»;
- otras modificaciones de puntos, marcadores, etiquetas, ejes, leyenda o PDF.

Si el turno hereda una petición gráfica, ControlEvent obliga a obtener de nuevo datos actuales en ese mismo turno cuando no exista una herramienta materializable.

## 5. Gráfica bancaria canónica

Para una gráfica de conciliación se prioriza automáticamente:

- **X:** `Momento`
- **Y:** `Saldo bancario del periodo`
- **Marcador:** `Tipo`
- **INGRESO:** punto verde
- **CARGO:** punto rojo

`Impacto bancario acumulado` sigue disponible cuando el usuario pide específicamente variación/impacto, pero no se presenta como saldo de la cuenta.

## 6. Etiquetas estáticas para PDF

El contrato de gráficas admite ahora `point_label_fields`.

Para la conciliación, si el usuario pide información visible sin hover, se incorporan:
- Movimiento;
- Concepto;
- Saldo bancario del periodo.

El backend materializa `pointLabels` y `pointTooltips` junto con los datos reales del punto.

## 7. Renderer PDF legible

Cuando hay etiquetas estáticas, la gráfica de líneas entra en un modo específico de lectura para PDF:
- conserva rojo/verde por tipo de movimiento;
- imprime movimiento, concepto abreviado y saldo;
- mantiene el concepto completo en el tooltip de pantalla;
- divide automáticamente una serie densa en tramos de hasta 8 movimientos;
- todos los tramos mantienen la misma escala vertical para no falsear la lectura;
- las etiquetas se colocan en bandas superiores con una guía hasta el punto para reducir solapamientos.

No se hardcodea el número de movimientos del evento; la segmentación depende de la longitud real de la serie.

## 8. Zuzu ya no puede “culpar al renderer”

Se añade una regla y auditor específico contra respuestas del tipo:
- «mi función es preparar la especificación»;
- «yo no puedo pintar la gráfica»;
- «ControlEvent debería representarla».

Para el usuario, Zuzu + ControlEvent son un único sistema. Si se pide una gráfica, debe entregarse una visualización materializable o explicarse una limitación real sin trasladar responsabilidades entre capas.

## 9. Garantía de ejecución de gráfica

Si un turno tiene intención gráfica pero Gemini termina sin solicitar ninguna herramienta de datos, ControlEvent fuerza silenciosamente una nueva ronda antes de permitir la respuesta final.

En contexto bancario, esa ronda solicita primero el Cuadre Banco del evento.

## 10. Compatibilidad de versión

- Versión: `v27_prod_1.3`
- Build: `20260810-V27-PROD-1-3-ZUZU-BANCO-GRAFICAS-EJECUTABLES`
- Se conserva migración de claves de almacenamiento desde `v27_prod_1.2` y desde claves antiguas `v24_prod`.

## Pruebas

### Regresión v1.2

```bash
node scripts/test-v27-prod-1-2-zuzu-quality.cjs
```

Resultado de construcción: **16/16 OK**.

### Nuevas pruebas v1.3

```bash
npm run test:v27-1.3
```

Resultado de construcción: **11/11 OK**.

Comprueban:
- follow-up de modificación de puntos;
- herencia de contexto bancario;
- etiquetas estáticas para PDF;
- detección de respuestas que delegan el renderizado;
- prioridad de `event_bank`;
- excepción para histórico explícito;
- prioridad de `reconciliation_timeline` frente al histórico;
- incorporación de `point_label_fields`;
- existencia de la serie de conciliación en `event_bank`;
- renderer segmentado para PDF;
- ausencia de hardcode de los casos reales usados para descubrir los fallos.

## Archivos principales modificados

- `services/event-ai.service.js`
- `public/app/features/v11-3-zuzu-analitica-libre.js`
- `app/features/v11-3-zuzu-analitica-libre.js`
- `public/app/version.js`
- `app/version.js`
- archivos de versión/cache de la aplicación
- `scripts/test-v27-prod-1-3-zuzu-bank-charts.cjs`
- `package.json`

