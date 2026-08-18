/* ControlEvent v2.0_exp · FIX34 · Voz Zuzu
   - STT CE: transcripción corta de voz con Gemini Flash-Lite.
   - TTS estándar: una única voz masculina de Zuzu generada en servidor para PC/iPhone/iPad.
   - FIX34: transporte TTS estable/stream normalizado, voz masculina y metadatos de voz para normalización aprendida.
   No cambia SCC ni datos del evento. */

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

function ttsKey() {
  return process.env.CONTROLEVENT_ZUZU_TTS_API_KEY || geminiKey();
}

function ttsModel() {
  return clean(process.env.CONTROLEVENT_ZUZU_TTS_MODEL || 'gemini-3.1-flash-tts-preview', 120).replace(/^models\//i, '');
}

function ttsVoice() {
  // Voz única y estable para todos los dispositivos. Se puede sustituir por variable de entorno
  // sin tocar el cliente, pero por defecto Zuzu conserva siempre la misma identidad sonora.
  return clean(process.env.CONTROLEVENT_ZUZU_TTS_VOICE || 'Orus', 80) || 'Orus';
}

function supportedMime(v) {
  const m = clean(v, 120).toLowerCase().split(';')[0];
  if (/^audio\/(webm|ogg|mp4|mpeg|mp3|wav|x-wav|aac|flac)$/.test(m)) return m === 'audio/mp3' ? 'audio/mpeg' : m;
  return 'audio/webm';
}

function extractText(payload) {
  return clean(payload?.candidates?.[0]?.content?.parts?.map(p => p?.text || '').join(' ') || '', 2000);
}

function extractAudio(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    const data = clean(part?.inlineData?.data || part?.inline_data?.data || '', 24_000_000);
    if (data) return { data, mimeType: clean(part?.inlineData?.mimeType || part?.inline_data?.mime_type || '', 120) };
  }
  return { data: '', mimeType: '' };
}

const TTS_CACHE_MAX = 48;
const ttsCache = new Map();
function ttsCacheKey(model, voice, style, transcript) { return `${model}|${voice}|${style}|${transcript}`; }
function ttsCacheGet(key) {
  const hit = ttsCache.get(key); if (!hit) return null;
  ttsCache.delete(key); ttsCache.set(key, hit); return { ...hit, cached: true };
}
function ttsCachePut(key, value) {
  if (!value?.audioBase64) return;
  ttsCache.delete(key); ttsCache.set(key, value);
  while (ttsCache.size > TTS_CACHE_MAX) ttsCache.delete(ttsCache.keys().next().value);
}

