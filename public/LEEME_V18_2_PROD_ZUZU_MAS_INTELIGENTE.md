# ControlEvent v18.8_prod · Zuzu más inteligente

Versión construida sobre `v18.1_prod` para corregir las desviaciones detectadas en las tres pruebas de Zuzu.

## Cambios aplicados

1. **Búsqueda de personas en todos los eventos**
   - Preguntas como `dame los eventos donde participó "Ernesto" como colaborador o donante` ya no se quedan en el evento seleccionado.
   - Detecta `participó`, `participa`, `aparece`, `donante`, `colaborador`, `responsable`.
   - Extrae `INGRESOS + DONACIONES + COMPRAS + PERSONAS` y devuelve una tabla por evento con las apariciones.

2. **Informes exhaustivos de eventos**
   - Preguntas tipo `informe exhaustivo de los eventos llamados ... representado gráficamente` ya no se resuelven con una gráfica suelta de COMPRAS.
   - Se genera informe local con métricas canónicas: ingresos, compras realizadas, compras pendientes, donaciones valoradas, saldo, colaboradores, líneas, tickets y documentos.
   - Incluye gráficas por evento y CSV de resumen.

3. **Eventos abreviados o con errores leves**
   - Mejorado el reconocimiento de eventos entre comillas aunque vengan abreviados con puntos o con pequeñas erratas.
   - Ejemplo contemplado: `IV JORNDA SOLIDARIA VS ELA` puede casar con `IV JORNADA SOLIDARIA VS ELA`.
   - Ejemplo contemplado: `Ingresos y gastos extr..........` puede casar con `Ingresos y Gastos extraordinarios 2026`.

4. **Donantes “solo o acompañado”**
   - En consultas como `donaciones de "Carmelo" (solo o acompañado) en el evento "IV ..."`, Zuzu ya no mete el título del evento como si fuera donante.
   - No arrastra nombres de PERSONAS que ensucien el título de la respuesta.
   - El filtro se aplica buscando el texto humano del donante, de forma que entran `Carmelo`, `Carmelo y Lucía`, `Carmelo y Pana`, etc.

5. **Menos respuestas “preparadas”**
   - Se añaden salidas deterministas de ControlEvent para preguntas exactas donde no hace falta que Zuzu improvise.
   - Zuzu queda para cocinar/formatear cuando la pregunta sea realmente libre; para cálculos y cruces claros manda el dato oficial de ControlEvent.

6. **Avance visual de Zuzu**
   - El entretenimiento de la ventana pasa de 3 segundos por fase a 0,65 segundos por fase.
   - Así, cuando responde rápido, ya no se queda visualmente clavado en el punto 1/7.

## Archivos principales tocados

- `services/event-ai.service.js`
- `services/event-context.service.js`
- `public/app/features/v11-3-zuzu-analitica-libre.js`
- `app/features/v11-3-zuzu-analitica-libre.js`
- `public/app/version.js`
- `public/index.html`
- `package.json`

## Validación realizada

- `node --check services/event-ai.service.js`
- `node --check services/event-context.service.js`
- `node --check public/app/features/v11-3-zuzu-analitica-libre.js`
- `node --check public/app/features/v10-5-app-fixes.js`
- `node --check public/app/features/v17-fix27-welcome-info-general.js`

