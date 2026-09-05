const fs=require('fs'),vm=require('vm');
const root=process.cwd();
const read=p=>fs.readFileSync(root+'/'+p,'utf8');
const lab=read('public/app/features/antonio-lab-v3.js');
const ai=read('services/event-ai.service.js');
const html=read('public/antonio-lab.html');
const itv=read('public/app/features/zuzu-test-console-gd.js');
const svc=read('services/antonio-lab.service.js');
const checks=[];const t=(n,p)=>checks.push([n,!!p]);

t('build ZUZU V3.10',/ZUZU-LAB-V3\.10-HUMAN-TIME-FAST-MOUTH-PHOTO-POINTS/.test(lab)&&/ZUZU-LAB-V3\.10-HUMAN-TIME-FAST-MOUTH-PHOTO-POINTS-GEMINI-PIPER/.test(svc)&&/ZUZU LAB V3\.10/.test(html));
t('cache V310',/20260905-V310/.test(lab)&&/20260905-V310/.test(html)&&/20260905-V310/.test(itv));
t('humanizador ISO instalado',/function v440HumanizeMachineTime/.test(ai)&&/function v440HumanDate/.test(ai)&&/Intl\.DateTimeFormat\('es-ES'/.test(ai));
t('respuesta escrita oral sin timestamp máquina',/writtenAnswer=voiceConversation\?v440HumanizeMachineTime\(rawWrittenAnswer,\{timeZone:trim\(clientTimeZone\).*spoken:false/.test(ai));
t('respuesta hablada humanizada',/spokenAnswer=v440HumanizeMachineTime\(oral\.spoken,\{timeZone:trim\(clientTimeZone\).*spoken:true/.test(ai));
t('memoria tiene salida oral específica',/name==='recall_memory'\)parts\.push\(v440VoiceMemoryAnswer/.test(ai)&&/function v440VoiceMemoryAnswer/.test(ai));
t('P2 recibe zona horaria',/runZuzuVNextP2Agent\(\{userPrompt,statePromise,[^\n]*clientTimeZone/.test(ai));
t('boca divide locución en tramos',/function splitSpeechChunks/.test(lab)&&/function synthDecodeChunk/.test(lab)&&/Comienza audio WebAudio por tramos/.test(lab));
t('primer audio depende solo del primer tramo',/first=await synthDecodeChunk\(chunks\[0\]/.test(lab)&&/nextPromise=index\+1<chunks\.length\?synthDecodeChunk/.test(lab));
t('diagnóstico conserva TTS total y chunks',/lastTtsTotalMs:S\.lastTtsTotalMs,ttsChunks:S\.ttsChunks/.test(lab));

// Prueba funcional del humanizador sin importar el servicio completo.
try{
  const a=ai.indexOf('function v440SpanishNumber');
  const b=ai.indexOf('function v437VoiceAnswerFromResults',a);
  if(a<0||b<0)throw new Error('bloque v440 no encontrado');
  const ctx={trim:v=>String(v==null?'':v).trim(),Intl,Date,console};vm.createContext(ctx);vm.runInContext(ai.slice(a,b),ctx);
  const iso='2026-08-28T16:42:42.772+00:00';
  const written=ctx.v440HumanizeMachineTime(iso,{timeZone:'Europe/Madrid',spoken:false,nowIso:'2026-09-05T06:00:00Z'});
  const spoken=ctx.v440HumanizeMachineTime(iso,{timeZone:'Europe/Madrid',spoken:true,nowIso:'2026-09-05T06:00:00Z'});
  t('timestamp escrito humano funcional',/viernes 28 de agosto de 2026, 18:42/.test(written)&&!written.includes('T16:42'));
  t('timestamp hablado humano funcional',/viernes veintiocho de agosto/.test(spoken)&&/sobre las seis y cuarenta de la tarde/.test(spoken)&&!spoken.includes('2026-08-28T'));
}catch(e){t('timestamp escrito humano funcional',false);t('timestamp hablado humano funcional',false);console.error(e.stack||e)}

try{
  const a=lab.indexOf('function splitSpeechChunks');
  const b=lab.indexOf('async function synthDecodeChunk',a);
  const ctx={clean:(v,max=5000)=>String(v==null?'':v).trim().slice(0,max)};vm.createContext(ctx);vm.runInContext(lab.slice(a,b),ctx);
  const chunks=ctx.splitSpeechChunks('Esta es una primera frase bastante corta. Esta es una segunda frase que explica algo con naturalidad y sin obligar a fabricar toda la locución antes de empezar. Y esta es la tercera frase.');
  t('chunker funcional y limitado',chunks.length>=2&&chunks.every(x=>x.length<=145));
}catch(e){t('chunker funcional y limitado',false);console.error(e.stack||e)}

let ok=0;for(const [n,p] of checks){console.log(`${p?'OK':'KO'} · ${n}`);if(p)ok++;}
console.log(`\nZUZU LAB V3.10 HUMAN TIME + FAST MOUTH: ${ok}/${checks.length}`);process.exitCode=ok===checks.length?0:1;