function parseTranscript(raw) {
  let text = clean(raw, 2000);
  if (!text) return { text: '', wake: false };
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const obj = JSON.parse(text);
    const entities = Array.isArray(obj?.entities) ? obj.entities.slice(0, 12).map(row => ({
      type: clean(row?.type || row?.datos || 'OTROS', 20).toUpperCase(),
      text: clean(row?.text || row?.texto || row?.raw || '', 140)
    })).filter(row => row.text) : [];
    return {
      text: clean(obj?.text || obj?.transcript || obj?.transcription || '', 900),
      wake: obj?.wake === true,
      entities
    };
  } catch (_) {
    return { text: clean(text.replace(/^['\"]|['\"]$/g, ''), 900), wake: false, entities: [] };
  }
}

function writeAscii(buf, offset, text) {
  for (let i = 0; i < text.length; i++) buf[offset + i] = text.charCodeAt(i) & 0xff;
}

function pcm16leToWav(pcm, sampleRate = 24000, channels = 1) {
  const dataSize = pcm.length;
  const out = Buffer.allocUnsafe(44 + dataSize);
  writeAscii(out, 0, 'RIFF');
  out.writeUInt32LE(36 + dataSize, 4);
  writeAscii(out, 8, 'WAVE');
  writeAscii(out, 12, 'fmt ');
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20); // PCM
  out.writeUInt16LE(channels, 22);
  out.writeUInt32LE(sampleRate, 24);
  out.writeUInt32LE(sampleRate * channels * 2, 28);
  out.writeUInt16LE(channels * 2, 32);
  out.writeUInt16LE(16, 34);
  writeAscii(out, 36, 'data');
  out.writeUInt32LE(dataSize, 40);
  pcm.copy(out, 44);
  return out;
}

async function fetchGeminiJson(url, apiKey, body, timeoutMs, errorPrefix) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let res, payload;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: controller.signal,
      body: JSON.stringify(body)
    });
    payload = await res.json().catch(() => ({}));
  } catch (error) {
    const e = new Error(error?.name === 'AbortError'
      ? `${errorPrefix} agotó el tiempo de espera.`
      : `${errorPrefix}: ${error?.message || error}`);
    e.status = 502;
    throw e;
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    const e = new Error(payload?.error?.message || `${errorPrefix} HTTP ${res.status}`);
    e.status = res.status >= 400 && res.status < 500 ? 502 : Number(res.status || 502);
    throw e;
  }
  return payload;
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
    ? 'Transcribe exactamente el habla inteligible de este audio en español. No respondas. Además indica wake=true si el hablante está llamando claramente a Zuzu (por ejemplo Hola Zuzu, Oye Zuzu o una pronunciación/transcripción cercana del nombre). Extrae, sin corregirlos, los nombres o palabros que el hablante parezca usar como EVENTOS, PERSONAS, PRODUCTOS o TIENDAS. Devuelve SOLO JSON válido: {"text":"transcripción","wake":true|false,"entities":[{"type":"EVENTOS|PERSONAS|PRODUCTOS|TIENDAS|OTROS","text":"texto literal oído"}]}. Si no hay habla inteligible, text vacío, wake=false y entities=[].'
    : 'Transcribe exactamente la pregunta o frase hablada de este audio en español. Conserva nombres propios, cifras y referencias como TK01, SySA o Zuzu. No respondas a la pregunta. Extrae, sin normalizarlos, los nombres o expresiones que el hablante parezca usar como EVENTOS, PERSONAS, PRODUCTOS o TIENDAS. Devuelve SOLO JSON válido: {"text":"transcripción","entities":[{"type":"EVENTOS|PERSONAS|PRODUCTOS|TIENDAS|OTROS","text":"texto literal oído"}]}. Si no hay habla inteligible, usa texto vacío y entities=[].';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const payload = await fetchGeminiJson(url, apiKey, {
    contents: [{ role: 'user', parts: [
      { text: instruction },
      { inlineData: { mimeType, data: audioBase64 } }
    ] }],
    generationConfig: { temperature: 0, maxOutputTokens: 96, responseMimeType: 'application/json' }
  }, Number(process.env.CONTROLEVENT_ZUZU_VOICE_TIMEOUT_MS || 14000), 'La transcripción de voz');

  const parsed = parseTranscript(extractText(payload));
  const usage = payload?.usageMetadata || {};
  return {
    ok: true,
    text: parsed.text,
    wake: mode === 'ambient' ? !!parsed.wake : false,
    entities: parsed.entities || [],
    model,
    usage: {
      promptTokens: Number(usage.promptTokenCount || 0),
      outputTokens: Number(usage.candidatesTokenCount || 0),
      totalTokens: Number(usage.totalTokenCount || 0)
    }
  };
}


function zuzuTtsPrompt(transcript = '', style = 'normal') {
  const cleanText = clean(transcript, 2600);
  const cleanStyle = clean(style || 'normal', 30).toLowerCase();
  const tone = cleanStyle === 'entertainment'
    ? 'Humor seco y discreto, sin teatralizar.'
    : 'Conversación adulta, firme, sobria y natural.';
  // Prompt corto a propósito: la identidad sonora se mantiene, pero no hacemos pagar latencia
  // a cada frase con una instrucción larga y redundante.
  return `Español de España. Voz de HOMBRE adulto, barítono medio-grave, potente y sobria; ritmo conversacional ágil, sin tono de locutor. ${tone} Lee exactamente, sin añadir ni resumir: ${cleanText}`;
}

function extractStreamAudioBase64(payload = {}) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      const data = clean(part?.inlineData?.data || part?.inline_data?.data || '', 24_000_000);
      if (data) return data;
    }
  }
  return '';
}

