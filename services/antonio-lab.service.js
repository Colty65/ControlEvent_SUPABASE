/* ControlEvent v4_1_exp · ZUZU LAB V3
   Laboratorio aislado: Gemini transcribe fragmentos; VNext/CE responde y Gemini 3.1 TTS genera la voz en streaming.
*/
function clean(v,max=20000){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max)}
function geminiKey(){return process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||process.env.CONTROLEVENT_GEMINI_API_KEY||process.env.GOOGLE_GENERATIVE_AI_API_KEY||(/^(AIza)/i.test(String(process.env.OPENAI_API_KEY||''))?process.env.OPENAI_API_KEY:'')||''}
function model(){return clean(process.env.CONTROLEVENT_ANTONIO_STT_MODEL||'gemini-3.1-flash-lite',120).replace(/^models\//i,'')}
const BUILD='ZUZU-LAB-V3.11-NATURAL-NARRATOR-ALGENIB-STREAM-PERSIST';
export function antonioLabConfig(){return {ok:true,build:BUILD,configured:Boolean(geminiKey()),provider:'Gemini STT + VNext/CE + Gemini 3.1 Flash TTS streaming',sttModel:model(),ttsModel:'gemini-3.1-flash-tts-preview',voiceId:'Algenib',voiceProfile:'grave, adulto, cálido, ligeramente áspero',fallbackVoiceId:'es_ES-davefx-medium',wakeMode:'VAD local + wake semántico sobre transcripción',paidNewServices:0,notes:'Usa la misma GEMINI_API_KEY ya existente. Algenib es la voz principal en streaming; DaveFX queda sólo como fallback local.'}}

function ttsModel(){return clean(process.env.CONTROLEVENT_ZUZU_TTS_MODEL||'gemini-3.1-flash-tts-preview',120).replace(/^models\//i,'')}
function ttsVoice(){return clean(process.env.CONTROLEVENT_ZUZU_TTS_VOICE||'Algenib',80)||'Algenib'}
function zuzuTtsPrompt(text=''){
  const spoken=clean(text,5000);
  return `Habla en español de España. Voz de hombre adulto muy grave, atractiva, cálida y ligeramente áspera; natural, cercana y con ritmo ágil de conversación entre amigos. Nada de tono de locutor, centralita, profesor ni anuncio. Haz pausas cortas y orgánicas, sin sobreactuar. Pronuncia exactamente el contenido útil que sigue, sin leer estas instrucciones ni añadir saludos o despedidas:\n\n${spoken}`;
}
export async function streamZuzuTts(text,onChunk=()=>true){
  const key=geminiKey();if(!key){const e=new Error('Falta GEMINI_API_KEY para la voz de Zuzu.');e.status=503;throw e}
  const spoken=clean(text,5000);if(!spoken)return {ok:true,bytes:0,seconds:0,chunks:0,costUsd:0,model:ttsModel(),voice:ttsVoice(),firstChunkMs:0,totalMs:0};
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(ttsModel())}:streamGenerateContent?alt=sse`;
  const body={contents:[{role:'user',parts:[{text:zuzuTtsPrompt(spoken)}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:ttsVoice()}}}}};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Number(process.env.CONTROLEVENT_ZUZU_TTS_TIMEOUT_MS||30000));
  const started=Date.now();let res;
  try{res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},signal:controller.signal,body:JSON.stringify(body)})}
  catch(error){clearTimeout(timer);const e=new Error(error?.name==='AbortError'?'Gemini TTS agotó el tiempo de espera.':`Gemini TTS falló: ${error?.message||error}`);e.status=502;throw e}
  if(!res.ok){clearTimeout(timer);const msg=await res.text().catch(()=>''),e=new Error(msg||`Gemini TTS HTTP ${res.status}`);e.status=502;throw e}
  if(!res.body){clearTimeout(timer);const e=new Error('Gemini TTS no devolvió un stream legible.');e.status=502;throw e}
  const reader=res.body.getReader(),decoder=new TextDecoder();let pending='',bytes=0,chunks=0,firstChunkMs=0;
  const consumeEvent=async raw=>{
    const lines=String(raw||'').split(/\r?\n/),dataLines=[];
    for(const line of lines){if(line.startsWith('data:'))dataLines.push(line.slice(5).trim())}
    if(!dataLines.length)return true;
    const joined=dataLines.join('\n');if(joined==='[DONE]')return true;
    let payload;try{payload=JSON.parse(joined)}catch{return true}
    const parts=payload?.candidates?.[0]?.content?.parts||[];
    for(const part of parts){
      const b64=clean(part?.inlineData?.data||'',12000000);if(!b64)continue;
      const buf=Buffer.from(b64,'base64');if(!buf.length)continue;
      bytes+=buf.length;chunks++;if(!firstChunkMs)firstChunkMs=Date.now()-started;
      const keep=await onChunk({data:buf.toString('base64'),bytes:buf.length,index:chunks,firstChunkMs});
      if(keep===false)return false;
    }
    return true;
  };
  try{
    while(true){
      const {value,done}=await reader.read();if(done)break;
      pending+=decoder.decode(value,{stream:true});
      let cut;
      while((cut=pending.search(/\r?\n\r?\n/))>=0){
        const raw=pending.slice(0,cut),match=pending.slice(cut).match(/^\r?\n\r?\n/);pending=pending.slice(cut+(match?match[0].length:2));
        if((await consumeEvent(raw))===false){try{controller.abort()}catch{}const seconds=bytes/(24000*2);return {ok:false,cancelled:true,bytes,seconds,chunks,costUsd:seconds*.0005,model:ttsModel(),voice:ttsVoice(),firstChunkMs,totalMs:Date.now()-started};}
      }
    }
    if(pending.trim())await consumeEvent(pending);
  }finally{clearTimeout(timer);try{reader.releaseLock?.()}catch{}}
  const seconds=bytes/(24000*2);return {ok:true,bytes,seconds,chunks,costUsd:seconds*.0005,model:ttsModel(),voice:ttsVoice(),firstChunkMs,totalMs:Date.now()-started};
}

function extractText(payload){return clean(payload?.candidates?.[0]?.content?.parts?.map(p=>p?.text||'').join(' ')||'',2000)}
function parse(raw){let s=clean(raw,1800).replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();if(!s)return '';try{const o=JSON.parse(s);const v=clean(o?.text||o?.transcript||o?.transcription||'',1200);if(v)return v}catch{}const m=s.match(/["']?text["']?\s*:\s*"((?:\\.|[^"\\])*)"/i);if(m){try{return clean(JSON.parse(`"${m[1]}"`),1200)}catch{return clean(m[1].replace(/\\n/g,' ').replace(/\\"/g,'"'),1200)}}return clean(s.replace(/^\{+|\}+$/g,'').replace(/^["']|["']$/g,'').trim(),1200)}
export async function transcribeAntonioLab(body={}){
  const key=geminiKey();if(!key){const e=new Error('Falta GEMINI_API_KEY para ZUZU LAB V3.');e.status=503;throw e}
  const data=clean(body.audioBase64||'',16000000).replace(/^data:audio\/[a-z0-9.+-]+;base64,/i,'');if(!data||data.length<1000)return {ok:true,text:'',empty:true,model:model(),usage:{}};
  const instruction='Transcribe literalmente este fragmento corto de habla en español de España. No respondas, no expliques y no añadas formato. Conserva nombres propios y, en especial, Zuzu, Zuzito, Antonio y Antoñito si se oyen. Devuelve ÚNICAMENTE el texto transcrito en texto plano, sin JSON, sin comillas, sin etiquetas y sin markdown. Si no hay habla inteligible, devuelve una cadena vacía.';
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model())}:generateContent`;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Number(process.env.CONTROLEVENT_ANTONIO_STT_TIMEOUT_MS||12000));let res,payload;
  try{res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},signal:controller.signal,body:JSON.stringify({contents:[{role:'user',parts:[{text:instruction},{inlineData:{mimeType:'audio/wav',data}}]}],generationConfig:{temperature:0,maxOutputTokens:96}})});payload=await res.json().catch(()=>({}))}catch(error){const e=new Error(error?.name==='AbortError'?'Zuzu STT agotó el tiempo de espera.':`Zuzu STT falló: ${error?.message||error}`);e.status=502;throw e}finally{clearTimeout(timer)}
  if(!res.ok){const e=new Error(payload?.error?.message||`Gemini STT HTTP ${res.status}`);e.status=502;throw e}
  const usage=payload?.usageMetadata||{};return {ok:true,text:parse(extractText(payload)),model:model(),usage:{promptTokens:Number(usage.promptTokenCount||0),outputTokens:Number(usage.candidatesTokenCount||0),totalTokens:Number(usage.totalTokenCount||0)}}
}
function latin(s){return clean(s,5000).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/[^\x20-\x7E\xA0-\xFF]/g,'?')}
function pdfEsc(s){return latin(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function wrapLine(text,width=94){const words=latin(text).split(/\s+/).filter(Boolean),out=[];let cur='';for(const w of words){const n=cur?`${cur} ${w}`:w;if(n.length>width&&cur){out.push(cur);cur=w}else cur=n}if(cur)out.push(cur);return out.length?out:['']}
function diagnosticLines(d){const out=[],add=(k,v)=>{if(v===undefined||v===null||v==='')return;wrapLine(`${k}: ${typeof v==='object'?JSON.stringify(v):v}`).forEach(x=>out.push(x))};out.push('CONTROL EVENT - ZUZU LAB V3.11 - DIAGNOSTICO');out.push('');add('Generado',d?.generatedAt||new Date().toISOString());add('Build',d?.build);add('Arquitectura',d?.architecture);add('URL',d?.environment?.url);add('Navegador',d?.environment?.userAgent);add('Plataforma',d?.environment?.platform);add('Contexto seguro',d?.environment?.secureContext);add('Permiso micro',d?.environment?.microphonePermission);add('Ajustes micro',d?.environment?.micSettings);add('Sample rate',d?.environment?.audioContextSampleRate);add('Activo',d?.state?.active);add('Despierto',d?.state?.awake);add('Hablando',d?.state?.speaking);add('Voz cacheada',d?.state?.ttsCached);add('Voz',d?.state?.voiceId);add('Ruido/umbral',d?.vad);add('Interrupciones',d?.metrics?.interruptions);add('Audio enviado a Gemini s',d?.metrics?.sentAudioSeconds);add('Coste STT estimado USD',d?.metrics?.estimatedSttUsd);add('Ultima latencia STT ms',d?.metrics?.lastSttMs);add('Primera sintesis local ms',d?.metrics?.lastTtsMs);add('Sintesis total locucion ms',d?.metrics?.lastTtsTotalMs);add('Tramos TTS',d?.metrics?.ttsChunks);add('Primer audio ms',d?.metrics?.lastFirstAudioMs);add('Turnos detectados',d?.metrics?.turnSeq);add('Último turno',d?.metrics?.latestTurnId);add('Cola pendiente',d?.metrics?.queueDepth);add('Cola procesando',d?.metrics?.queueRunning);add('Fragmentos encolados',d?.metrics?.queuedUtterances);add('Respuestas obsoletas descartadas',d?.metrics?.staleRepliesDiscarded);out.push('');out.push('EVENTOS');(Array.isArray(d?.events)?d.events:[]).slice(-220).forEach((e,i)=>wrapLine(`${String(i+1).padStart(3,'0')} ${e?.at||''} [${e?.type||'event'}] ${e?.message||''}`,105).forEach(x=>out.push(x)));return out}
export function createAntonioDiagnosticPdf(d){const lines=diagnosticLines(d),per=55,pages=[];for(let i=0;i<lines.length;i+=per)pages.push(lines.slice(i,i+per));if(!pages.length)pages.push(['Sin datos']);const objects={1:Buffer.from('<< /Type /Catalog /Pages 2 0 R >>','latin1'),3:Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>','latin1')};const kids=[];let next=4;for(const pageLines of pages){const c=next++,p=next++;kids.push(`${p} 0 R`);const cmds=['BT','/F1 8 Tf','36 806 Td','11 TL'];for(const line of pageLines)cmds.push(`(${pdfEsc(line)}) Tj`,'T*');cmds.push('ET');const stream=Buffer.from(cmds.join('\n'),'latin1');objects[c]=Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`,'latin1'),stream,Buffer.from('\nendstream','latin1')]);objects[p]=Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${c} 0 R >>`,'latin1')}objects[2]=Buffer.from(`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`,'latin1');const max=Math.max(...Object.keys(objects).map(Number)),chunks=[Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n','latin1')],offsets=new Array(max+1).fill(0);let pos=chunks[0].length;for(let i=1;i<=max;i++){const body=objects[i]||Buffer.from('<<>>','latin1');offsets[i]=pos;const a=Buffer.from(`${i} 0 obj\n`,'latin1'),b=Buffer.from('\nendobj\n','latin1');chunks.push(a,body,b);pos+=a.length+body.length+b.length}const xref=pos;let x=`xref\n0 ${max+1}\n0000000000 65535 f \n`;for(let i=1;i<=max;i++)x+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;x+=`trailer\n<< /Size ${max+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;chunks.push(Buffer.from(x,'latin1'));return Buffer.concat(chunks)}
