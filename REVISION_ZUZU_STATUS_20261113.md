# Corrección Zuzu v6 – contrato execution_intent.status (13/11/2026)

## Diagnóstico observado
La traza del usuario confirma `generateContent + responseJsonSchema` OK, con consumo IA, seguido del rechazo local `execution_intent.status inválido`. El sobre de transporte anterior contenía solo `contract_json` como cadena y no describía suficientemente el contrato interno requerido.

## Cambio
- Se mantiene `responseJsonSchema` ligero para evitar `HTTP 400 too many states for serving`.
- Se comunica a Gemini el esquema del contrato interno completo como instrucciones, derivado del esquema universal existente (sin enumerar reglas de eventos).
- Se enumeran explícitamente los estados permitidos y sus invariantes, distinguiendo DECISION y SYNTHESIS.
- Ante una salida con formato o contrato inválido, se permiten hasta tres intentos en total con el mismo proveedor y se comunica la causa de la validación anterior.
- Ningún contrato inválido se ejecuta ni se convierte automáticamente en uno válido; el validador local sigue siendo soberano.
- Si persiste el error, se mantiene el fallo explícito con diagnóstico en la traza.

## Pruebas
- `node --check services/event-ai.service.js` correcto.
- `node scripts/nov13-bank-zuzu-regression.cjs`: OK, 9 controles estructurales.
- `node scripts/cuadre-banco-multievento-raw14w-regression.cjs`: 31/31 OK.

## Alcance y limitaciones
No se ha realizado un test en vivo con Gemini ni con Supabase. La corrección reduce la probabilidad de rechazos por estados inválidos, pero no garantiza que el modelo produzca siempre un contrato útil o que la consulta sobre el evento llegue a una respuesta completa.

## Instalación
Descomprimir en carpeta separada, copiar el `.env` privado de la versión local anterior (sin compartirlo) y arrancar con `01_ARRANCAR_CONTROLEVENT_LOCAL.bat`. Primero detener el servidor anterior para evitar conflicto de puerto 3030.