export async function streamZuzuSpeech(body = {}, req, res) {
  const apiKey = ttsKey();
  if (!apiKey) {
    const e = new Error('Falta una clave Gemini para la voz estándar de Zuzu.');
    e.status = 503;
    throw e;
  }
  const transcript = clean(body.text || body.transcript || '', 2600);
  if (!transcript) { res.status(204).end(); return; }
  const model = ttsModel();
  const voice = ttsVoice();
  const style = clean(body.style || 'normal', 30).toLowerCase();
  const prompt = zuzuTtsPrompt(transcript, style);
  // Usamos el endpoint REST de streaming TTS y normalizamos la respuesta a SSE muy simple.
  // El navegador de CE no necesita conocer el formato interno de Gemini.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
  const controller = new AbortController();
  const timeoutMs = Number(process.env.CONTROLEVENT_ZUZU_TTS_STREAM_TIMEOUT_MS || 14000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const abortOnClose = () => { if (!res.writableEnded) controller.abort(); };
  req?.once?.('close', abortOnClose);
  const started = Date.now();
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { languageCode: 'es-ES', voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
        }
      })
    });
    if (!upstream.ok) {
      const text = clean(await upstream.text().catch(() => ''), 1200);
      const e = new Error(text || `La voz streaming de Zuzu devolvió HTTP ${upstream.status}.`);
      e.status = 502; throw e;
    }
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('X-ControlEvent-TTS-Model', model);
    res.setHeader('X-ControlEvent-TTS-Voice', voice);
    res.setHeader('X-ControlEvent-Upstream-Ms', String(Date.now() - started));
    res.flushHeaders?.();
    if (!upstream.body) throw new Error('Gemini TTS no devolvió un flujo de audio.');
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';
    const consume = (text, final = false) => {
      pending += text;
      const blocks = pending.split(/\r?\n\r?\n/);
      if (!final) pending = blocks.pop() || ''; else pending = '';
      for (const block of blocks) {
        const dataText = block.split(/\r?\n/).filter(line => /^data:/.test(line)).map(line => line.replace(/^data:\s?/, '')).join('\n').trim();
        if (!dataText || dataText === '[DONE]') continue;
        try {
          const audio = extractStreamAudioBase64(JSON.parse(dataText));
          if (audio && !res.writableEnded) { res.write(`data: ${JSON.stringify({ audio })}\n\n`); res.flush?.(); }
        } catch (_) {}
      }
      if (final && pending) pending = '';
    };
    while (!res.writableEnded) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value?.length) consume(decoder.decode(value, { stream: true }), false);
    }
    consume(decoder.decode(), true);
    if (!res.writableEnded) res.end();
  } catch (error) {
    if (error?.name === 'AbortError') { const e = new Error('La voz streaming de Zuzu agotó el tiempo de espera.'); e.status = 502; throw e; }
    throw error;
  } finally {
    clearTimeout(timer); req?.off?.('close', abortOnClose);
  }
}

export async function synthesizeZuzuSpeech(body = {}) {
  const apiKey = ttsKey();
  if (!apiKey) {
    const e = new Error('Falta una clave Gemini para la voz estándar de Zuzu.');
    e.status = 503;
    throw e;
  }

  const transcript = clean(body.text || body.transcript || '', 2600);
  if (!transcript) return { ok: true, empty: true, audioBase64: '', mimeType: 'audio/wav', model: ttsModel(), voice: ttsVoice() };

  const model = ttsModel();
  const voice = ttsVoice();
  const style = clean(body.style || 'normal', 30).toLowerCase();
  const cacheKey = ttsCacheKey(model, voice, style, transcript);
  const cached = ttsCacheGet(cacheKey); if (cached) return cached;
  const prompt = zuzuTtsPrompt(transcript, style);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        languageCode: 'es-ES',
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
      }
    }
  };

  let payload;
  let lastError;
  for (let attempt = 0; attempt < 1; attempt++) {
    try {
      payload = await fetchGeminiJson(
        url,
        apiKey,
        requestBody,
        Number(process.env.CONTROLEVENT_ZUZU_TTS_TIMEOUT_MS || 11000),
        'La síntesis de voz de Zuzu'
      );
      const audio = extractAudio(payload);
      if (audio.data) {
        const pcm = Buffer.from(audio.data, 'base64');
        if (!pcm.length) throw new Error('Gemini TTS devolvió audio vacío.');
        const wav = pcm16leToWav(pcm, 24000, 1);
        const usage = payload?.usageMetadata || {};
        const result = {
          ok: true,
          audioBase64: wav.toString('base64'),
          mimeType: 'audio/wav',
          model,
          voice,
          cached: false,
          usage: {
            promptTokens: Number(usage.promptTokenCount || 0),
            outputTokens: Number(usage.candidatesTokenCount || 0),
            totalTokens: Number(usage.totalTokenCount || 0)
          }
        };
        if (style === 'entertainment' || transcript.length <= 190) ttsCachePut(cacheKey, result);
        return result;
      }
      lastError = new Error('Gemini TTS no devolvió audio.');
    } catch (error) {
      lastError = error;
    }
  }
  const e = new Error(lastError?.message || 'No se pudo generar la voz de Zuzu.');
  e.status = Number(lastError?.status || 502);
  throw e;
}

// Exportado solo para pruebas unitarias del contenedor; no forma parte de la API HTTP.
export const __voiceTest = { pcm16leToWav, ttsVoice, ttsModel, zuzuTtsPrompt };
