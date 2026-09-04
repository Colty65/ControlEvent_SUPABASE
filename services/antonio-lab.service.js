/* ControlEvent v4_1_exp · ANTONIO LAB V1
   Laboratorio AISLADO de voz. No conecta con VNext/CE ni con la ventana Zuzu.
   OÍDO: gemini-3.5-transcribe-live -> texto.
   BOCA: gemini-3.1-flash-live-preview -> audio de una única voz.
*/

function clean(v,max=20000){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function geminiKey(){
  return process.env.GEMINI_API_KEY
    || process.env.GOOGLE_API_KEY
    || process.env.CONTROLEVENT_GEMINI_API_KEY
    || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    || '';
}
const WS='wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained';
const VOCAB=[
  'Antonio','Antoñito','Zuzu','Zuzito','ControlEvent','SySA','Colty','Cito','Pocholo','Curvas','Esther','FUNCION',
  'Cuadre Banco','Liquidaciones','Responsables','Peña El Arrastre','Semana Santa','Santana','Santiago'
];

function transcribeSetup(){
  return {
    model:'models/gemini-3.5-transcribe-live',
    generationConfig:{responseModalities:['TEXT']},
    inputAudioTranscription:{
      languageCodes:['es-ES'],
      customVocabulary:VOCAB,
      mode:'VERBATIM'
    },
    realtimeInputConfig:{
      automaticActivityDetection:{
        disabled:false,
        startOfSpeechSensitivity:'START_SENSITIVITY_HIGH',
        endOfSpeechSensitivity:'END_SENSITIVITY_HIGH',
        prefixPaddingMs:80,
        silenceDurationMs:420
      }
    }
  };
}

function speakSetup(){
  const voice=clean(process.env.CONTROLEVENT_ANTONIO_LAB_VOICE||'Algenib',80)||'Algenib';
  return {
    model:'models/gemini-3.1-flash-live-preview',
    generationConfig:{
      responseModalities:['AUDIO'],
      temperature:0.05,
      speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:voice}}}
    },
    systemInstruction:{parts:[{text:[
      'Eres únicamente la BOCA de Antonio en un laboratorio de audio.',
      'No converses, no inventes y no añadas contenido.',
      'Cuando recibas texto entre <say> y </say>, pronuncia SOLO ese texto en español de España.',
      'Voz masculina adulta, grave, potente, algo áspera, cercana y segura; ritmo ágil y natural.',
      'No uses tono de locutor, GPS, asistente corporativo ni voz robótica.'
    ].join(' ')}]}
  };
}

async function createToken(setup,kind){
  const key=geminiKey();
  if(!key){const e=new Error('Falta GEMINI_API_KEY para ANTONIO LAB.');e.status=503;throw e;}
  const now=Date.now();
  const expireTime=new Date(now+30*60*1000).toISOString();
  const newSessionExpireTime=new Date(now+2*60*1000).toISOString();
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),9000);
  let res,payload;
  try{
    res=await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-goog-api-key':key},
      signal:controller.signal,
      body:JSON.stringify({uses:1,expireTime,newSessionExpireTime,bidiGenerateContentSetup:setup})
    });
    payload=await res.json().catch(()=>({}));
  }catch(error){
    const e=new Error(error?.name==='AbortError'?`ANTONIO LAB agotó el tiempo creando token ${kind}.`:`No se pudo crear token ${kind}: ${error?.message||error}`);
    e.status=502;throw e;
  }finally{clearTimeout(timeout);}
  const token=clean(payload?.name,5000);
  if(!res.ok||!token){const e=new Error(payload?.error?.message||`Gemini token ${kind} HTTP ${res.status}`);e.status=502;throw e;}
  return {ok:true,kind,token,setup,websocketUrl:WS,expiresAt:expireTime};
}

export async function createAntonioLabTranscribeToken(){return createToken(transcribeSetup(),'ear');}
export async function createAntonioLabSpeakToken(){
  const setup=speakSetup();
  const out=await createToken(setup,'mouth');
  return {...out,voice:setup.generationConfig?.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName||'Algenib'};
}

export function antonioLabConfig(){return {ok:true,build:'ANTONIO-LAB-V1',earModel:'gemini-3.5-transcribe-live',mouthModel:'gemini-3.1-flash-live-preview',voice:clean(process.env.CONTROLEVENT_ANTONIO_LAB_VOICE||'Algenib',80)||'Algenib',vocabulary:VOCAB};}
