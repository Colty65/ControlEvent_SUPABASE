/* ControlEvent v4_1_exp · ANTONIO LAB V2 · ElevenLabs Agents
   Laboratorio AISLADO. No toca VNext/CE. Audio y turn-taking externalizados en ElevenLabs.
*/

function clean(v,max=20000){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function apiKey(){return clean(process.env.ELEVENLABS_API_KEY||process.env.XI_API_KEY||'',5000);}
function agentId(){return clean(process.env.CONTROLEVENT_ANTONIO_AGENT_ID||process.env.ELEVENLABS_AGENT_ID||'',300);}
function boolEnv(name,def=false){const v=clean(process.env[name]||'',30).toLowerCase();if(!v)return def;return /^(1|true|yes|si|sí|on)$/.test(v);}
const SDK_VERSION='1.18.0';
const BUILD='ANTONIO-LAB-V2-ELEVENLABS-WEBRTC';

export function antonioLabConfig(){
  const id=agentId(), key=apiKey();
  return {
    ok:true,
    build:BUILD,
    provider:'ElevenLabs Agents',
    sdkVersion:SDK_VERSION,
    configured:Boolean(id),
    authMode:key?'private-webrtc-token':'public-agent',
    hasApiKey:Boolean(key),
    agentId:id||'',
    agentIdMasked:id?`${id.slice(0,10)}…${id.slice(-5)}`:'',
    requireHttps:true,
    diagnostics:true,
    notes:key
      ?'WebRTC con conversation token emitido por servidor. La clave nunca llega al navegador.'
      :'Sin API key: el laboratorio intentará conectar el agent_id como agente público.'
  };
}

async function elevenFetch(url,options={},timeoutMs=10000){
  const key=apiKey();
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const headers={...(options.headers||{})};
    if(key)headers['xi-api-key']=key;
    const res=await fetch(url,{...options,headers,signal:controller.signal});
    const text=await res.text();
    let payload={};try{payload=text?JSON.parse(text):{};}catch(_){payload={raw:text};}
    if(!res.ok){const e=new Error(payload?.detail?.message||payload?.detail||payload?.error?.message||payload?.message||`ElevenLabs HTTP ${res.status}`);e.status=res.status>=400&&res.status<500?502:502;e.remoteStatus=res.status;throw e;}
    return payload;
  }catch(error){
    if(error?.name==='AbortError'){const e=new Error(`ElevenLabs no respondió en ${Math.round(timeoutMs/1000)} s.`);e.status=504;throw e;}
    throw error;
  }finally{clearTimeout(timeout);}
}

export async function createAntonioConversationToken(){
  const id=agentId(),key=apiKey();
  if(!id){const e=new Error('Falta ELEVENLABS_AGENT_ID (o CONTROLEVENT_ANTONIO_AGENT_ID).');e.status=503;throw e;}
  if(!key){return {ok:true,mode:'public',agentId:id};}
  const url=`https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(id)}`;
  const payload=await elevenFetch(url,{method:'GET'},12000);
  const token=clean(payload?.token,12000);
  if(!token){const e=new Error('ElevenLabs respondió sin conversation token.');e.status=502;throw e;}
  return {ok:true,mode:'private',conversationToken:token,agentId:id};
}

export async function antonioAgentHealth(){
  const id=agentId(),key=apiKey();
  if(!id)return {ok:false,configured:false,error:'Falta ELEVENLABS_AGENT_ID.'};
  if(!key)return {ok:true,configured:true,publicMode:true,agentIdMasked:`${id.slice(0,10)}…${id.slice(-5)}`,note:'Sin API key no puedo inspeccionar la configuración privada del agente.'};
  try{
    const a=await elevenFetch(`https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(id)}`,{method:'GET'},10000);
    const cfg=a?.conversation_config||{};
    return {
      ok:true,configured:true,publicMode:false,
      agentIdMasked:`${id.slice(0,10)}…${id.slice(-5)}`,
      name:clean(a?.name,200),
      language:clean(cfg?.agent?.language||cfg?.language||'',60),
      voiceId:clean(cfg?.tts?.voice_id||'',200),
      ttsModel:clean(cfg?.tts?.model_id||'',120),
      ttsSpeed:cfg?.tts?.speed??null,
      asrProvider:clean(cfg?.asr?.provider||'',120),
      asrQuality:clean(cfg?.asr?.quality||'',80),
      turnMode:clean(cfg?.turn?.mode||'',80),
      turnModel:clean(cfg?.turn?.turn_model||'',80),
      turnEagerness:clean(cfg?.turn?.turn_eagerness||'',80),
      interruptionIgnoreTerms:Array.isArray(cfg?.turn?.interruption_ignore_terms)?cfg.turn.interruption_ignore_terms.slice(0,20):[],
      softTimeoutSeconds:cfg?.turn?.soft_timeout_config?.timeout_seconds??null,
      firstMessage:clean(cfg?.agent?.first_message||'',240)
    };
  }catch(error){return {ok:false,configured:true,error:error?.message||String(error),remoteStatus:error?.remoteStatus||0};}
}

