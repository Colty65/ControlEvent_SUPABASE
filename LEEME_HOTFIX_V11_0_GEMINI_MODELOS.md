# Hotfix v11.1_prod - Gemini modelos soportados

Este hotfix no cambia la versión visible de la app: se mantiene **v11.1_prod**.

## Problema corregido

En algunas llamadas aparecía el error:

> models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent

Esto podía ocurrir si la variable de entorno `GEMINI_MODEL`, `GOOGLE_GEMINI_MODEL`, `CONTROLEVENT_TICKET_AI_MODEL` o `CONTROLEVENT_EVENT_AI_MODEL` seguía apuntando a `gemini-1.5-flash`.

## Corrección aplicada

Se han modificado solo:

- `services/receipt-ai.service.js`
- `services/event-ai.service.js`
- `.env.example`

Cambios:

- Ya no se llama a modelos antiguos tipo `gemini-1.5-*` ni `gemini-pro` aunque estén configurados en variables de entorno.
- Lista de modelos preferente:
  1. `gemini-2.5-flash`
  2. `gemini-2.5-flash-lite`
  3. `gemini-flash-latest`
  4. `gemini-2.0-flash`
  5. `gemini-2.0-flash-lite`
- Si en Vercel tienes configurada una variable antigua, la app la ignora y prueba modelos actuales.
- Se admite poner varios modelos separados por coma, punto y coma o espacios.

## Recomendación de Vercel

Si existe alguna de estas variables con valor `gemini-1.5-flash`, conviene cambiarla a:

```text
GEMINI_MODEL=gemini-2.5-flash
```

O directamente eliminarla y dejar que ControlEvent use su lista interna.
