# ControlEvent v18.7_prod · Zuzu redacta informes con tono

Versión construida sobre `v18.6_prod`.

## Motivo
Los informes ya traían mucho detalle operativo, pero el texto de cabecera era prácticamente igual aunque el usuario pidiera estilos muy distintos, por ejemplo:

- informe coloquial con chascarrillos para socios;
- informe financiero/técnico para Dirección.

## Cambios incluidos

- Añadida una fase de **redacción narrativa de Zuzu** para informes locales de alta confianza.
- ControlEvent sigue calculando y preparando tablas, gráficas y CSV con datos oficiales.
- Zuzu recibe un resumen compacto de esos datos y redacta el texto principal según el tono solicitado.
- Si el usuario pide tono coloquial, informal, simpático, para socios o con chascarrillos, la cabecera se redacta de forma cercana.
- Si el usuario pide tono técnico, financiero, contable, auditoría o Dirección, la cabecera se redacta en estilo ejecutivo y formal.
- Si Zuzu/Gemini falla o no hay cuota, ControlEvent aplica una redacción local de respaldo según el tono detectado, sin mostrar errores técnicos al usuario.
- Reforzado el `systemPrompt` para que las respuestas no sean solo tablas: primero interpretación y conclusiones; después detalle estructurado.
- Actualizada versión visible, `package.json`, `package-lock.json` y sufijos de exportación a `v18.7_prod` / `v18_7_prod`.

## Flujo resultante

1. Zuzu planifica módulos y filtros.
2. ControlEvent extrae y calcula datos oficiales.
3. ControlEvent genera tablas, gráficas y CSV.
4. Zuzu redacta el texto de cabecera y conclusiones respetando el tono pedido.
5. Si Zuzu no está disponible, se usa redacción local de respaldo.

## Validación realizada

- `node --check services/event-ai.service.js`
- `node --check services/event-context.service.js`
- `node --check public/app/features/v11-3-zuzu-analitica-libre.js`
- `node --check public/app/features/v10-5-app-fixes.js`
- `node --check public/app/features/planificacion-inicial.js`
- `unzip -t` del ZIP final
