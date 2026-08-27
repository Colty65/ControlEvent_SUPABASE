/* ControlEvent v4_0_exp · banco automático del Router Zuzu en SOMBRA.
   Por defecto hace 100 clasificaciones Gemini sin tocar datos de ControlEvent.
   --dry-run valida únicamente el banco local y NO llama a Gemini.
   --cascade hace que cada turno conversacional herede la decisión REAL del turno anterior;
             sin --cascade hereda la decisión ESPERADA para aislar mejor cada caso. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyZuzuShadow } from '../services/zuzu-router-shadow.service.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const bankPath=path.join(here,'..','tests','zuzu-router-shadow.cases.json');
const bank=JSON.parse(fs.readFileSync(bankPath,'utf8'));
const cases=Array.isArray(bank.cases)?bank.cases:[];
const dry=process.argv.includes('--dry-run');
const cascade=process.argv.includes('--cascade');

function norm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
function get(obj,pathStr){return pathStr.split('.').reduce((a,k)=>a==null?undefined:a[k],obj);}
function expectedPaths(expected,prefix=''){
  const out=[];
  for(const [k,v] of Object.entries(expected||{})){
    const p=prefix?`${prefix}.${k}`:k;
    if(v && typeof v==='object' && !Array.isArray(v)) out.push(...expectedPaths(v,p)); else out.push([p,v]);
  }
  return out;
}
function compare(decision,expected){
  const errors=[];
  for(const [p,want] of expectedPaths(expected)){
    const got=get(decision,p);
    if(typeof want==='string'){
      if(norm(got)!==norm(want)) errors.push(`${p}: esperado=${JSON.stringify(want)} obtenido=${JSON.stringify(got)}`);
    }else if(got!==want) errors.push(`${p}: esperado=${JSON.stringify(want)} obtenido=${JSON.stringify(got)}`);
  }
  return errors;
}
function fakeTurn(test,decision){
  return {user:test.prompt,title:'Prueba Router',assistantTail:'Respuesta simulada de Zuzu para conservar el hilo.',routerShadow:{decision}};
}
function validateBank(){
  const errors=[];
  if(cases.length!==100) errors.push(`El banco debe contener 100 casos y contiene ${cases.length}.`);
  const ids=new Set();
  for(const c of cases){
    if(!c.id||ids.has(c.id)) errors.push(`ID ausente o duplicado: ${c.id}`); ids.add(c.id);
    if(!String(c.prompt||'').trim()) errors.push(`${c.id}: prompt vacío.`);
    if(!c.expected?.route) errors.push(`${c.id}: falta ruta esperada.`);
    if(c.kind==='standalone' && c.expected?.mode!=='TRANSACTIONAL') errors.push(`${c.id}: standalone debe ser TRANSACTIONAL.`);
    if(c.kind==='conversation'){
      const expectedMode=Number(c.turn)===1?'TRANSACTIONAL':'CONVERSATION';
      if(c.expected?.mode!==expectedMode) errors.push(`${c.id}: mode esperado incoherente con turno.`);
    }
  }
  const groups=new Map();
  for(const c of cases.filter(x=>x.kind==='conversation')){
    const a=groups.get(c.conversation)||[]; a.push(c); groups.set(c.conversation,a);
  }
  if(groups.size!==15) errors.push(`Debe haber 15 conversaciones y hay ${groups.size}.`);
  for(const [id,a] of groups){
    const turns=a.map(x=>Number(x.turn)).sort((x,y)=>x-y).join(',');
    if(turns!=='1,2,3') errors.push(`${id}: turnos=${turns}, deben ser 1,2,3.`);
  }
  return errors;
}

const bankErrors=validateBank();
if(bankErrors.length){ console.error('BANCO INVÁLIDO'); bankErrors.forEach(x=>console.error(' - '+x)); process.exit(2); }
console.log(`Banco OK: ${cases.length} mensajes = 55 transaccionales independientes + 15 conversaciones × 3 turnos.`);
if(dry){ console.log('DRY-RUN OK: no se ha llamado a Gemini ni a ControlEvent.'); process.exit(0); }

const histories=new Map();
let ok=0,ko=0,totalTokens=0,totalCostEur=0;
const failures=[];
for(let i=0;i<cases.length;i++){
  const c=cases[i];
  let history=[];
  if(c.kind==='conversation') history=histories.get(c.conversation)||[];
  const result=await classifyZuzuShadow({
    prompt:c.prompt,
    selectedEventTitle:c.screenEventTitle||'SySA 2026',
    selectedEventId:'router-suite-event',
    conversationHistory:history,
    conversationContext:null,
    usuarioLogado:{identificacion:'TEST_ROUTER',nombre:'Pruebas Router',nivel:'GD'}
  });
  totalTokens+=Number(result?.usage?.totalTokens||0);
  totalCostEur+=Number(result?.usage?.costEurApprox||0);
  const errors=result?.ok?compare(result.decision,c.expected):[`Router no disponible: ${result?.error||'sin detalle'}`];
  if(errors.length){
    ko++; failures.push({id:c.id,prompt:c.prompt,errors,decision:result?.decision||null});
    console.log(`KO ${String(i+1).padStart(3,'0')}/100 ${c.id} · ${errors[0]}`);
  }else{ ok++; console.log(`OK ${String(i+1).padStart(3,'0')}/100 ${c.id} · ${result.decision.route}`); }
  if(c.kind==='conversation'){
    const decisionForHistory=(cascade && result?.decision)?result.decision:c.expected;
    history=[...history,fakeTurn(c,decisionForHistory)].slice(-8);
    histories.set(c.conversation,history);
  }
}
console.log('\n=== RESULTADO ROUTER SOMBRA ===');
console.log(`OK ${ok} / KO ${ko} / TOTAL ${cases.length}`);
console.log(`Tokens aprox.: ${totalTokens} · Coste router aprox.: ${totalCostEur.toFixed(6)} €`);
if(failures.length){
  console.log('\nFallos:');
  for(const f of failures){console.log(`\n${f.id} · ${f.prompt}`); f.errors.forEach(e=>console.log(' - '+e)); if(f.decision) console.log('   decisión:',JSON.stringify(f.decision));}
  process.exitCode=1;
}
