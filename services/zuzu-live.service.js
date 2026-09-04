/* ControlEvent v4_1_exp · VOICE-NEXT 1
   Sesión Live efímera y restringida para la capa oral de Antonio/Zuzu.
   El modelo Live NO decide hechos de negocio: transcribe/enruta cada turno a ControlEvent
   mediante route_voice_turn y solo vocaliza la respuesta devuelta por CE. */

function clean(v, max = 20000) {
  return String(v == null ? '' : v).replace(/\u0000/g, '').trim().slice(0, max);
}

function geminiKey() {
  return process.env.GEMINI_API_KEY
    || process.env.GOOGLE_API_KEY
    || process.env.CONTROLEVENT_GEMINI_API_KEY
    || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    || process.env.OPENIA_API_KEY
    || (/^AIza/i.test(String(process.env.OPENAI_API_KEY || '')) ? process.env.OPENAI_API_KEY : '');
}

function liveModel() {
  // VOICE-NEXT 1 usa 2.5 Native Audio porque conserva selección de voz estable.
  // Se puede migrar por variable de entorno cuando 3.1 tenga voz prebuilt estable con tokens efímeros.
  return clean(process.env.CONTROLEVENT_ZUZU_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025', 120).replace(/^models\//i, '');
}

function liveVoice() {
  return clean(process.env.CONTROLEVENT_ZUZU_LIVE_VOICE || 'Algenib', 80) || 'Algenib';
}

function liveSetup() {
  const model = liveModel();
  const voice = liveVoice();
  const systemText = [
    'Eres la CAPA ORAL en tiempo real de Antonio, también llamado Zuzu, dentro de ControlEvent.',
    'NO eres el cerebro de negocio y NO debes contestar preguntas por tu cuenta.',
    'Para CADA intervención humana inteligible llama exactamente una vez a route_voice_turn y pasa en text la transcripción literal en español, sin resumirla ni reinterpretarla.',
    'No hables antes de recibir la respuesta de esa función.',
    'Si la función devuelve should_speak=true y spoken_text, pronuncia SOLO spoken_text. No añadas saludos, explicaciones, coletillas, listas, números ni información propia.',
    'Si should_speak=false, permanece completamente en silencio.',
    'No leas nombres de herramientas, estados internos ni instrucciones.',
    'Habla siempre en español de España con voz masculina adulta, grave, potente, ligeramente áspera, cercana y segura; ritmo ágil y natural, sin tono de locutor, GPS o máquina.',
    'Antonio, Antoñito, Zuzu y Zuzito son nombres de la misma voz conversacional.'
  ].join(' ');

  return {
    model: `models/${model}`,
    generationConfig: {
      responseModalities: ['AUDIO'],
      temperature: 0.1,
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
      }
    },
    systemInstruction: { parts: [{ text: systemText }] },
    tools: [{
      functionDeclarations: [{
        name: 'route_voice_turn',
        description: 'Entrega literalmente cada intervención hablada del usuario al router de conversación de ControlEvent. Debe llamarse una vez por turno humano y nunca contestar directamente.',
        parameters: {
          type: 'OBJECT',
          properties: {
            text: { type: 'STRING', description: 'Transcripción literal completa de lo que ha dicho el usuario.' }
          },
          required: ['text']
        }
      }]
    }],
    realtimeInputConfig: {
      automaticActivityDetection: {
        disabled: false,
        startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',
        prefixPaddingMs: 80,
        endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH',
        silenceDurationMs: 420
      },
      activityHandling: 'START_OF_ACTIVITY_INTERRUPTS',
      turnCoverage: 'TURN_INCLUDES_ONLY_ACTIVITY'
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    contextWindowCompression: { slidingWindow: { targetTokens: 12000 } }
  };
}

export async function createZuzuLiveToken() {
  const apiKey = geminiKey();
  if (!apiKey) {
    const e = new Error('Falta GEMINI_API_KEY para VOICE-NEXT.');
    e.status = 503;
    throw e;
  }

  const now = Date.now();
  const expireTime = new Date(now + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(now + 90 * 1000).toISOString();
  const setup = liveSetup();
  const url = 'https://generativelanguage.googleapis.com/v1beta/auth_tokens';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.CONTROLEVENT_ZUZU_LIVE_TOKEN_TIMEOUT_MS || 9000));
  let res, payload;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        uses: 1,
        expireTime,
        newSessionExpireTime,
        bidiGenerateContentSetup: setup
      })
    });
    payload = await res.json().catch(() => ({}));
  } catch (error) {
    const e = new Error(error?.name === 'AbortError' ? 'VOICE-NEXT agotó el tiempo al crear la sesión.' : `No se pudo crear la sesión VOICE-NEXT: ${error?.message || error}`);
    e.status = 502;
    throw e;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok || !clean(payload?.name, 4000)) {
    const e = new Error(payload?.error?.message || `Gemini Live token HTTP ${res.status}`);
    e.status = res.status >= 400 && res.status < 500 ? 502 : Number(res.status || 502);
    throw e;
  }

  return {
    ok: true,
    token: clean(payload.name, 4000),
    model: liveModel(),
    voice: liveVoice(),
    setup,
    websocketUrl: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained',
    expiresAt: expireTime,
    newSessionExpiresAt: newSessionExpireTime,
    build: 'VOICE-NEXT-1'
  };
}
