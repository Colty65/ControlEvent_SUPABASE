import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const servicePath=path.join(root,'services','event-ai.service.js');
const voicePath=path.join(root,'public','app','features','v22-voz3-zuzu.js');
const svc=fs.readFileSync(servicePath,'utf8');
const voice=fs.readFileSync(voicePath,'utf8');

let ok=0;
function test(name,cond){
  if(!cond){console.error('KO · '+name);process.exitCode=1;return;}
  ok++; console.log('OK · '+name);
}

// Contrato / continuidad / ejecución CE.
test('RAW14A identificado',svc.includes('RAW14A · SCHEMA LIGERO + CONTINUIDAD + CÁLCULO CE + VOZ MASCULINA'));
test('person con people[1] se convierte mecánicamente a person',/filters\.people\.length===1\)\{filters\.person=filters\.people\[0\];filters\.people=\[\];\}/.test(svc));
test('event_series exige series y rechaza event/events',svc.includes('scope event_series debe usar series y no event/events'));
test('scope reciente de evento tiene autoridad cronológica',svc.includes('autoridad temporal del ámbito de evento')&&svc.includes("eventScopeSource='explicit_set_context'"));
test('varios eventos + referencia singular obliga a aclarar',svc.includes('Si CURRENT_CONTEXT.scope contiene VARIOS eventos')&&svc.includes('usa ce_clarify'));
test('people incluye situación de pago por evento',svc.includes('people = asistencia/censo/presencia E INGRESO/SITUACIÓN DE PAGO dentro de un evento'));
test('parejas/grupos exactos se conservan indivisibles',svc.includes('ENTIDADES CANÓNICAS INDIVISIBLES')&&svc.includes('No la partas por conjunciones'));
test('Zuzu puede ordenar agregación explícita por operations_json',svc.includes('group_field')&&svc.includes('metric_role')&&svc.includes('aggregation')&&svc.includes('Zuzu decide QUÉ calcular y CE calcula')&&svc.includes('toda agregación viaja por operations_json'));
test('Redacción final no puede hacer aritmética sobre filas',svc.includes('ARITMÉTICA: NO calcules sumas, promedios, mínimos, máximos'));
test('Zuzu final recibe audiencia informal y formal',svc.includes('audience:{usuario:')&&svc.includes('nombre:profile.nombre||display'));
test('Zuzu permite vocativo ocasional según tono',svc.includes('En tono informal/colegueo usa audience.usuario')&&svc.includes('seria, formal, ejecutiva o delicada usa audience.nombre'));
test('voz final puede resumir la escrita',svc.includes('Es correcto RESUMIR para voz aunque written_answer sea más completo'));
test('voz de dinero trunca; escrito conserva decimales',svc.includes('SOLO la parte entera truncada hacia cero')&&svc.includes('written_answer conserva siempre el importe exacto con sus decimales'));
test('Zuzu reintenta una sola vez JSON inválido',svc.includes('PRESENTACIÓN · REINTENTO JSON')&&svc.includes('MISMO resultado CE')&&svc.includes('Zuzu reintenta JSON'));

// Voz del navegador: entretenimiento y lectura monetaria.
const phraseMatch=voice.match(/var ENTERTAINMENT_PHRASES=\[([\s\S]*?)\n  \];/);
const phraseCount=phraseMatch?(phraseMatch[1].match(/'[^']*'/g)||[]).length:0;
test('hay al menos 35 frases de entretenimiento',phraseCount>=35);
test('ciclo persistente no repite hasta agotar catálogo',voice.includes('if(state.entertainmentUsed.length>=ENTERTAINMENT_PHRASES.length){state.entertainmentUsed=[];state.entertainmentCycle++;}')&&voice.includes('if(!used.has(i))available.push(i)'));
test('respuesta no cancela frase de entretenimiento activa',voice.includes("ce:zuzu-response-rendered")&&voice.includes('stopEntertainment(false)'));
test('respuesta espera a que la frase termine',voice.includes('if(state.entertainmentSpeaking){state.pendingAnswerTimer=setTimeout(deliver,60);return;}'));
test('respuesta oral deja al menos 500 ms tras entretenimiento',voice.includes('Math.max(0,500-(Date.now()-(state.entertainmentFinishedAt||0)))'));
test('vocativos naturales no se eliminan antes de hablar',voice.includes('Los vocativos naturales')&&voice.includes('stripVoiceAnswerLead'));

// Ejecuta la transformación de importes sin arrancar micrófonos ni DOM real.
const store=new Map();
const sandbox={
  window:{
    __ceV22Voz3Zuzu:false,
    addEventListener(){},
    speechSynthesis:{cancel(){},speak(){},getVoices(){return[];}},
    SpeechSynthesisUtterance:function(t){this.text=t;},
    MutationObserver:function(){this.observe=()=>{};},
  },
  document:{readyState:'loading',addEventListener(){},getElementById(){return null;},querySelector(){return null;},head:{appendChild(){}},body:null,documentElement:{}},
  navigator:{mediaDevices:null},
  localStorage:{getItem(k){return store.has(k)?store.get(k):null;},setItem(k,v){store.set(k,String(v));}},
  console, setTimeout(){return 0;},clearTimeout(){},setInterval(){return 0;},clearInterval(){},Date,Math,JSON,Number,String,Array,Object,Set,Map,RegExp,Promise,Error,Event:function(){},Blob:function(){},URL:{createObjectURL(){return'';},revokeObjectURL(){}},MediaRecorder:undefined,fetch:undefined
};
sandbox.window.window=sandbox.window;
sandbox.window.document=sandbox.document;
sandbox.window.navigator=sandbox.navigator;
sandbox.window.localStorage=sandbox.localStorage;
sandbox.window.setTimeout=sandbox.setTimeout;
sandbox.window.clearTimeout=sandbox.clearTimeout;
sandbox.window.Event=sandbox.Event;
vm.createContext(sandbox);
try{vm.runInContext(voice,sandbox,{filename:'v22-voz3-zuzu.js'});}catch(e){console.error('KO · carga VM voz:',e);process.exitCode=1;}
const api=sandbox.window.ControlEventVoiceTurns;
test('API de voz RAW14 cargable sin iniciar micrófono',!!api&&String(api.version).includes('RAW14A'));
if(api){
  const spoken=api.spokenPreview('Mira, Colty, el total es 1.924,99 €; otro son 80,99 euros y el saldo es -1,92 €.');
  test('la voz elimina céntimos sin redondear y conserva vocativo',spoken.includes('Mira, Colty')&&spoken.includes('mil novecientos veinticuatro euros')&&spoken.includes('ochenta euros')&&spoken.includes('menos un euro')&&!spoken.includes('99'));
}

if(!process.exitCode) console.log(`\nRAW14 · ${ok}/${ok} comprobaciones OK`);
