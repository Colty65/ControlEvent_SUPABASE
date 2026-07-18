# ControlEvent v22_prod · VOZ2

Base: `v22_prod_voz1`, manteniendo intacta la inteligencia de Zuzu y el funcionamiento de FIX8.

## Novedades

- Dos opciones sencillas en la ventana de Zuzu:
  - **Femenina natural**.
  - **Masculina natural**.
- Botón **Probar voz** para escuchar una muestra con euros, porcentajes y fechas.
- Conversión previa del texto para que las cifras no se lean de forma mecánica:
  - `1.016,55 €` → “mil dieciséis euros con cincuenta y cinco céntimos”.
  - `58,69 %` → “cincuenta y ocho coma sesenta y nueve por ciento”.
  - `24/07/2026` → “veinticuatro de julio de dos mil veintiséis”.
  - `TK01` → “ticket uno”.
  - `Pte. Compra` → “pendiente de compra”.
- Pausa, continuación y detención también funcionan con las voces naturales.
- Si la voz externa falla, ControlEvent continúa automáticamente con la voz del dispositivo.
- La clave del servicio de voz nunca se envía al navegador.

## Motores admitidos

VOZ2 busca los proveedores en este orden:

1. **Azure Speech**, con:
   - `es-ES-Ximena:DragonHDLatestNeural` (femenina).
   - `es-ES-Tristan:DragonHDLatestNeural` (masculina).
2. **OpenAI Speech**, utilizando la clave que ya puede estar configurada para Ticket Auto:
   - `OPENAI_API_KEY` o `CONTROLEVENT_OPENAI_API_KEY`.
3. Voz local del navegador/dispositivo.

## Configuración recomendada para Ximena y Tristán

Añadir en Vercel:

```text
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=westeurope
CONTROLEVENT_TTS_PROVIDER=azure
```

También se aceptan:

```text
CONTROLEVENT_AZURE_SPEECH_KEY=...
CONTROLEVENT_AZURE_SPEECH_REGION=...
```

## Configuración con OpenAI ya existente

Si existe una clave OpenAI válida, no hace falta añadir nada. VOZ2 utiliza por defecto:

```text
CONTROLEVENT_TTS_PROVIDER=openai
CONTROLEVENT_TTS_OPENAI_MODEL=gpt-4o-mini-tts
CONTROLEVENT_TTS_OPENAI_FEMALE_VOICE=marin
CONTROLEVENT_TTS_OPENAI_MALE_VOICE=cedar
```

`CONTROLEVENT_TTS_PROVIDER` puede omitirse; en modo automático se intenta primero Azure y después OpenAI.

## Nuevos archivos

- `routes/voice-tts.routes.js`
- `services/voice-tts.service.js`
- `public/app/features/v22-voz2-zuzu.js`
- `app/features/v22-voz2-zuzu.js`

## Rutas nuevas

- `GET /api/voice/status`
- `POST /api/voice/speech`

La respuesta de voz es audio MP3. El navegador nunca recibe la clave del proveedor.
