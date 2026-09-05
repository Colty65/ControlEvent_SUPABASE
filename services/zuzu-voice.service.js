/* ControlEvent v4_1_exp · FIX29 · Transcripción de voz CE
   Fallback independiente de Web Speech: recibe un fragmento corto de audio y
   devuelve únicamente la transcripción. Reutiliza la clave Gemini ya existente. */

function clean(v, max = 20000000) {
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

function voiceModel() {
  return clean(process.env.CONTROLEVENT_ZUZU_VOICE_MODEL || 'gemini-2.5-flash-lite', 120).replace(/^models\//i, '');
}


function ttsModel() {
  // Recuperacion: usa otro modelo para no compartir la cuota diaria de 3.1.
  // La voz sigue siendo Iapetus, por lo que cambia el motor, no el timbre elegido.
  return clean(process.env.CONTROLEVENT_ZUZU_TTS_RECOVERY_MODEL || 'gemini-2.5-flash-preview-tts', 120).replace(/^models\//i, '');
}

function ttsVoice(v) {
  const requested = clean(v || process.env.CONTROLEVENT_ZUZU_TTS_VOICE || 'Iapetus', 80);
  const allowed = new Set(['Algenib', 'Orus', 'Gacrux', 'Charon', 'Alnilam', 'Rasalgethi', 'Zubenelgenubi', 'Iapetus']);
  return allowed.has(requested) ? requested : 'Iapetus';
}

function pcmToWavBase64(pcmBase64, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const pcm = Buffer.from(clean(pcmBase64, 28_000_000), 'base64');
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]).toString('base64');
}

function supportedMime(v) {
  const m = clean(v, 120).toLowerCase().split(';')[0];
  if (/^audio\/(webm|ogg|mp4|mpeg|mp3|wav|x-wav|aac|flac)$/.test(m)) return m === 'audio/mp3' ? 'audio/mpeg' : m;
  return 'audio/webm';
}

function extractText(payload) {
  return clean(payload?.candidates?.[0]?.content?.parts?.map(p => p?.text || '').join(' ') || '', 2000);
}

function parseTranscript(raw) {
  let text = clean(raw, 2000);
  if (!text) return { text: '', wake: false };
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const obj = JSON.parse(text);
    return {
      text: clean(obj?.text || obj?.transcript || obj?.transcription || '', 900),
      wake: obj?.wake === true
    };
  } catch (_) {
    return { text: clean(text.replace(/^['\"]|['\"]$/g, ''), 900), wake: false };
  }
}

export async function transcribeZuzuVoice(body = {}) {
  const apiKey = geminiKey();
  if (!apiKey) {
    const e = new Error('Falta GEMINI_API_KEY para la transcripción de voz de Zuzu.');
    e.status = 503;
    throw e;
  }

  const audioBase64 = clean(body.audioBase64 || body.audio || '', 12_000_000).replace(/^data:audio\/[a-z0-9.+-]+;base64,/i, '');
  if (!audioBase64 || audioBase64.length < 1200) return { ok: true, text: '', empty: true, model: voiceModel() };
  if (audioBase64.length > 11_000_000) {
    const e = new Error('El fragmento de voz es demasiado largo.');
    e.status = 413;
    throw e;
  }

  const model = voiceModel();
  const mimeType = supportedMime(body.mimeType);
  const mode = clean(body.mode || 'user', 20).toLowerCase();
  const instruction = mode === 'ambient'
    ? 'Transcribe exactamente el habla inteligible de este audio en español. No respondas. Además indica wake=true si el hablante está llamando claramente a Zuzu (por ejemplo Hola Zuzu, Oye Zuzu o una pronunciación/transcripción cercana del nombre). Si el comienzo del saludo queda ligeramente recortado por la captura pero se oye con claridad que la persona llama a Zuzu, también usa wake=true. Devuelve SOLO JSON válido: {"text":"transcripción","wake":true|false}. Si no hay habla inteligible, text vacío y wake=false.'
    : mode === 'barge'
      ? 'Este audio se graba mientras Zuzu está hablando por el altavoz. Ignora la propia voz sintética de Zuzu y cualquier eco. Devuelve text SOLO si oyes a una persona intentando cortar claramente a Zuzu con una orden como Perdona Zuzu, Para Zuzu, Zuzu para, Calla Zuzu, Espera Zuzu, Corta Zuzu o una variante inequívoca. Si después de la orden la persona continúa hablando, conserva también esa continuación. Si no hay una interrupción humana inequívoca, devuelve text vacío. No respondas. SOLO JSON válido: {"text":"..."}.'
      : 'Transcribe exactamente la pregunta o frase hablada de este audio en español. Conserva nombres propios, cifras y referencias como TK01, SySA o Zuzu. No respondas a la pregunta. Devuelve SOLO JSON válido con esta forma: {"text":"transcripción"}. Si no hay habla inteligible, usa texto vacío.';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.CONTROLEVENT_ZUZU_VOICE_TIMEOUT_MS || 14000));
  let res, payload;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { text: instruction },
          { inlineData: { mimeType, data: audioBase64 } }
        ] }],
        generationConfig: { temperature: 0, maxOutputTokens: 96, responseMimeType: 'application/json' }
      })
    });
    payload = await res.json().catch(() => ({}));
  } catch (error) {
    const e = new Error(error?.name === 'AbortError' ? 'La transcripción de voz agotó el tiempo de espera.' : `No se pudo transcribir la voz: ${error?.message || error}`);
    e.status = 502;
    throw e;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const e = new Error(payload?.error?.message || `Gemini voz HTTP ${res.status}`);
    e.status = res.status >= 400 && res.status < 500 ? 502 : Number(res.status || 502);
    throw e;
  }

  const parsed = parseTranscript(extractText(payload));
  const usage = payload?.usageMetadata || {};
  return {
    ok: true,
    text: parsed.text,
    wake: mode === 'ambient' ? !!parsed.wake : false,
    model,
    usage: {
      promptTokens: Number(usage.promptTokenCount || 0),
      outputTokens: Number(usage.candidatesTokenCount || 0),
      totalTokens: Number(usage.totalTokenCount || 0)
    }
  };
}

