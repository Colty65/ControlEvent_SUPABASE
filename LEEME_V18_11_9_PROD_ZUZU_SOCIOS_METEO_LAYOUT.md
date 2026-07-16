# ControlEvent v22_prod · Zuzu socios, meteo y layout lateral

## Motivo

La versión v18.11.8 seguía fallando en una consulta mixta del tipo:

> Datos del evento + SOCIOS que no asistirán + parte metereológico

El sistema calculaba parte de los datos, pero:

- no aplicaba bien el criterio `numero=1` sobre PERSONAS;
- no excluía correctamente entradas internas tipo `Grupo...`, `Personas...`, `z_de...` o `z_DEV...`;
- una consulta con `metereológico` podía no activar la meteorología;
- Gemini podía devolver una narración cortada y CE la aceptaba;
- las herramientas flotantes inferiores molestaban visualmente.

## Cambios aplicados

### 1. SOCIOS que no asistirán / no registrados

Se refuerza el cálculo oficial antes de pasar contexto a Gemini:

- PERSONAS con `rango = SOCIO`.
- Si el usuario pide `numero=1`, se aplica ese criterio cuando existe campo numérico.
- Si no hay campo numérico en PERSONAS, se interpreta `numero=1` como persona individual y se excluyen nombres compuestos tipo `X y Y` / `X e Y`.
- Se excluyen entradas internas que empiecen por:
  - `Grupo...`
  - `Personas...`
  - `z_de...`
  - `z_DEV...`
- Se compara contra INGRESOS del evento activo o detectado.
- Se genera resumen y tabla específica de socios no registrados.

### 2. Meteorología

Se amplía la detección de meteorología para aceptar también errores habituales:

- `meteorológico`
- `metereológico`
- `meteo`
- `parte metereologico`
- `temperatura`, `lluvia`, `viento`, `clima`, etc.

Si CE obtiene meteorología externa, esa información se entrega a Gemini dentro del contexto narrativo y se muestra en la salida con tarjeta visual, especialmente para eventos de un solo día.

### 3. Narración Gemini

Para consultas con varias partes, Gemini recibe una instrucción más fuerte:

- responder todos los bloques pedidos;
- separar por apartados breves;
- no omitir la meteorología si CE la ha obtenido;
- mencionar el criterio real usado para socios no asistentes;
- no entregar respuestas cortadas.

Si la salida se corta o falta alguna parte pedida, CE reintenta con corrección guiada. Si sigue siendo inválida, no debe aceptarse como respuesta final buena.

### 4. Layout lateral izquierdo

Se añade un script final de ajuste visual:

`app/features/v18-11-9-layout-left-tools.js`

Las herramientas que estaban flotando abajo pasan a mostrarse en una barra lateral izquierda, una debajo de otra, para molestar menos al contenido principal.

## Archivos tocados principales

- `services/event-ai.service.js`
- `services/event-context.service.js`
- `public/app/features/v18-11-9-layout-left-tools.js`
- `app/features/v18-11-9-layout-left-tools.js`
- `public/app/version.js`
- `server/paths.js`
- `public/index.html`
- `index.html`

## Versión

- App: `v22_prod`
- ZIP: `CE_v19_PROD_MAPA_GLOBAL.zip`
