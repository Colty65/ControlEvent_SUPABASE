/* ControlEvent v4_1_exp · ZUZU LAB V3
   Laboratorio aislado: Gemini transcribe fragmentos; VNext/CE responde y Gemini Live Native Audio pronuncia la respuesta con baja latencia.
*/
function clean(v,max=20000){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max)}
function geminiKey(){return process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||process.env.CONTROLEVENT_GEMINI_API_KEY||process.env.GOOGLE_GENERATIVE_AI_API_KEY||(/^(AIza)/i.test(String(process.env.OPENAI_API_KEY||''))?process.env.OPENAI_API_KEY:'')||''}
function model(){return clean(process.env.CONTROLEVENT_ANTONIO_STT_MODEL||'gemini-3.1-flash-lite',120).replace(/^models\//i,'')}
const BUILD='ZUZU-LAB-V3.16.2-LIVE-HANDSHAKE-STABLE';
const LAB_TTS_VOICE='Iapetus';
export function antonioLabConfig(){return {ok:true,build:BUILD,configured:Boolean(geminiKey()),provider:'Gemini STT + VNext/CE + Gemini Live 2.5 Native Audio',sttModel:model(),ttsModel:'gemini-2.5-flash-native-audio-preview-12-2025',voiceId:LAB_TTS_VOICE,voiceProfile:'adulta, clara, natural, cercana y poco teatral',fallbackVoiceId:LAB_TTS_VOICE,recoveryTtsModel:'',wakeMode:'Activar = escucha continua; Dormir = requiere llamada para volver',paidNewServices:0,ttsTransport:'Live API WebSocket directo con token efímero · una sola sesión de voz',notes:'Boca única Gemini Live 2.5 con Iapetus. Sin modelos TTS de respaldo ni cambio de voz.'}}


const LIVE_PRIMARY_MODEL='gemini-2.5-flash-native-audio-preview-12-2025';
const LIVE_MODELS=new Set([LIVE_PRIMARY_MODEL]);
function antonioLiveMouthInstruction(){return 'Eres exclusivamente la BOCA de Zuzu. No contestas preguntas, no razonas y no añades contenido. Pronuncia fielmente en español de España el texto que recibas, sin añadir ni quitar información. Voz adulta, cotidiana, clara, cercana y relajada.'}
function antonioLiveSetup(model=LIVE_PRIMARY_MODEL){return {model:`models/${model}`,generationConfig:{responseModalities:['AUDIO'],temperature:0.08,speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:LAB_TTS_VOICE}}}},systemInstruction:{parts:[{text:antonioLiveMouthInstruction()}]}}}
export async function createAntonioLiveToken(options={}){
  const key=geminiKey();if(!key){const e=new Error('Falta GEMINI_API_KEY para Gemini Live.');e.status=503;throw e}
  const requested=clean(options?.model||LIVE_PRIMARY_MODEL,160).replace(/^models\//i,''),selected=LIVE_MODELS.has(requested)?requested:LIVE_PRIMARY_MODEL;
  const now=Date.now(),expireTime=new Date(now+18*60*1000).toISOString(),newSessionExpireTime=new Date(now+90*1000).toISOString();
  const base={uses:1,expireTime,newSessionExpireTime},locked={...base,bidiGenerateContentSetup:antonioLiveSetup(selected)};
  const call=async body=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);let res,payload;
    try{res=await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},signal:controller.signal,body:JSON.stringify(body)});payload=await res.json().catch(()=>({}))}
    catch(error){const e=new Error(error?.name==='AbortError'?'Gemini Live agotó el tiempo al crear el token.':`No se pudo crear token Gemini Live: ${error?.message||error}`);e.status=502;throw e}
    finally{clearTimeout(timer)}
    return {res,payload};
  };
  // Primero intentamos fijar el setup en el token con el campo REST BidiGenerateContentSetup.
  // Si el backend de la cuenta aún no reconoce ese campo, usamos el token mínimo que ya sabemos que la cuenta acepta
  // y el setup completo se manda como primer mensaje WebSocket.
  let {res,payload}=await call(locked),setupLocked=true;
  if(!res.ok){
    const msg=clean(payload?.error?.message||'',1200);
    if(/unknown name\s+["']?bidigeneratecontentsetup|cannot find field/i.test(msg)){({res,payload}=await call(base));setupLocked=false;}
  }
  if(!res.ok||!clean(payload?.name,1000)){const e=new Error(payload?.error?.message||`Gemini Live token HTTP ${res.status}`);e.status=502;throw e}
  return {ok:true,token:clean(payload.name,1400),model:selected,voice:LAB_TTS_VOICE,expiresAt:expireTime,setupLocked};
}

function ttsModel(){return clean(process.env.CONTROLEVENT_ZUZU_TTS_MODEL||'gemini-3.1-flash-tts-preview',120).replace(/^models\//i,'')}
function ttsVoice(){return LAB_TTS_VOICE}
function zuzuTtsPrompt(text=''){
  const spoken=clean(text,5000);
  return `Habla en español de España. Voz de hombre adulto, clara, cotidiana, sobria, relajada y cercana. Sonido natural de conversación entre amigos, con emoción contenida y ritmo normal. Evita voz cinematográfica, épica, seductora, de personaje, locutor, centralita, profesor o anuncio. No fuerces graves ni aspereza. Haz pausas cortas y orgánicas, sin sobreactuar. Pronuncia exactamente el contenido útil que sigue, sin leer estas instrucciones ni añadir saludos o despedidas:\n\n${spoken}`;
}
function interactionAudioData(payload){
  const out=[],push=v=>{const s=clean(v,12000000);if(s)out.push(s)};
  const eventType=clean(payload?.event_type||payload?.eventType||payload?.type,80);
  const delta=payload?.delta||payload?.data?.delta;
  if(eventType==='step.delta'&&clean(delta?.type,40)==='audio')push(delta?.data);
  if(clean(payload?.delta?.type,40)==='audio')push(payload?.delta?.data);
  if(clean(payload?.output_audio?.data,12000000))push(payload.output_audio.data);
  if(clean(payload?.outputAudio?.data,12000000))push(payload.outputAudio.data);
  const parts=payload?.candidates?.[0]?.content?.parts||[];
  for(const part of parts){const mime=clean(part?.inlineData?.mimeType||part?.inline_data?.mime_type,80);if(/^audio\//i.test(mime))push(part?.inlineData?.data||part?.inline_data?.data)}
  return [...new Set(out)];
}
export async function streamZuzuTts(text,onChunk=()=>true,options={}){
  const key=geminiKey();if(!key){const e=new Error('Falta GEMINI_API_KEY para la voz de Zuzu.');e.status=503;throw e}
  const spoken=clean(text,5000);if(!spoken)return {ok:true,bytes:0,seconds:0,chunks:0,costUsd:0,model:ttsModel(),voice:ttsVoice(),firstChunkMs:0,totalMs:0,transport:'interactions'};
  const url='https://generativelanguage.googleapis.com/v1beta/interactions';
  const body={model:ttsModel(),input:zuzuTtsPrompt(spoken),response_format:{type:'audio'},generation_config:{speech_config:[{voice:ttsVoice()}]},stream:true};
  const controller=new AbortController(),totalTimeoutMs=Number(process.env.CONTROLEVENT_ZUZU_TTS_TIMEOUT_MS||20000),firstAudioTimeoutMs=Number(process.env.CONTROLEVENT_ZUZU_TTS_FIRST_AUDIO_TIMEOUT_MS||8000);
  let firstAudioTimedOut=false,externalAbort;
  if(options?.signal){externalAbort=()=>controller.abort(options.signal.reason||new Error('Cliente desconectado'));if(options.signal.aborted)externalAbort();else options.signal.addEventListener('abort',externalAbort,{once:true})}
  const totalTimer=setTimeout(()=>controller.abort(new Error('Gemini TTS agotó el tiempo total de espera.')),totalTimeoutMs);
  let firstAudioTimer=setTimeout(()=>{firstAudioTimedOut=true;controller.abort(new Error('Gemini TTS no entregó primer audio a tiempo.'))},firstAudioTimeoutMs);
  const started=Date.now();let res;
  try{res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key,'Api-Revision':'2026-05-20'},signal:controller.signal,body:JSON.stringify(body)})}
  catch(error){clearTimeout(totalTimer);clearTimeout(firstAudioTimer);if(options?.signal&&externalAbort)options.signal.removeEventListener('abort',externalAbort);const msg=firstAudioTimedOut?`Gemini TTS no entregó primer audio en ${firstAudioTimeoutMs} ms.`:error?.name==='AbortError'?'Gemini TTS agotó el tiempo de espera.':`Gemini TTS falló: ${error?.message||error}`;const e=new Error(msg);e.status=502;throw e}
  if(!res.ok){clearTimeout(totalTimer);clearTimeout(firstAudioTimer);if(options?.signal&&externalAbort)options.signal.removeEventListener('abort',externalAbort);const msg=await res.text().catch(()=>''),e=new Error(msg||`Gemini TTS HTTP ${res.status}`);e.status=502;throw e}
  if(!res.body){clearTimeout(totalTimer);clearTimeout(firstAudioTimer);if(options?.signal&&externalAbort)options.signal.removeEventListener('abort',externalAbort);const e=new Error('Gemini TTS no devolvió un stream legible.');e.status=502;throw e}
  const reader=res.body.getReader(),decoder=new TextDecoder();let pending='',eventName='',dataLines=[],bytes=0,chunks=0,firstChunkMs=0;
  const consumePayload=async raw=>{
    const joined=clean(raw,13000000);if(!joined||joined==='[DONE]')return true;
    let payload;try{payload=JSON.parse(joined)}catch{return true}
    for(const b64 of interactionAudioData(payload)){
      const buf=Buffer.from(b64,'base64');if(!buf.length)continue;
      bytes+=buf.length;chunks++;if(!firstChunkMs){firstChunkMs=Date.now()-started;clearTimeout(firstAudioTimer);firstAudioTimer=0}
      const keep=await onChunk({data:buf.toString('base64'),bytes:buf.length,index:chunks,firstChunkMs,eventType:eventName||clean(payload?.event_type||payload?.eventType||payload?.type,80)});
      if(keep===false)return false;
    }
    return true;
  };
  const flushEvent=async()=>{if(!dataLines.length){eventName='';return true}const raw=dataLines.join('\n');dataLines=[];const keep=await consumePayload(raw);eventName='';return keep};
  const consumeLine=async line=>{
    const s=String(line||'').replace(/\r$/,'');
    if(!s.trim())return flushEvent();
    if(s.startsWith('event:')){eventName=s.slice(6).trim();return true}
    if(s.startsWith('data:')){dataLines.push(s.slice(5).trim());return true}
    if(s.trim().startsWith('{'))return consumePayload(s.trim());
    return true;
  };
  try{
    while(true){
      const {value,done}=await reader.read();if(done)break;
      pending+=decoder.decode(value,{stream:true});
      let nl;
      while((nl=pending.indexOf('\n'))>=0){
        const line=pending.slice(0,nl);pending=pending.slice(nl+1);
        if((await consumeLine(line))===false){try{controller.abort()}catch{}const seconds=bytes/(24000*2);return {ok:false,cancelled:true,bytes,seconds,chunks,costUsd:seconds*.0005,model:ttsModel(),voice:ttsVoice(),firstChunkMs,totalMs:Date.now()-started,transport:'interactions'};}
      }
    }
    if(pending.trim())await consumeLine(pending);
    await flushEvent();
  }catch(error){
    if(firstAudioTimedOut&&!firstChunkMs){const e=new Error(`Gemini TTS no entregó primer audio en ${firstAudioTimeoutMs} ms.`);e.status=502;throw e}
    throw error
  }finally{
    clearTimeout(totalTimer);if(firstAudioTimer)clearTimeout(firstAudioTimer);try{reader.releaseLock?.()}catch{}if(options?.signal&&externalAbort)options.signal.removeEventListener('abort',externalAbort)
  }
  if(!chunks){const e=new Error('Gemini TTS terminó sin audio utilizable.');e.status=502;throw e}
  const seconds=bytes/(24000*2);return {ok:true,bytes,seconds,chunks,costUsd:seconds*.0005,model:ttsModel(),voice:ttsVoice(),firstChunkMs,totalMs:Date.now()-started,transport:'interactions'};
}

function extractText(payload){return clean(payload?.candidates?.[0]?.content?.parts?.map(p=>p?.text||'').join(' ')||'',2000)}
function parse(raw){let s=clean(raw,1800).replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();if(!s)return '';try{const o=JSON.parse(s);const v=clean(o?.text||o?.transcript||o?.transcription||'',1200);if(v)return v}catch{}const m=s.match(/["']?text["']?\s*:\s*"((?:\\.|[^"\\])*)"/i);if(m){try{return clean(JSON.parse(`"${m[1]}"`),1200)}catch{return clean(m[1].replace(/\\n/g,' ').replace(/\\"/g,'"'),1200)}}return clean(s.replace(/^\{+|\}+$/g,'').replace(/^["']|["']$/g,'').trim(),1200)}
const WAKE_CONTROL_WORDS=new Set(['zuzu','zuzito','antonio','antonito']);
function normControlWords(v){return clean(v,1200).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ ]+/g,' ').replace(/\s+/g,' ').trim()}
function isImpossibleWakeCluster(text,seconds){const sec=Number(seconds||0),words=normControlWords(text).split(' ').filter(Boolean);if(!(sec>0&&sec<=1.6)||words.length<2)return false;const uniq=new Set(words);return uniq.size>=2&&words.every(w=>WAKE_CONTROL_WORDS.has(w))}
export async function transcribeAntonioLab(body={}){
  const key=geminiKey();if(!key){const e=new Error('Falta GEMINI_API_KEY para ZUZU LAB V3.');e.status=503;throw e}
  const data=clean(body.audioBase64||'',16000000).replace(/^data:audio\/[a-z0-9.+-]+;base64,/i,'');if(!data||data.length<1000)return {ok:true,text:'',empty:true,model:model(),usage:{}};
  const instruction='Transcribe literalmente este fragmento corto de habla en español de España. No respondas, no expliques y no añadas formato. Conserva los nombres propios únicamente cuando se oigan con claridad. No uses contexto previo, listas de nombres, palabras sugeridas ni el nombre del asistente para adivinar contenido. Si una palabra o un nombre no se entiende con suficiente claridad, no lo inventes. Devuelve ÚNICAMENTE el texto transcrito en texto plano, sin JSON, sin comillas, sin etiquetas y sin markdown. Si no hay habla inteligible o el audio es ambiguo, devuelve una cadena vacía.';
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model())}:generateContent`;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Number(process.env.CONTROLEVENT_ANTONIO_STT_TIMEOUT_MS||12000));let res,payload;
  try{res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},signal:controller.signal,body:JSON.stringify({contents:[{role:'user',parts:[{text:instruction},{inlineData:{mimeType:'audio/wav',data}}]}],generationConfig:{temperature:0,maxOutputTokens:96}})});payload=await res.json().catch(()=>({}))}catch(error){const e=new Error(error?.name==='AbortError'?'Zuzu STT agotó el tiempo de espera.':`Zuzu STT falló: ${error?.message||error}`);e.status=502;throw e}finally{clearTimeout(timer)}
  if(!res.ok){const e=new Error(payload?.error?.message||`Gemini STT HTTP ${res.status}`);e.status=502;throw e}
  const usage=payload?.usageMetadata||{},transcript=parse(extractText(payload)),seconds=Number(body?.seconds||0),ghostFiltered=isImpossibleWakeCluster(transcript,seconds);return {ok:true,text:ghostFiltered?'':transcript,ghostFiltered,discardReason:ghostFiltered?'wake_alias_cluster_in_microaudio':'',model:model(),usage:{promptTokens:Number(usage.promptTokenCount||0),outputTokens:Number(usage.candidatesTokenCount||0),totalTokens:Number(usage.totalTokenCount||0)}}
}
function latin(s){return clean(s,5000).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/[^\x20-\x7E\xA0-\xFF]/g,'?')}
function pdfEsc(s){return latin(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function wrapLine(text,width=94){const words=latin(text).split(/\s+/).filter(Boolean),out=[];let cur='';for(const w of words){const n=cur?`${cur} ${w}`:w;if(n.length>width&&cur){out.push(cur);cur=w}else cur=n}if(cur)out.push(cur);return out.length?out:['']}
function diagnosticLines(d){const out=[],add=(k,v)=>{if(v===undefined||v===null||v==='')return;wrapLine(`${k}: ${typeof v==='object'?JSON.stringify(v):v}`).forEach(x=>out.push(x))};out.push('CONTROL EVENT - ZUZU LAB V3.16.2 - DIAGNOSTICO');out.push('');add('Generado',d?.generatedAt||new Date().toISOString());add('Build',d?.build);add('Arquitectura',d?.architecture);add('URL',d?.environment?.url);add('Navegador',d?.environment?.userAgent);add('Plataforma',d?.environment?.platform);add('Contexto seguro',d?.environment?.secureContext);add('Permiso micro',d?.environment?.microphonePermission);add('Ajustes micro',d?.environment?.micSettings);add('Sample rate',d?.environment?.audioContextSampleRate);add('Activo',d?.state?.active);add('Despierto',d?.state?.awake);add('Hablando',d?.state?.speaking);add('Voz cacheada',d?.state?.ttsCached);add('Voz',d?.state?.voiceId);add('Ruido/umbral',d?.vad);add('Interrupciones',d?.metrics?.interruptions);add('Audio enviado a Gemini s',d?.metrics?.sentAudioSeconds);add('Coste STT estimado USD',d?.metrics?.estimatedSttUsd);add('Ultima latencia STT ms',d?.metrics?.lastSttMs);add('Primera sintesis local ms',d?.metrics?.lastTtsMs);add('Sintesis total locucion ms',d?.metrics?.lastTtsTotalMs);add('Tramos TTS',d?.metrics?.ttsChunks);add('Primer audio ms',d?.metrics?.lastFirstAudioMs);add('Turnos detectados',d?.metrics?.turnSeq);add('Último turno',d?.metrics?.latestTurnId);add('Cola pendiente',d?.metrics?.queueDepth);add('Cola procesando',d?.metrics?.queueRunning);add('Fragmentos encolados',d?.metrics?.queuedUtterances);add('Respuestas obsoletas descartadas',d?.metrics?.staleRepliesDiscarded);out.push('');out.push('EVENTOS');(Array.isArray(d?.events)?d.events:[]).slice(-220).forEach((e,i)=>wrapLine(`${String(i+1).padStart(3,'0')} ${e?.at||''} [${e?.type||'event'}] ${e?.message||''}`,105).forEach(x=>out.push(x)));return out}
export function createAntonioDiagnosticPdf(d){const lines=diagnosticLines(d),per=55,pages=[];for(let i=0;i<lines.length;i+=per)pages.push(lines.slice(i,i+per));if(!pages.length)pages.push(['Sin datos']);const objects={1:Buffer.from('<< /Type /Catalog /Pages 2 0 R >>','latin1'),3:Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>','latin1')};const kids=[];let next=4;for(const pageLines of pages){const c=next++,p=next++;kids.push(`${p} 0 R`);const cmds=['BT','/F1 8 Tf','36 806 Td','11 TL'];for(const line of pageLines)cmds.push(`(${pdfEsc(line)}) Tj`,'T*');cmds.push('ET');const stream=Buffer.from(cmds.join('\n'),'latin1');objects[c]=Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`,'latin1'),stream,Buffer.from('\nendstream','latin1')]);objects[p]=Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${c} 0 R >>`,'latin1')}objects[2]=Buffer.from(`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`,'latin1');const max=Math.max(...Object.keys(objects).map(Number)),chunks=[Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n','latin1')],offsets=new Array(max+1).fill(0);let pos=chunks[0].length;for(let i=1;i<=max;i++){const body=objects[i]||Buffer.from('<<>>','latin1');offsets[i]=pos;const a=Buffer.from(`${i} 0 obj\n`,'latin1'),b=Buffer.from('\nendobj\n','latin1');chunks.push(a,body,b);pos+=a.length+body.length+b.length}const xref=pos;let x=`xref\n0 ${max+1}\n0000000000 65535 f \n`;for(let i=1;i<=max;i++)x+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;x+=`trailer\n<< /Size ${max+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;chunks.push(Buffer.from(x,'latin1'));return Buffer.concat(chunks)}
