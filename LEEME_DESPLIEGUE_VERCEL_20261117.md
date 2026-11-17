# Control Event v6.1 — preparación Vercel

## Referencias
- Producción anterior: `ControlEvent_SUPABASE`, commit `7fa4e97b10996782a2c87b837bdddcb868a95b05`, v4.1 Zuzu Lab 3.12.3.
- Base de trabajo: ZIP v6.1 EXP del 15/11/2026, que el usuario confirma funcional en localhost.
- No se ha modificado la base de datos ni las rutas de negocio.

## Cambio fundamental ya presente en la v6.1
La antigua configuración de Vercel enviaba **todos** los recursos a `api/index.js` y empaquetaba `public/**` dentro de la función. La v6.1 ya tiene en `vercel.json` reglas para servir estáticos mediante CDN, y la API tiene `serveFrontend:false`. Se conserva esta mejora: es la principal medida de reducción de carga respecto a la versión suspendida en septiembre.

## Ajustes de este paquete
- `.gitignore`: impide incorporar accidentalmente `.env`, archivos temporales, uploads y dependencias al repositorio.
- `.env.example`: únicamente nombres de variables, sin claves.
- Configuración de Vercel original de v6.1 preservada para evitar regresiones de rutas.

## Antes de desplegar
1. Realizar una copia o marcar el despliegue actual de producción en Vercel (commit 7fa4e97). No borrar ese deployment.
2. En GitHub comprobar que **ningún archivo `.env` ha sido confirmado anteriormente**. `.gitignore` no elimina los secretos del historial: si existieron, revocar y rotar claves afectadas.
3. En Vercel > Settings > Environment Variables verificar `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `GEMINI_API_KEY` (más cualquier otra variable real de localhost). Configurarlas para Preview y Production según corresponda. Nunca incluir claves en el ZIP ni en `public/`.
4. Hacer un despliegue **Preview primero** en rama separada, sin sustituir aún Production.
5. Verificar carga de `/`, assets JS/CSS, `/api/version`, `/api/health`, login, eventos, Banco, conciliación, justificantes, Zuzu y voz móvil. Monitorizar Fluid Active CPU en Usage.
6. Promocionar a producción solo cuando el conjunto de comprobaciones sea satisfactorio. Mantener disponible el despliegue antiguo para rollback.

## Pruebas realizadas fuera de producción
- Comparación de `vercel.json` v4.1 frente a v6.1: confirma separación de estáticos.
- Archivo `.env` ausente en los ZIP entregados; exclusión `.env` existente en `.vercelignore`.
- Validación de sintaxis Node de módulos de backend: ver resultado del informe adjunto.
- **Pruebas heredadas no superadas en la base v6.1 sin cambios de lógica**: `v6-0-1-version-and-runtime-regression.cjs` (9 OK, 1 KO, extractor/parser) y `v4-1-exp-vnext-p1181-golden-arr-hotfix-regression.cjs` (2/5, expectativas de UI). Requieren evaluación separada antes de certificar toda la suite.

## Advertencias
- No se ha probado un despliegue real de Vercel ni se han medido horas de CPU en producción.
- No reducir `maxDuration:60` a ciegas: algunas solicitudes de IA tienen tiempos máximos propios; un límite inferior podría romperlas.
- Un ZIP de GitHub es un archivo de código: para actualizar el despliegue conectado a GitHub se recomienda subir estos cambios en una rama nueva y generar Preview.
- No lanzar baterías intensivas de Zuzu en producción sin control de consumo.
