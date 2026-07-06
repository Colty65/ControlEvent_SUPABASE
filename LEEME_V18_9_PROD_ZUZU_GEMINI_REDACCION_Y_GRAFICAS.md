# ControlEvent v18.9_prod · Zuzu/Gemini redacción real y gráficos finos

Cambios incluidos sobre v18.8_prod:

## 1. Redacción narrativa: Zuzu/Gemini primero, no plantilla local

Cuando la pregunta pide informe, opinión, tono, chascarrillos, texto de una página, estilo coloquial, estilo técnico/financiero, socios o Dirección:

- ControlEvent sigue calculando los datos oficiales, cruces, tablas, gráficas y CSV.
- Después se llama a Zuzu/Gemini para redactar la respuesta humana usando:
  - el prompt original completo del usuario;
  - el tono/sentimiento pedido;
  - el resumen de datos calculados por ControlEvent;
  - tablas de resumen y detalle suficientes para poder opinar con base real.
- Se refuerza el prompt interno para que Zuzu no use frases mecánicas tipo “He localizado X registros”.
- Se prohíbe reutilizar plantillas o coletillas de informes anteriores.
- Se prohíbe mencionar nombres que no estén en la pregunta o en los datos oficiales. Esto evita errores como acabar hablando de Pocholo cuando se preguntó por Colty.

## 2. Si Zuzu/Gemini falla, no se disfraza ControlEvent de Zuzu

En peticiones claramente narrativas o de opinión, si Gemini falla por cuota, timeout o clave:

- ControlEvent no inventa una redacción local fingiendo ser Zuzu.
- Se muestra el aviso claro de que Zuzu no pudo redactar la parte humana.
- Se mantienen debajo los datos, tablas y gráficas calculados, para no perder el trabajo.

## 3. Fallback local corregido

Se eliminó una frase fija que nombraba a Pocholo aunque la consulta fuera sobre otra persona.

## 4. Más contexto para Gemini

La fase de redacción recibe más filas de detalle cuando el usuario pide textos largos, participación personal u opiniones. Así Gemini puede redactar con productos, importes, papeles y eventos reales sin tener que inventar.

## 5. Gráficos más finos

Se ha retocado el renderizado de gráficas de Zuzu:

- Letras y números con peso más fino.
- Barras menos bastas y con mejor separación.
- Etiquetas con más anchura y mejor salto de línea.
- Valores pequeños y ceros con una presencia mínima visible para que no desaparezcan.
- En gráficas apiladas se evita pintar números dentro de segmentos demasiado estrechos para reducir solapes.
- Ajustes también incluidos en la impresión/PDF.

## Validación

- node --check services/event-ai.service.js
- node --check public/app/features/v11-3-zuzu-analitica-libre.js
- node --check services/event-context.service.js
- unzip -t CE_v18_9_PROD_ZUZU_GEMINI_REDACCION_Y_GRAFICAS.zip