function latin(s){return clean(s,5000).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/[^\x20-\x7E\xA0-\xFF]/g,'?');}
function pdfEsc(s){return latin(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');}
function wrapLine(text,width=92){
  const words=latin(text).split(/\s+/).filter(Boolean),out=[];let cur='';
  for(const w of words){const n=cur?`${cur} ${w}`:w;if(n.length>width&&cur){out.push(cur);cur=w;}else cur=n;}if(cur)out.push(cur);return out.length?out:[''];
}
function diagnosticLines(d){
  const out=[];const add=(k,v)=>{if(v===undefined||v===null||v==='')return;wrapLine(`${k}: ${typeof v==='object'?JSON.stringify(v):v}`).forEach(x=>out.push(x));};
  out.push('CONTROL EVENT - ANTONIO LAB V2 - DIAGNOSTICO');out.push('');
  add('Generado',d?.generatedAt||new Date().toISOString());add('Build',d?.build);add('Proveedor',d?.provider);add('SDK',d?.sdkVersion);add('URL',d?.environment?.url);add('Navegador',d?.environment?.userAgent);add('Plataforma',d?.environment?.platform);add('Idioma',d?.environment?.language);add('HTTPS/contexto seguro',d?.environment?.secureContext);add('Permiso micro',d?.environment?.microphonePermission);add('Estado',d?.state?.status);add('Modo',d?.state?.mode);add('Conversation ID',d?.state?.conversationId);add('Latencia conexion ms',d?.metrics?.connectMs);add('Latencia primera voz ms',d?.metrics?.firstSpeakingMs);add('Interrupciones observadas',d?.metrics?.interruptions);add('Agent health',d?.agentHealth);
  out.push('');out.push('EVENTOS');
  const ev=Array.isArray(d?.events)?d.events:[];
  ev.slice(-180).forEach((e,i)=>{const stamp=e?.at||'';const type=e?.type||'event';const msg=e?.message||'';wrapLine(`${String(i+1).padStart(3,'0')} ${stamp} [${type}] ${msg}`,105).forEach(x=>out.push(x));});
  return out;
}
export function createAntonioDiagnosticPdf(diagnostic){
  const lines=diagnosticLines(diagnostic);const perPage=55;const pages=[];for(let i=0;i<lines.length;i+=perPage)pages.push(lines.slice(i,i+perPage));if(!pages.length)pages.push(['Sin datos']);
  const objects={};objects[1]=Buffer.from('<< /Type /Catalog /Pages 2 0 R >>','latin1');
  objects[3]=Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>','latin1');
  const kids=[];let next=4;
  pages.forEach((pageLines,idx)=>{
    const contentNum=next++,pageNum=next++;kids.push(`${pageNum} 0 R`);
    const cmds=['BT','/F1 8 Tf','36 806 Td','11 TL'];
    pageLines.forEach(line=>{cmds.push(`(${pdfEsc(line)}) Tj`,'T*');});cmds.push('ET');
    const stream=Buffer.from(cmds.join('\n'),'latin1');
    objects[contentNum]=Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`,'latin1'),stream,Buffer.from('\nendstream','latin1')]);
    objects[pageNum]=Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNum} 0 R >>`,'latin1');
  });
  objects[2]=Buffer.from(`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`,'latin1');
  const max=Math.max(...Object.keys(objects).map(Number));const chunks=[Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n','latin1')],offsets=new Array(max+1).fill(0);let pos=chunks[0].length;
  for(let i=1;i<=max;i++){const body=objects[i]||Buffer.from('<<>>','latin1');offsets[i]=pos;const a=Buffer.from(`${i} 0 obj\n`,'latin1'),b=Buffer.from('\nendobj\n','latin1');chunks.push(a,body,b);pos+=a.length+body.length+b.length;}
  const xref=pos;let x=`xref\n0 ${max+1}\n0000000000 65535 f \n`;for(let i=1;i<=max;i++)x+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;x+=`trailer\n<< /Size ${max+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  chunks.push(Buffer.from(x,'latin1'));return Buffer.concat(chunks);
}
