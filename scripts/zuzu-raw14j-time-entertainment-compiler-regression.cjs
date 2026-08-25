const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const svc=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const voice=fs.readFileSync(path.join(root,'public/app/features/v22-voz3-zuzu.js'),'utf8');
let pass=0,fail=0;function t(name,ok){if(ok){console.log('OK · '+name);pass++;}else{console.error('KO · '+name);fail++;}}

// Entretenimiento: 60 distintas, ciclo continuo y consumo al INICIO real de TTS.
const phraseBlock=(voice.match(/var ENTERTAINMENT_PHRASES=\[([\s\S]*?)\];/)||[])[1]||'';
const phrases=[...phraseBlock.matchAll(/'((?:\\'|[^'])*)'/g)].map(m=>m[1]);
t('hay exactamente 60 frases',phrases.length===60);
t('las 60 frases son distintas',new Set(phrases.map(x=>x.toLowerCase())).size===60);
t('baraja RAW14J usa estado v41 y lista de usadas',/entertainment_deck_v41/.test(voice)&&/entertainment_used_v41/.test(voice));
t('primera frase arranca a los 2 segundos',/startEntertainment\(\)[\s\S]{0,180}scheduleEntertainment\(2000\)/.test(voice));
t('cada frase terminada programa otra a los 2 segundos mientras siga la consulta',/entertainmentEnded[\s\S]{0,350}requestInFlight\)scheduleEntertainment\(2000\)/.test(voice));
t('ya no existe límite de dos frases',!/entertainmentCount\s*[<>]=?\s*2/.test(voice)&&!/entertainmentCount<2/.test(voice));
t('una frase se consume cuando SpeechSynthesis confirma onstart',/u\.onstart=function\(\)\{started=true;commitEntertainmentIndex\(idx\);\}/.test(voice));
t('se conserva pausa mínima de 0,5 s antes de respuesta',/Math\.max\(0,500-\(Date\.now\(\)-\(state\.entertainmentFinishedAt\|\|0\)\)\)/.test(voice));

// Contrato Zuzu/CE: compuestos en una sola tool y recompilación automática si Zuzu devuelve varias.
t('people_mode tiene enum estructural',/peopleMode=\{type:'string'[\s\S]{0,420}enum:\['attendance_full','attendees','attending_members','attending_non_members','non_attending_members','canonical_members','income'\]/.test(svc));
t('solo asistentes sin distinguir socio obliga attendees, no attendance_full',/Si pide SOLO asistentes sin distinguir condición de socio, people_mode="attendees"/.test(svc));
t('petición personas + varios aspectos + gráfica sigue siendo una sola ce_query',/PETICIÓN COMPUESTA DE UN MISMO OBJETO:[\s\S]{0,700}UNA sola ce_query/.test(svc));
t('si Zuzu emite varias tools se le pide consolidar sin que CE las mezcle',/RECOMPILACIÓN ZUZU · MÚLTIPLES COMANDOS/.test(svc)&&/CE no mezcla ni interpreta las tools/.test(svc));
t('la recompilación dispone de una segunda llamada real',/repairCommand[\s\S]{0,1400}maxCalls:2/.test(svc));

// Contexto temporal llega hasta la fase final y gobierna el tiempo verbal.
t('packet final contiene temporal_context',/temporal_context:v73CompactFinalValue\(v73EventTemporalContext/.test(svc));
t('fase final prohíbe pasado cerrado mientras el evento siga En curso',/TIEMPO VERBAL DEL EVENTO:[\s\S]{0,1400}En curso[^\n]*phase=ongoing\/open_after_window[^\n]*nunca pasado cerrado[\s\S]{0,500}prohibido afirmar/.test(svc));
t('current_context no puede fingir que ha perdido el hilo',/current_context[\s\S]{0,400}PROHIBIDO decir que has perdido el hilo/.test(svc));
t('z_DEV con sufijo underscore queda excluido del censo canónico',/\^z\[_\\s-\]\*dev\(\?:\$\|\[_\\s-\]\)/.test(svc));

// Ejecuta el clasificador temporal de forma aislada.
const a=svc.indexOf('function v73EventTemporalContext');
const b=svc.indexOf('function v73EnsureInProgressNotice',a);
if(a>=0&&b>a){
  const code=svc.slice(a,b),trim=v=>String(v==null?'':v).trim(),arr=v=>Array.isArray(v)?v:[],norm=v=>trim(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ ]+/g,' ').replace(/\s+/g,' ').trim();
  const parseCeDateToIso=value=>{const s=trim(value),m1=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m1)return`${m1[1]}-${String(m1[2]).padStart(2,'0')}-${String(m1[3]).padStart(2,'0')}`;const m2=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);if(m2){const y=m2[3].length===2?`20${m2[3]}`:m2[3];return`${y}-${String(m2[2]).padStart(2,'0')}-${String(m2[1]).padStart(2,'0')}`;}return'';};
  const state={eventos:[{id:'e1',titulo:'FUNCION 2026',situacion:'En curso',fechaIni:'21/08/2026',fechaFin:'08/09/2026'},{id:'e2',titulo:'FUNCION 2025',situacion:'Finalizado',fechaIni:'15/08/2025',fechaFin:'08/09/2025'}]};
  const box={arr,trim,norm,Date,parseCeDateToIso,isEventInProgressValue:v=>/en\s*curso|abiert|activo|preparaci[oó]n/i.test(trim(v)),v70EventLookup:st=>new Map(st.eventos.map(e=>[norm(e.titulo),e])),v26EventById:(st,id)=>st.eventos.find(e=>e.id===id)};
  vm.createContext(box);vm.runInContext(code+'\nthis.temporal=v73EventTemporalContext;',box);
  const ongoing=box.temporal(state,{scope:{kind:'screen_event'}},'e1',{local:'2026-08-25T20:33:00',timezone:'Europe/Madrid'});
  const past=box.temporal(state,{scope:{kind:'named_event',event:'FUNCION 2025'}},'e1',{local:'2026-08-25T20:33:00',timezone:'Europe/Madrid'});
  t('FUNCION 2026 el 25/08/2026 se clasifica ongoing',ongoing.events[0]?.phase==='ongoing');
  t('evento Finalizado se clasifica past',past.events[0]?.phase==='past');
}else t('se localiza helper temporal',false);

console.log(`\nRAW14J · ${pass}/${pass+fail} comprobaciones OK`);process.exit(fail?1:0);