export async function synthesizeZuzuVoice(body = {}) {
  const apiKey = geminiKey();
  if (!apiKey) {
    const e = new Error('Falta GEMINI_API_KEY para la voz neural de Zuzu.');
    e.status = 503;
    throw e;
  }

  const text = clean(body.text || body.content || '', 4200);
  if (!text) return { ok: true, empty: true, audioBase64: '', mimeType: 'audio/wav', model: ttsModel(), voice: ttsVoice(body.voice) };

  const model = ttsModel();
  const voice = ttsVoice(body.voice);
  const style = clean(body.style || '', 700) || 'Voz masculina adulta, cotidiana, sobria, casual y cercana. Español de España natural. Ritmo de conversación normal, relajado y fluido, con emoción contenida. Evita sonar cinematográfico, épico, seductor o como un personaje. Nada de tono de locutor, GPS, presentador, profesor o máquina. No fuerces graves ni aspereza y no sobreactúes.';
  const prompt = `${style}

Di únicamente el siguiente contenido. No añadas ni quites información y no leas estas instrucciones en voz alta:
${text}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.CONTROLEVENT_ZUZU_TTS_TIMEOUT_MS || 16000));
  let res, payload;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            languageCode: 'es-ES',
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
          }
        }
      })
    });
    payload = await res.json().catch(() => ({}));
  } catch (error) {
    const e = new Error(error?.name === 'AbortError' ? 'La voz neural de Zuzu agotó el tiempo de espera.' : `No se pudo generar la voz neural: ${error?.message || error}`);
    e.status = 502;
    throw e;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const e = new Error(payload?.error?.message || `Gemini TTS HTTP ${res.status}`);
    e.status = res.status >= 400 && res.status < 500 ? 502 : Number(res.status || 502);
    throw e;
  }

  const part = payload?.candidates?.[0]?.content?.parts?.find(p => p?.inlineData?.data || p?.inline_data?.data);
  const pcmBase64 = clean(part?.inlineData?.data || part?.inline_data?.data || '', 28_000_000);
  if (!pcmBase64) {
    const e = new Error('Gemini TTS no devolvió audio.');
    e.status = 502;
    throw e;
  }

  const usage = payload?.usageMetadata || {};
  return {
    ok: true,
    model,
    voice,
    mimeType: 'audio/wav',
    sampleRate: 24000,
    audioBase64: pcmToWavBase64(pcmBase64, 24000, 1, 16),
    usage: {
      promptTokens: Number(usage.promptTokenCount || 0),
      outputTokens: Number(usage.candidatesTokenCount || 0),
      totalTokens: Number(usage.totalTokenCount || 0)
    }
  };
}

