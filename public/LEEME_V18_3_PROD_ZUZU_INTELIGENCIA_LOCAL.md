# ControlEvent v18.9_prod — Zuzu con inteligencia local reforzada

Versión preparada a partir de `v18.2_prod` para corregir las desviaciones vistas en las últimas pruebas de Zuzu.

## Qué se ha corregido

### 1) Donaciones por donante en todos los eventos
Consulta ejemplo:

> dime las donaciones de "CIEN CLASICOS". Dime los eventos en donde han donado y el producto que han donado.

Ahora ControlEvent no deja que el planificador filtre antes de tiempo por evento/persona/tienda. Primero carga DONACIONES de forma transversal y después aplica el buscador inteligente sobre el donante real. Esto evita respuestas del tipo “0 registros” con una cabecera llena de eventos.

### 2) Evolución del saldo de caja sin depender de Zuzu
Consulta ejemplo:

> Dame las gráficas de evolución del saldo de caja de todos los eventos del año 2025 ordenados temporalmente, comenzando con un saldo de 4141,07 €.

Este caso se resuelve ahora de forma local y determinista con EVENTOS + INGRESOS + COMPRAS, sin llamada obligatoria a Gemini/Zuzu. Calcula por fecha:

- saldo inicial antes del evento,
- ingresos,
- compras realizadas,
- movimiento del evento,
- saldo acumulado de caja.

Genera tabla y gráficas de línea/barras usando el saldo inicial indicado por el usuario.

### 3) Informes de participación de personas o entidades
Consulta ejemplo:

> Saca informe de 2 páginas de "Colty" con la participación tanto como responsable, como donante, o como colaborador.

Ahora este tipo de pregunta ya no se contesta con un informe genérico del evento seleccionado. ControlEvent detecta que se trata de un informe de participación y busca transversalmente en:

- INGRESOS, como colaborador/asistente,
- COMPRAS, como responsable de compra,
- DONACIONES, como responsable de donación,
- DONACIONES, como donante.

La respuesta separa claramente el papel desempeñado en cada evento.

### 4) Prioridad de respuestas corregida
Antes, el informe general de evento podía “robar” peticiones que realmente eran sobre una persona, donante o saldo. Ahora la prioridad es:

1. saldo de caja,
2. informe de participación de persona/entidad,
3. aparición de persona,
4. rankings/productos,
5. donaciones por donante,
6. comprado/donado,
7. informe general de evento.

### 5) Errores de cuota de Zuzu saneados
Si la API se niega por cuota, timeout o clave, ya no se muestra el texto técnico en inglés. Se devuelve un mensaje en español y, cuando la pregunta puede resolverse localmente, se muestra directamente el respaldo analítico de ControlEvent.

### 6) Línea de entretenimiento / avance de Zuzu
Se ha acelerado el avance visual y se fuerza que complete los pasos pendientes antes de pintar la respuesta. Así no debería quedarse aparentemente clavado en el punto 1/7 cuando la respuesta llega rápido.

## Archivos modificados

- `services/event-ai.service.js`
- `services/event-context.service.js`
- `public/app/features/v11-3-zuzu-analitica-libre.js`
- `app/features/v11-3-zuzu-analitica-libre.js`
- `public/app/version.js`
- `index.html`
- `public/index.html`
- `package.json`

## Validaciones realizadas

- `node --check services/event-context.service.js`
- `node --check services/event-ai.service.js`
- `node --check public/app/features/v11-3-zuzu-analitica-libre.js`
- `node --check app/features/v11-3-zuzu-analitica-libre.js`
- `unzip -t` sobre el ZIP final.

No se ha hecho prueba real contra Supabase/Gemini desde este entorno porque no están disponibles las credenciales ni el despliegue real.
