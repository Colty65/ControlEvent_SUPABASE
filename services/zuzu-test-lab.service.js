/* ControlEvent v1.0_exp · Laboratorio/ITV de Zuzu.
   SOLO LECTURA. Genera pruebas desde los datos REALES de ControlEvent.
   FAST no llama a Gemini. AI-SMOKE y FULL-CERT tienen presupuesto duro configurable. */
import { getState } from './state.service.js';
import { listUsers } from './auth.service.js';
import { analyzeEventPrompt, __zuzuStructuralTesting as Z } from './event-ai.service.js';

const arr = v => Array.isArray(v) ? v : [];
const text = v => v == null ? '' : String(v);
const trim = v => text(v).trim();
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const round = (v,d=2) => Number(num(v).toFixed(d));
const norm = v => trim(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const key = v => norm(v).replace(/\s+/g,'-').slice(0,48) || 'x';
const moneyEq = (a,b) => Math.abs(num(a)-num(b)) < 0.011;
const nowIso = () => new Date().toISOString();

// Semilla reproducible para que cada batería pueda variar sin perder trazabilidad.
// El navegador envía una semilla derivada de su reloj local; el servidor la reutiliza
// en preview, FAST, AI-SMOKE y FULL-CERT. Así una batería puede repetirse exactamente.
function normalizeSeed(raw){
  let n=Number(raw);
  if(!Number.isFinite(n)){const d=new Date();n=(d.getUTCSeconds()+1)*1000003+(d.getUTCMinutes()+1)*1009+(d.getUTCHours()+1)*97+d.getUTCDate();}
  n=Math.abs(Math.trunc(n))>>>0;
  return n||0x6d2b79f5;
}
function mixSeed(seed,salt=''){
  let h=normalizeSeed(seed)^0x811c9dc5;
  for(const ch of text(salt)){h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;}
  return h||0x9e3779b9;
}
function rngFor(seed,salt=''){
  let x=mixSeed(seed,salt);
  return ()=>{x=(x+0x6d2b79f5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
function shuffled(list,seed,salt=''){
  const out=arr(list).slice(),rnd=rngFor(seed,salt);
  for(let i=out.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
  return out;
}
function pick(list,seed,salt=''){const a=arr(list);if(!a.length)return null;return a[Math.floor(rngFor(seed,salt)()*a.length)];}
function pickIndex(length,seed,salt=''){return length>0?Math.floor(rngFor(seed,salt)()*length):0;}
function variant(templates,seed,salt,repl={}){
  const tpl=pick(templates,seed,salt)||'';
  return Object.entries(repl).reduce((v,[k,x])=>v.replaceAll(`{${k}}`,text(x)),tpl);
}

export async function assertGdActor(actor = {}) {
  const id = trim(actor.identificacion || actor.Identificacion);
  const level = trim(actor.nivel || actor.Nivel).toUpperCase();
  if (!id || level !== 'GD') { const e = new Error('Solo GD puede ejecutar PRUEBAS ZUZU.'); e.status = 403; throw e; }
  const users = await listUsers();
  const found = users.find(u => norm(u.identificacion || u.Identificacion) === norm(id));
  if (!found || trim(found.nivel || found.Nivel).toUpperCase() !== 'GD') { const e = new Error('El usuario no está autorizado como GD.'); e.status = 403; throw e; }
  return found;
}

function eventName(e){ return trim(e?.titulo || e?.nombre || e?.title); }
function personName(p){ return trim(p?.nombre || p?.Nombre || p?.identificacion); }
function eventIdOf(row){ return trim(row?.eventId || row?.event_id); }
function yearOf(name){ return (trim(name).match(/\b(?:19|20)\d{2}\b/)||[])[0] || ''; }
function familyStem(name){ return norm(name).replace(/\b(?:19|20)\d{2}\b/g,' ').replace(/\b(?:i|ii|iii|iv|v|vi|vii|viii|ix|x)\b/g,' ').replace(/\s+/g,' ').trim(); }
function significant(name){ return norm(name).split(' ').filter(w=>w.length>2 && !['del','las','los','con','para','por','and','the','ano'].includes(w)); }
function answerHasName(result,name){
  const h = norm(`${result?.title||''} ${result?.answer||''}`), toks=significant(name);
  const y=yearOf(name); if(y && !h.includes(y)) return false;
  if(!toks.length) return false;
  return toks.filter(t=>h.includes(t)).length >= Math.min(2,toks.length);
}
function resultContextEvents(result){
  const c=result?.meta?.resultContext||{};
  return arr(c.eventNames || c.events || c.event_names).concat(trim(c.event || c.eventName || c.event_name)?[trim(c.event || c.eventName || c.event_name)]:[]).filter(Boolean);
}
function resultHasEvent(result,name){ return resultContextEvents(result).some(x=>norm(x)===norm(name)) || answerHasName(result,name); }
function resultHasPerson(result,name){
  const c=result?.meta?.resultContext||{};
  const p=trim(c.person || c.subject || c.personName || c.person_name);
  return (p && norm(p)===norm(name)) || answerHasName(result,name);
}
function usageOf(result){
  const u=result?.meta?.geminiUsageEstimate||{};
  return {calls:num(u.calls),tokens:num(u.totalTokens||u.totalTokenCount),costEur:round(u.costEurApprox,6),costUsd:round(u.costUsdApprox,6)};
}
function findTable(result,keyName){ return arr(result?.tables).find(t=>trim(t?.key)===keyName) || null; }
function toolTable(tool,keyName){ return arr(tool?.tables).find(t=>trim(t?.key)===keyName) || null; }
function compactCase(c){ return {id:c.id,group:c.group,label:c.label,prompt:c.prompt||'',expected:c.expected||'',meta:c.meta||{}}; }

function publicBatteryCase(c,mode=''){
  const expected = trim(c?.expected) || (trim(c?.expectedEvent)?`Evento: ${trim(c.expectedEvent)}`:'') || (arr(c?.expectedEvents).length?`Eventos: ${arr(c.expectedEvents).join(' ↔ ')}`:'') || (trim(c?.expectedPerson)?`Persona: ${trim(c.expectedPerson)}`:'') || (trim(c?.event)?`Evento: ${trim(c.event)}`:'') || (arr(c?.events).length?`Eventos: ${arr(c.events).join(' ↔ ')}`:'') || (trim(c?.person)?`Persona: ${trim(c.person)}`:'') || 'Regla/invariante satisfecha';
  return {id:trim(c?.id),group:trim(c?.group)||'CONVERSACIÓN',label:trim(c?.label)||trim(c?.scenario)||trim(c?.prompt),prompt:trim(c?.prompt),expected,scenario:trim(c?.scenario),mode:trim(mode)};
}

function makeCase({id,group,label,prompt='',expected='',meta={},run}){ return {id,group,label,prompt,expected,meta,run}; }
function outcome(c,status,actual,extra={}){ return {id:c.id,group:c.group,label:c.label,prompt:c.prompt||'',expected:c.expected||'',actual:trim(actual),status,...extra}; }

// FIX2.10 · ORÁCULO FUERTE -----------------------------------------------------
// La ITV no debe aprobar una respuesta solo porque conserve la entidad correcta.
// Estos helpers calculan la verdad esperada desde las tablas reales de CE, sin IA,
// y validan CONTEXTO + CONTENIDO factual + calidad mínima de respuesta.
function firstNonEmpty(...values){ for(const v of values){const x=trim(v);if(x)return x;} return ''; }
function ticketTextLocal(row){ return firstNonEmpty(row?.ticketDonacion,row?.ticket_donacion,row?.ticket,row?.ticketOtrosGastos,row?.ticket_otros_gastos); }
function isDonationTicketLocal(v){ return /^DONADO\s+(TIENDA|SOCIO|OTROS)$/i.test(trim(v)); }
function isPendingTicketLocal(v){ const raw=trim(v); return !raw || /PTE\.?\s*COMPRA|PENDIENTE/i.test(raw); }
function lineAmountLocal(row){ return round(num(row?.unidades)*num(row?.precio),2); }
function mapById(rows=[]){ const m=new Map(); for(const r of arr(rows)){const id=trim(r?.id);if(id)m.set(id,r);} return m; }
function euro(v){ try{return Z.v26FormatEuro(num(v));}catch(_){return `${round(v,2).toFixed(2).replace('.',',')} €`;} }
function parseLocalizedDisplayNumber(raw=''){
  let s=trim(raw).replace(/\s/g,'').replace(/€/g,''); if(!s)return NaN;
  const comma=s.lastIndexOf(','),dot=s.lastIndexOf('.');
  if(comma>=0&&dot>=0){ if(comma>dot)s=s.replace(/\./g,'').replace(',','.'); else s=s.replace(/,/g,''); }
  else if(comma>=0)s=s.replace(/\./g,'').replace(',','.');
  else if((s.match(/\./g)||[]).length>1)s=s.replace(/\./g,'');
  const n=Number(s); return Number.isFinite(n)?n:NaN;
}
function euroValues(value=''){
  const out=[],re=/-?(?:\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,4})?|\d+(?:[.,]\d{1,4})?)\s*(?:€|euros?)/gi;let m;
  while((m=re.exec(text(value)))){const n=parseLocalizedDisplayNumber(m[0]);if(Number.isFinite(n))out.push(round(n,2));}
  return out;
}
function hasMoney(value,amount){ return euroValues(value).some(v=>moneyEq(v,amount)); }
function resultBlob(result){ return `${trim(result?.title)}\n${trim(result?.answer)}`.trim(); }
function resultCtx(result){ const c=result?.meta?.resultContext; return c&&typeof c==='object'?c:{}; }
function resultEvidence(result){ const e=resultCtx(result)?.evidence; return e&&typeof e==='object'?e:null; }
function resultDerived(result){ const d=resultCtx(result)?.derived; return d&&typeof d==='object'?d:null; }
function tableRowsByKeys(result,keys=[]){
  const wanted=new Set(arr(keys).map(trim)); let rows=[];
  for(const t of arr(result?.tables)){ if(wanted.has(trim(t?.key))) rows=rows.concat(arr(t?.rows)); }
  return rows;
}
function looksEmptyOrDeferred(result){
  const a=trim(result?.answer),b=norm(`${result?.title||''} ${a}`);
  if(!a)return true;
  return /control\s*event ha conservado los datos canonicos|se ha omitido una interpretacion|voy a (?:consultar|revisar|buscar)|necesito (?:revisar|consultar) los registros/.test(b);
}
function claimsNoProducts(result){ return /no\s+(?:se\s+)?(?:encontraron|hay|hubo|constan|aparecen)[^.]{0,90}(?:productos?|compras?)/i.test(resultBlob(result)); }
function hasNameInText(value,name){ const h=norm(value),toks=significant(name); if(yearOf(name)&&!h.includes(yearOf(name)))return false; return toks.length>0&&toks.filter(t=>h.includes(t)).length>=Math.min(2,toks.length); }

function purchaseOracle(state,event){
  const rr=Z.semanticResolveEntity(state,'event',event); if(!rr?.ok)return null;
  const products=mapById(state?.productos),groups=new Map(); let total=0,records=0,totalUnits=0;
  for(const row of arr(state?.compras)){
    if(eventIdOf(row)!==trim(rr.id))continue; const tt=ticketTextLocal(row);
    if(isDonationTicketLocal(tt)||isPendingTicketLocal(tt))continue;
    const pid=trim(row?.productoId||row?.producto_id),prod=products.get(pid)||{},label=trim(prod?.nombre)||pid||'Sin producto',amount=lineAmountLocal(row),units=round(row?.unidades,3);
    total+=amount; totalUnits+=units; records++;
    const k=norm(label),g=groups.get(k)||{label,amount:0,units:0,records:0};g.amount+=amount;g.units+=units;g.records++;groups.set(k,g);
  }
  const rows=[...groups.values()].map(x=>({...x,amount:round(x.amount,2),units:round(x.units,3)}));
  const byAmountDesc=rows.slice().sort((a,b)=>num(b.amount)-num(a.amount)||a.label.localeCompare(b.label,'es',{sensitivity:'base'}));
  const byAmountAsc=rows.slice().sort((a,b)=>num(a.amount)-num(b.amount)||a.label.localeCompare(b.label,'es',{sensitivity:'base'}));
  return{event:rr.nombre,eventId:rr.id,total:round(total,2),totalUnits:round(totalUnits,3),records,productCount:rows.length,rows,max:byAmountDesc[0]||null,min:byAmountAsc[0]||null};
}
async function eventOracle(state,event){
  try{const r=await Z.v26ExecuteTool({id:'itv_oracle_event',name:'event_dossier',event,scope:'named_event',detail:'brief'},state,'');return{event:trim(r?.facts?.event)||event,income:round(r?.facts?.income_total,2),purchases:round(r?.facts?.purchases_realized,2),pending:round(r?.facts?.purchases_pending,2),donations:round(r?.facts?.donations_value,2),balance:round(r?.facts?.operating_balance,2),valuation:round(r?.facts?.event_valuation,2),attendees:round(r?.facts?.attendees_canonical,3),status:trim(r?.facts?.status)};}catch(_){return null;}
}
async function comparisonOracle(state,events=[]){
  try{const r=await Z.v26ExecuteTool({id:'itv_oracle_compare',name:'compare_events',events:arr(events),detail:'standard'},state,'');const rows=arr(toolTable(r,'comparison')?.rows).map(x=>({event:trim(x?.Evento),income:round(x?.Ingresos,2),purchases:round(x?.['Compras realizadas'],2),pending:round(x?.['Compras pendientes'],2),donations:round(x?.['Donaciones valoradas'],2),balance:round(x?.['Saldo operativo'],2),valuation:round(x?.['Valoración del evento'],2),attendees:round(x?.['Asistentes canónicos'],3)}));return rows.length>=2?{events:rows.map(x=>x.event),rows}:null;}catch(_){return null;}
}
async function personOracle(state,person,event=''){
  try{const args={id:'itv_oracle_person',name:'person_dossier',person,scope:event?'named_event':'all_events',detail:'brief'};if(event)args.event=event;const r=await Z.v26ExecuteTool(args,state,'');const f=r?.facts||{};return{person:trim(f.person)||person,event:trim(f.scope_event),eventCount:num(f.event_count),income:round(f.income_linked_total,2),purchases:round(f.purchase_responsibility_total,2),donations:round(f.donations_value,2),purchaseRecords:num(f.purchase_responsibility_records),donationRecords:num(f.donation_records),summaryRows:arr(toolTable(r,'summary_by_event')?.rows),incomeRows:arr(toolTable(r,'income_by_event')?.rows)};}catch(_){return null;}
}
function metricWinner(compare,metric){
  const rows=arr(compare?.rows); if(rows.length<2)return null; const sorted=rows.slice().sort((a,b)=>num(b?.[metric])-num(a?.[metric])||trim(a.event).localeCompare(trim(b.event),'es'));const winner=sorted[0],runner=sorted[1];return{winner,runner,diff:round(num(winner?.[metric])-num(runner?.[metric]),metric==='attendees'?3:2)};
}
function expectedOracleText(oracle){
  if(!oracle)return'';
  if(oracle.kind==='purchase-set')return `${oracle.event}: ${oracle.productCount} productos · ${euro(oracle.total)}`;
  if(oracle.kind==='purchase-max'||oracle.kind==='purchase-min')return `${oracle.row?.label||'—'} · ${euro(oracle.row?.amount||0)}`;
  if(oracle.kind==='purchase-sum')return `${oracle.event}: ${euro(oracle.total)}`;
  if(oracle.kind==='compare-metric'){const w=metricWinner(oracle.compare,oracle.metric);return w?`${w.winner.event} · ${euro(w.winner[oracle.metric])} · diferencia ${euro(w.diff)}`:'';}
  if(oracle.kind==='person-income'&&oracle.known!==false)return `${oracle.person}: ${euro(oracle.total)}`;
  if(oracle.kind==='person-relation'&&oracle.known!==false)return `${oracle.person} ${oracle.related?'SÍ':'NO'} tiene relación con ${oracle.event}`;
  if(oracle.kind==='event-economy')return `${oracle.event}: ingresos ${euro(oracle.data?.income)} · compras ${euro(oracle.data?.purchases)} · saldo ${euro(oracle.data?.balance)}`;
  return'';
}
function oracleFail(reasons=[]){return{ok:false,reasons:arr(reasons).filter(Boolean)};}
function oraclePass(){return{ok:true,reasons:[]};}
function validateOracle(caseDef,result){
  const reasons=[],oracle=caseDef?.oracle||null,blob=resultBlob(result),ctx=resultCtx(result),ev=resultEvidence(result),derived=resultDerived(result);
  if(!result?.ok)reasons.push('result.ok=false');
  if(caseDef?.requireAnswer!==false&&looksEmptyOrDeferred(result))reasons.push(!trim(result?.answer)?'respuesta vacía':'respuesta aplazada/genérica sin resolver el dato');
  if(caseDef?.event&&!resultHasEvent(result,caseDef.event))reasons.push(`foco de evento distinto de ${caseDef.event}`);
  if(arr(caseDef?.events).length&&!arr(caseDef.events).every(n=>resultHasEvent(result,n)))reasons.push('la comparación no conserva todos los eventos');
  if(caseDef?.person&&!resultHasPerson(result,caseDef.person))reasons.push(`sujeto distinto de ${caseDef.person}`);
  if(!oracle)return reasons.length?oracleFail(reasons):oraclePass();

  if(oracle.kind==='purchase-set'){
    if(oracle.productCount>0&&claimsNoProducts(result))reasons.push(`afirma que no hay productos, pero CE tiene ${oracle.productCount}`);
    if(ev?.kind==='product_set'){
      if(trim(ev.filterProduct))reasons.push(`aplicó un filtro de producto no pedido: ${ev.filterProduct}`);
      if(num(ev.productCount||ev.distinctCount)!==num(oracle.productCount))reasons.push(`conteo de productos ${num(ev.productCount||ev.distinctCount)} != ${oracle.productCount}`);
      if(!moneyEq(ev.totalAmount,oracle.total))reasons.push(`total del result-set ${euro(ev.totalAmount)} != ${euro(oracle.total)}`);
    }else{
      const rows=arr(result?.tables).flatMap(t=>arr(t?.rows)).filter(r=>trim(r?.Producto||r?.label));
      const labels=new Set(rows.map(r=>norm(r?.Producto||r?.label)).filter(Boolean));
      if(oracle.productCount>0&&labels.size===0)reasons.push('no entrega un result-set de productos verificable');
    }
  }else if(oracle.kind==='purchase-max'||oracle.kind==='purchase-min'){
    const op=oracle.kind==='purchase-max'?'max':'min',row=oracle.row;
    if(!row)reasons.push('el oráculo no tiene producto esperado');
    else if(derived?.operation===op){if(norm(derived.label)!==norm(row.label))reasons.push(`${op} producto ${derived.label||'—'} != ${row.label}`);if(!moneyEq(derived.value,row.amount))reasons.push(`${op} importe ${euro(derived.value)} != ${euro(row.amount)}`);}
    else{if(!hasNameInText(blob,row.label))reasons.push(`no identifica el producto esperado: ${row.label}`);if(!hasMoney(blob,row.amount))reasons.push(`no devuelve el importe esperado: ${euro(row.amount)}`);}
  }else if(oracle.kind==='purchase-sum'){
    if(derived?.operation==='sum'){if(!moneyEq(derived.value,oracle.total))reasons.push(`suma ${euro(derived.value)} != ${euro(oracle.total)}`);}
    else if(!hasMoney(blob,oracle.total))reasons.push(`no devuelve la suma canónica ${euro(oracle.total)}`);
  }else if(oracle.kind==='comparison'){
    if(!oracle.compare?.rows?.length)reasons.push('sin comparación canónica de referencia');
    const ce=ev?.kind==='event_comparison'?arr(ev.rows):[];
    if(ce.length>=2){for(const expected of oracle.compare.rows){const got=ce.find(r=>norm(r.event)===norm(expected.event));if(!got){reasons.push(`falta ${expected.event} en evidencia comparativa`);continue;}for(const k of ['income','purchases','donations','balance'])if(!moneyEq(got[k],expected[k]))reasons.push(`${expected.event} ${k} no coincide`);}}
  }else if(oracle.kind==='compare-metric'){
    const w=metricWinner(oracle.compare,oracle.metric);if(!w)reasons.push('sin ganador canónico');else if(derived?.operation==='comparison_max'){
      if(norm(derived.winner)!==norm(w.winner.event))reasons.push(`ganador ${derived.winner||'—'} != ${w.winner.event}`);
      if(!moneyEq(derived.difference,w.diff))reasons.push(`diferencia ${euro(derived.difference)} != ${euro(w.diff)}`);
    }else{if(!hasNameInText(blob,w.winner.event))reasons.push(`no identifica ganador ${w.winner.event}`);if(!hasMoney(blob,w.winner[oracle.metric]))reasons.push(`no contiene valor ganador ${euro(w.winner[oracle.metric])}`);}
  }else if(oracle.kind==='event-economy'){
    const d=oracle.data;if(d){const values=[d.balance,d.income,d.purchases].filter(v=>Number.isFinite(Number(v)));if(values.length&&!values.some(v=>hasMoney(blob,v)))reasons.push('no contiene ninguna magnitud económica canónica esperada');}
  }else if(oracle.kind==='person-summary'){
    if(!trim(result?.answer))reasons.push('resumen personal vacío');
    if(oracle.data&&oracle.data.eventCount>0&&!hasNameInText(blob,oracle.person)&&!resultHasPerson(result,oracle.person))reasons.push('no mantiene la identidad personal');
  }else if(oracle.kind==='person-events'){
    const names=arr(oracle.data?.summaryRows).map(r=>trim(r?.Evento)).filter(Boolean);if(names.length&&!names.some(n=>hasNameInText(blob,n))&&arr(result?.tables).length===0)reasons.push('no muestra ningún evento real de la persona');
  }else if(oracle.kind==='person-income'){
    if(oracle.known!==false&&!hasMoney(blob,oracle.total))reasons.push(`ingreso vinculado no coincide con ${euro(oracle.total)}`);
  }else if(oracle.kind==='person-relation'){
    if(oracle.known!==false){const neg=/\bno\s+(?:figura|aparece|tiene|consta|se\s+encuentra)|ninguna\s+relaci[oó]n|no\s+se\s+encontr/i.test(blob),pos=/\bsi\b|\bsí\b|figura|aparece|tiene\s+relaci[oó]n|vinculad/i.test(blob);
    if(oracle.related&&neg&&!pos)reasons.push('niega una relación que sí existe');
    if(!oracle.related&&!neg)reasons.push('no niega una relación que CE no registra');}
  }
  return reasons.length?oracleFail(reasons):oraclePass();
}
function validatePaidCase(caseDef,result){
  const base=caseDef?.validate?!!caseDef.validate(result):true,oracle=validateOracle(caseDef,result);
  return{ok:base&&oracle.ok,reasons:[...(base?[]:['invariante de selección/contexto no satisfecha']),...oracle.reasons]};
}

async function buildRealFastCases(state,seed){
  const events=arr(state?.eventos).filter(e=>trim(e?.id)&&eventName(e));
  const people=arr(state?.personas).filter(p=>trim(p?.id)&&personName(p) && !/^z[_ -]?dev/i.test(personName(p)));
  const purchasesByEvent=new Map();
  for(const r of arr(state?.compras)){ const eid=eventIdOf(r); if(eid) purchasesByEvent.set(eid,(purchasesByEvent.get(eid)||0)+1); }
  const cases=[];

  for(const ev of events){
    const title=eventName(ev), eid=trim(ev.id);
    cases.push(makeCase({id:`event-resolve-${key(eid)}`,group:'EVENTOS',label:`Resolver evento exacto · ${title}`,expected:title,run:async function(){
      const r=Z.semanticResolveEntity(state,'event',title); return outcome(this,r?.ok&&trim(r.id)===eid?'OK':'KO',r?.ok?`${r.nombre} [${r.id}]`:r?.error||'No resuelto');
    }}));
    cases.push(makeCase({id:`event-dossier-${key(eid)}`,group:'EVENTOS',label:`Dossier canónico · ${title}`,expected:`event=${title}`,run:async function(){
      const r=await Z.v26ExecuteTool({id:'fast_d',name:'event_dossier',event:title,scope:'named_event',detail:'brief'},state,eid);
      const ok=r?.ok!==false && norm(r?.facts?.event)===norm(title);
      return outcome(this,ok?'OK':'KO',`${r?.facts?.event||'sin evento'} · ingresos=${r?.facts?.income_total??'—'} · compras=${r?.facts?.purchases_realized??'—'}`);
    }}));
    cases.push(makeCase({id:`event-people-${key(eid)}`,group:'PERSONAS',label:`Asistencia/dossier coherentes · ${title}`,expected:'Mismo evento y asistencia no negativa',run:async function(){
      const [d,p]=await Promise.all([
        Z.v26ExecuteTool({id:'fast_d',name:'event_dossier',event:title,scope:'named_event',detail:'brief'},state,eid),
        Z.v26ExecuteTool({id:'fast_p',name:'event_people',event:title,scope:'named_event',detail:'brief'},state,eid)
      ]);
      const same=norm(d?.facts?.event)===norm(p?.facts?.event), dv=num(d?.facts?.attendees_canonical), pv=num(p?.facts?.attendees_canonical);
      return outcome(this,same&&dv>=0&&pv>=0&&Math.abs(dv-pv)<0.001?'OK':'KO',`dossier=${dv}; people=${pv}; evento=${p?.facts?.event||'—'}`);
    }}));
    if(purchasesByEvent.get(eid)) cases.push(makeCase({id:`event-purchases-${key(eid)}`,group:'COMPRAS',label:`Compras coherentes · ${title}`,expected:'Dossier = desglose; MAX/MIN/SUM consistentes',run:async function(){
      const [d,b]=await Promise.all([
        Z.v26ExecuteTool({id:'fast_d',name:'event_dossier',event:title,scope:'named_event',detail:'brief'},state,eid),
        Z.v26ExecuteTool({id:'fast_b',name:'event_breakdowns',event:title,scope:'named_event',detail:'full'},state,eid)
      ]);
      const rows=arr(toolTable(b,'products_cost')?.rows), sum=round(rows.reduce((a,r)=>a+num(r.Importe),0),2), max=rows.slice().sort((a,b)=>num(b.Importe)-num(a.Importe))[0], min=rows.filter(r=>Number.isFinite(Number(r.Importe))).slice().sort((a,b)=>num(a.Importe)-num(b.Importe))[0];
      const base=round(d?.facts?.purchases_realized,2), breakdown=round(b?.facts?.purchases_realized,2);
      const sumCheck=rows.length<20 ? moneyEq(sum,breakdown) : sum<=breakdown+0.011; // tabla puede estar limitada a top20
      const ok=moneyEq(base,breakdown)&&sumCheck&&(!max||num(max.Importe)>=num(min?.Importe));
      return outcome(this,ok?'OK':'KO',`dossier=${base}; desglose=${breakdown}; productos=${rows.length}; suma_tabla=${sum}; max=${max?.Producto||'—'} ${max?.Importe??'—'}; min=${min?.Producto||'—'} ${min?.Importe??'—'}`);
    }}));
  }

  // Familias reales con año distinto: prueba la pareja completa y que nunca colapse A/B.
  const families=new Map();
  for(const e of events){ const stem=familyStem(eventName(e)), y=yearOf(eventName(e)); if(!stem||!y) continue; if(!families.has(stem))families.set(stem,[]); families.get(stem).push(e); }
  let pairNo=0;
  for(const list of families.values()){
    const sorted=list.slice().sort((a,b)=>yearOf(eventName(a)).localeCompare(yearOf(eventName(b))));
    for(let i=1;i<sorted.length;i++){
      const a=sorted[i-1], b=sorted[i], an=eventName(a), bn=eventName(b); pairNo++;
      cases.push(makeCase({id:`compare-family-${pairNo}-${key(a.id)}-${key(b.id)}`,group:'COMPARACIONES',label:`Comparación misma familia · ${an} / ${bn}`,expected:'Dos eventos distintos conservados',run:async function(){
        const r=await Z.v26ExecuteTool({id:'fast_cmp',name:'compare_events',events:[an,bn],scope:'named_event'},state,'');
        const names=arr(r?.facts?.event_names), ok=names.length===2 && new Set(names.map(norm)).size===2 && names.some(x=>norm(x)===norm(an)) && names.some(x=>norm(x)===norm(bn));
        return outcome(this,ok?'OK':'KO',names.join(' ↔ ')||'sin comparación');
      }}));
    }
  }

  // Pares heterogéneos reales. La semilla cambia qué filas del catálogo se cruzan en cada batería,
  // pero la misma semilla reproduce exactamente la selección.
  const mixedEvents=shuffled(events,seed,'fast-mixed-events');
  const pairLimit=Math.min(36,Math.max(0,mixedEvents.length*2));
  for(let i=0;i<pairLimit && mixedEvents.length>1;i++){
    const a=mixedEvents[i%mixedEvents.length], b=mixedEvents[(i*7+3+pickIndex(mixedEvents.length,seed,`fast-pair-${i}`))%mixedEvents.length]; if(a.id===b.id) continue;
    const an=eventName(a),bn=eventName(b);
    cases.push(makeCase({id:`compare-mixed-${i}-${key(a.id)}-${key(b.id)}`,group:'COMPARACIONES',label:`Comparación cruzada · ${an} / ${bn}`,expected:'A y B distintos',run:async function(){
      const r=await Z.v26ExecuteTool({id:'fast_cmp',name:'compare_events',events:[an,bn],scope:'named_event'},state,'');
      const names=arr(r?.facts?.event_names); const ok=names.length===2&&new Set(names.map(norm)).size===2;
      return outcome(this,ok?'OK':'KO',names.join(' ↔ ')||'sin comparación');
    }}));
  }

  for(const p of people){
    const name=personName(p),pid=trim(p.id);
    cases.push(makeCase({id:`person-resolve-${key(pid)}`,group:'PERSONAS',label:`Resolver persona · ${name}`,expected:name,run:async function(){
      const r=Z.semanticResolveEntity(state,'person',name); const ok=r?.ok && (trim(r.id)===pid || norm(r.nombre)===norm(name));
      return outcome(this,ok?'OK':'KO',r?.ok?`${r.nombre} [${r.id}]`:r?.error||'No resuelta');
    }}));
    cases.push(makeCase({id:`person-dossier-${key(pid)}`,group:'PERSONAS',label:`Dossier global · ${name}`,expected:'Totales coherentes y no negativos',run:async function(){
      const r=await Z.v26ExecuteTool({id:'fast_pd',name:'person_dossier',person:name,scope:'all_events',status:'all',detail:'brief'},state,'');
      const f=r?.facts||{}; const ok=r?.ok!==false && num(f.event_count)>=0 && num(f.purchase_responsibility_total)>=0 && num(f.donations_value)>=0;
      return outcome(this,ok?'OK':'KO',`persona=${f.person||'—'}; eventos=${f.event_count??'—'}; compras=${f.purchase_responsibility_total??'—'}; donaciones=${f.donations_value??'—'}`);
    }}));
  }

  cases.push(makeCase({id:'event-nonexistent-real-catalog',group:'SEGURIDAD',label:'Evento inexistente no se inventa',expected:'No resuelto',run:async function(){
    const fake=`Evento ${variant(['Lunar','Boreal','Imposible','Fantasma','Orbital'],seed,'fast-fake-word')} Inexistente ${2090+(normalizeSeed(seed)%9)} ${String(normalizeSeed(seed)%997).padStart(3,'0')}`;
    const r=Z.semanticResolveEntity(state,'event',fake); return outcome(this,!r?.ok?'OK':'KO',r?.ok?`Resuelto indebidamente a ${r.nombre}`:'No resuelto');
  }}));
  return cases;
}

function chooseEvents(state,seed){
  const events=arr(state?.eventos).filter(e=>trim(e?.id)&&eventName(e));
  const purchaseCounts=new Map(); for(const r of arr(state?.compras)){const id=eventIdOf(r);if(id)purchaseCounts.set(id,(purchaseCounts.get(id)||0)+1);}
  const withPurchases=events.filter(e=>purchaseCounts.get(trim(e.id))>0);
  const families=new Map(); for(const e of events){const stem=familyStem(eventName(e)),y=yearOf(eventName(e));if(stem&&y){if(!families.has(stem))families.set(stem,[]);families.get(stem).push(e);}}
  const familyLists=[...families.values()].filter(v=>v.length>=2);
  let sibling=[];
  if(familyLists.length){
    const list=pick(familyLists,seed,'family-choice')||familyLists[0];
    const sorted=list.slice().sort((a,b)=>yearOf(eventName(a)).localeCompare(yearOf(eventName(b))));
    const pos=Math.min(sorted.length-2,pickIndex(Math.max(1,sorted.length-1),seed,'family-pair'));
    sibling=sorted.slice(pos,pos+2);
  }
  return {events:shuffled(events,seed,'events'),withPurchases:shuffled(withPurchases,seed,'purchases-events'),sibling};
}
function choosePeople(state,seed){
  const people=arr(state?.personas).filter(p=>trim(p?.id)&&personName(p)&&!/^z[_ -]?dev/i.test(personName(p)));
  return {people:shuffled(people,seed,'people'),sample:shuffled(people,seed,'people-sample').slice(0,Math.min(10,people.length))};
}

const TPL={
  event:[
    'Háblame de {event}.','Cuéntame lo esencial de {event}.','¿Qué me puedes decir de {event}?','Repásame {event}.',
    'Quiero una radiografía rápida de {event}.','Ponte con {event}: dime lo más importante.','Dame los datos clave de {event}.',
    'Vamos con {event}; ¿cómo quedó?','Sitúame en {event}.','Hazme un resumen útil de {event}.'
  ],
  purchases:[
    '¿Qué compras hubo en {event}?','¿Qué se compró para {event}?','Sácame las compras de {event}.','¿En qué se gastó el dinero en {event}?',
    'Quiero ver los gastos de compra de {event}.','¿Qué compramos en {event}?','Repasa las compras de {event}.','Dime en qué se fue el dinero de compras en {event}.',
    'Solo compras de {event}, ¿qué hubo?','¿Qué material o productos se compraron en {event}?'
  ],
  compare:[
    'Compara {a} con {b}.','Pon frente a frente {a} y {b}.','Quiero comparar {a} frente a {b}.','¿Qué diferencias ves entre {a} y {b}?',
    'Hazme una comparativa de {a} y {b}.','Entre {a} y {b}, ¿cómo quedaron?','Contrasta {a} con {b}.','Mírame {a} y {b} uno al lado del otro.'
  ],
  person:[
    'Háblame de {person}.','¿Qué sabes de {person} en ControlEvent?','Hazme un resumen de {person}.','Repasa la actividad de {person}.',
    'Quiero ver qué ha hecho {person}.','Dime la actividad registrada de {person}.','Ponte con {person}.','¿Qué relación tiene {person} con nuestros eventos?'
  ],
  consumption:[
    '¿Quién consumió más comida en {event}?','¿Quién fue el que más comió en {event}?','¿Quién bebió más en {event}?','Dime quién consumió más producto en {event}.',
    '¿Quién se tomó más bebida en {event}?','¿Quién gastó más producto personalmente en {event}?'
  ],
  nonexistent:[
    'Háblame del evento {fake}.','Dime qué pasó en {fake}.','Quiero información de {fake}.','¿Cómo quedó el evento {fake}?','Repásame {fake}.'
  ],
  economyFollow:['¿Cómo quedó económicamente?','¿Qué tal salió de números?','¿Cómo terminó en lo económico?','¿Qué balance dejó?','¿Cómo quedaron las cuentas?'],
  highlightFollow:['¿Qué datos importantes destacarías?','¿Qué te parece lo más relevante?','Dime solo lo que más destaca.','¿Con qué me debería quedar?'],
  switchEvent:['Ahora cambia a {event}.','Deja ese y vete a {event}.','Vale, ahora {event}.','Cambiemos de asunto: {event}.','Vuelve la vista a {event}.'],
  listProducts:['¿Qué productos se compraron en {event}?','Sácame los productos comprados en {event}.','¿Qué cosas se compraron para {event}?','Dame el detalle de productos de {event}.'],
  maxFollow:['¿Cuál fue el más caro?','¿Qué producto tuvo el mayor importe?','¿Cuál se llevó más dinero?','Dime el de mayor coste.'],
  minFollow:['¿Y el de menor importe?','¿Cuál fue el más barato?','¿Qué producto costó menos?','Ahora dime el de menor coste.'],
  sumFollow:['¿Cuánto suman todos?','¿Y todo eso cuánto fue?','Dame el total de esos productos.','¿Cuánto sale la suma completa?'],
  eventsPersonFollow:['¿En qué eventos aparece?','¿Dónde aparece registrado?','¿En qué eventos tiene actividad?','¿Por qué eventos se mueve?'],
  incomePersonFollow:['¿Qué ingresos tiene vinculados?','¿Y de ingresos qué tiene?','Dime sus ingresos asociados.','¿Cuánto ingreso tiene vinculado?'],
  switchPerson:['Ahora háblame de {person}.','Cambia a {person}.','Vale, ahora {person}.','Deja al anterior y mira a {person}.'],
  compareIncomeFollow:['¿Cuál tuvo más ingresos?','Entre los dos, ¿quién ingresó más?','¿Y de ingresos cuál quedó por encima?'],
  comparePurchasesFollow:['¿Y cuál tuvo más compras?','¿Cuál gastó más en compras?','Entre esos dos, ¿dónde hubo más compras?'],
  relationFollow:['¿Tuvo alguna relación con ese evento?','¿Aparece relacionado con ese evento?','¿Tuvo algo que ver con ese evento?','¿Figura en ese evento de alguna manera?'],
  relativeNext:['¿Y el del año siguiente?','Ahora el del año posterior.','¿Qué pasa con el del siguiente año?','Vete al de {year}.']
};

function buildAiSmokeCases(state,max=40,seed=1){
  const {events,withPurchases,sibling}=chooseEvents(state,seed),{sample:people}=choosePeople(state,seed),cases=[];
  const add=c=>{if(!trim(c?.expected))c.expected=trim(c?.expectedEvent)?`Evento: ${trim(c.expectedEvent)}`:arr(c?.expectedEvents).length?`Eventos: ${arr(c.expectedEvents).join(' ↔ ')}`:trim(c?.expectedPerson)?`Persona: ${trim(c.expectedPerson)}`:'Regla/invariante satisfecha';if(cases.length<max)cases.push(c);};
  const eventSample=events.slice(0,Math.min(6,events.length));
  eventSample.forEach((e,i)=>{const name=eventName(e),prompt=variant(TPL.event,seed,`smoke-event-${i}`,{event:name});add({id:`ai-event-${i}-${key(e.id)}`,group:'EVENTOS',label:`IA identifica evento · ${name}`,prompt,expectedEvent:name,validate:r=>resultHasEvent(r,name)});});
  withPurchases.slice(0,Math.min(5,withPurchases.length)).forEach((e,i)=>{const name=eventName(e),prompt=variant(TPL.purchases,seed,`smoke-purchase-${i}`,{event:name});add({id:`ai-purchases-${i}-${key(e.id)}`,group:'COMPRAS',label:`IA selecciona compras · ${name}`,prompt,expectedEvent:name,validate:r=>resultHasEvent(r,name) && arr(r?.meta?.tools).some(t=>/event_(?:breakdowns|purchase_lines|dossier)/.test(t))});});
  if(sibling.length>=2){const a=sibling[0],b=sibling[1],an=eventName(a),bn=eventName(b);add({id:`ai-compare-${key(a.id)}-${key(b.id)}`,group:'COMPARACIONES',label:'IA conserva dos eventos parecidos',prompt:variant(TPL.compare,seed,'smoke-compare-family',{a:an,b:bn}),expectedEvents:[an,bn],validate:r=>[an,bn].every(n=>resultHasEvent(r,n)) || /compare_events/.test(arr(r?.meta?.tools).join(' '))});}
  if(events.length>=2){const a=events[0],b=events.find(x=>trim(x.id)!==trim(a.id));if(b){const an=eventName(a),bn=eventName(b);add({id:`ai-compare-mixed-${key(a.id)}-${key(b.id)}`,group:'COMPARACIONES',label:'IA compara dos eventos distintos',prompt:variant(TPL.compare,seed,'smoke-compare-mixed',{a:an,b:bn}),expectedEvents:[an,bn],validate:r=>[an,bn].every(n=>resultHasEvent(r,n)) || /compare_events/.test(arr(r?.meta?.tools).join(' '))});}}
  people.slice(0,Math.min(6,people.length)).forEach((p,i)=>{const name=personName(p),prompt=variant(TPL.person,seed,`smoke-person-${i}`,{person:name});add({id:`ai-person-${i}-${key(p.id)}`,group:'PERSONAS',label:`IA identifica persona · ${name}`,prompt,expectedPerson:name,validate:r=>resultHasPerson(r,name)});});
  if(events[0]){const name=eventName(events[0]);add({id:'ai-nondeducible-consumption',group:'SEGURIDAD',label:'IA no inventa consumo individual',prompt:variant(TPL.consumption,seed,'smoke-consumption',{event:name}),validate:r=>/no (?:registra|puede|se puede)|no.*deduc|no.*acredit|no.*saber|no.*determinar/i.test(text(r?.answer)) || /Dato no deducible/i.test(text(r?.title))});}
  const fakeWord=variant(['Lunar','Boreal','Marciano','Orbital','Fantasma','Imposible'],seed,'smoke-fake-word'),fake=`Autotest ${fakeWord} Inexistente ${2090+(normalizeSeed(seed)%10)} ${String((normalizeSeed(seed)*17)%997).padStart(3,'0')}`;
  add({id:'ai-nonexistent-event',group:'SEGURIDAD',label:'IA no inventa evento inexistente',prompt:variant(TPL.nonexistent,seed,'smoke-fake-prompt',{fake}),expected:'Debe negar que exista sin fijarlo como evento real',validate:r=>{
    const answer=text(r?.answer),denied=/(?:no\s+(?:lo\s+)?(?:encuentro|existe|figura|consta)|no\s+se\s+(?:encuentra|localiza)|no\s+est[aá]\s+registrad[oa]|no\s+tengo[^.]{0,100}(?:registro|constancia)|ning[uú]n\s+evento[^.]{0,100}(?:coincid|parec|registr))/i.test(answer);
    // Puede existir un evento ambiental en resultContext; eso no convierte la negación correcta en KO.
    // Solo sería inválido si el propio contexto fijase exactamente el evento ficticio como canónico.
    const fakeWasCanonical=resultContextEvents(r).some(x=>norm(x)===norm(fake));
    return denied && !fakeWasCanonical;
  }});
  return cases.slice(0,max);
}

async function buildFullCertScenarios(state,maxTurns=24,seed=1){
  const {events,withPurchases,sibling}=chooseEvents(state,seed),{sample:people}=choosePeople(state,seed); const sc=[];
  if(events.length>=2){const a=events[0],b=events.find(x=>trim(x.id)!==trim(a.id));if(b){const an=eventName(a),bn=eventName(b),ao=await eventOracle(state,an),bo=await eventOracle(state,bn);sc.push({name:'Cambio de evento',turns:[
    {prompt:variant(TPL.event,seed,'full-event-a',{event:an}),event:an,oracle:{kind:'event-summary',event:an,data:ao}},
    {prompt:variant(TPL.economyFollow,seed,'full-economy-a'),event:an,oracle:{kind:'event-economy',event:an,data:ao}},
    {prompt:variant(TPL.switchEvent,seed,'full-switch-b',{event:bn}),event:bn,oracle:{kind:'event-summary',event:bn,data:bo}},
    {prompt:variant(TPL.highlightFollow,seed,'full-highlight-b'),event:bn,oracle:{kind:'event-summary',event:bn,data:bo}}
  ]});}}
  if(sibling.length>=2){const a=sibling[0],b=sibling[1],an=eventName(a),bn=eventName(b),cmp=await comparisonOracle(state,[an,bn]);sc.push({name:'Comparación persistente',turns:[
    {prompt:variant(TPL.compare,seed,'full-compare',{a:an,b:bn}),events:[an,bn],oracle:{kind:'comparison',compare:cmp}},
    {prompt:variant(TPL.compareIncomeFollow,seed,'full-compare-income'),events:[an,bn],oracle:{kind:'compare-metric',compare:cmp,metric:'income'}},
    {prompt:variant(TPL.comparePurchasesFollow,seed,'full-compare-purchases'),events:[an,bn],oracle:{kind:'compare-metric',compare:cmp,metric:'purchases'}}
  ]});
  const byYear=[a,b].slice().sort((x,y)=>Number(yearOf(eventName(x)))-Number(yearOf(eventName(y))));const first=byYear[0],second=byYear[1],y=yearOf(eventName(second));sc.push({name:'Referencia temporal relativa',turns:[
    {prompt:variant(TPL.event,seed,'full-relative-start',{event:eventName(first)}),event:eventName(first),oracle:{kind:'event-summary',event:eventName(first),data:await eventOracle(state,eventName(first))}},
    {prompt:variant(TPL.relativeNext,seed,'full-relative-next',{year:y}),event:eventName(second),oracle:{kind:'event-summary',event:eventName(second),data:await eventOracle(state,eventName(second))}}
  ]});}
  if(withPurchases[0]){const e=withPurchases[0],en=eventName(e),po=purchaseOracle(state,en);sc.push({name:'Result-set de compras',turns:[
    {prompt:variant(TPL.listProducts,seed,'full-products',{event:en}),event:en,oracle:{kind:'purchase-set',...(po||{event:en,total:0,productCount:0})}},
    {prompt:variant(TPL.maxFollow,seed,'full-max'),event:en,oracle:{kind:'purchase-max',event:en,row:po?.max||null}},
    {prompt:variant(TPL.minFollow,seed,'full-min'),event:en,oracle:{kind:'purchase-min',event:en,row:po?.min||null}},
    {prompt:variant(TPL.sumFollow,seed,'full-sum'),event:en,oracle:{kind:'purchase-sum',event:en,total:po?.total||0}}
  ]});}
  if(people.length>=2){const p1=people[0],p2=people[1],n1=personName(p1),n2=personName(p2),p1o=await personOracle(state,n1),p2o=await personOracle(state,n2);sc.push({name:'Cambio de persona',turns:[
    {prompt:variant(TPL.person,seed,'full-person-1',{person:n1}),person:n1,oracle:{kind:'person-summary',person:n1,data:p1o}},
    {prompt:variant(TPL.eventsPersonFollow,seed,'full-person-events'),person:n1,oracle:{kind:'person-events',person:n1,data:p1o}},
    {prompt:variant(TPL.switchPerson,seed,'full-person-switch',{person:n2}),person:n2,oracle:{kind:'person-summary',person:n2,data:p2o}},
    {prompt:variant(TPL.incomePersonFollow,seed,'full-person-income'),person:n2,oracle:{kind:'person-income',person:n2,total:p2o?.income||0,known:!!p2o}}
  ]});
  if(events[0]){const en=eventName(events[0]),rel=await personOracle(state,n1,en),related=!!(rel&&(rel.eventCount>0||Math.abs(rel.income)>0||Math.abs(rel.purchases)>0||Math.abs(rel.donations)>0));sc.push({name:'Cruce persona y evento',turns:[
    {prompt:variant(TPL.event,seed,'full-cross-event',{event:en}),event:en,oracle:{kind:'event-summary',event:en,data:await eventOracle(state,en)}},
    {prompt:variant(TPL.person,seed,'full-cross-person',{person:n1}),person:n1,oracle:{kind:'person-summary',person:n1,data:p1o}},
    {prompt:variant(TPL.relationFollow,seed,'full-cross-relation'),event:en,person:n1,oracle:{kind:'person-relation',event:en,person:n1,related,known:!!rel,data:rel}}
  ]});}}
  const out=[]; for(const s of sc){for(const t of s.turns){if(out.length>=maxTurns)break;const expected=expectedOracleText(t.oracle)||(t.event?`Evento: ${t.event}`:arr(t.events).length?`Eventos: ${t.events.join(' ↔ ')}`:t.person?`Persona: ${t.person}`:'Regla/invariante satisfecha');out.push({...t,expected,scenario:s.name,id:`full-${out.length+1}-${key(s.name)}-${normalizeSeed(seed).toString(36).slice(-4)}`});} if(out.length>=maxTurns)break;}
  return out;
}

async function batteryBlueprint(state,rawSeed){
  const seed=normalizeSeed(rawSeed);
  const fast=await buildRealFastCases(state,seed); const smoke=buildAiSmokeCases(state,40,seed); const full=await buildFullCertScenarios(state,30,seed);
  const counts={events:arr(state?.eventos).length,people:arr(state?.personas).length,products:arr(state?.productos).length,stores:arr(state?.tiendas).length,purchases:arr(state?.compras).length,incomes:arr(state?.colaboradores).length,bankMovements:arr(state?.bankMovements||state?.movimientosBanco||state?.movimientos_banco).length};
  return {seed,counts,fast,smoke,full};
}

export async function previewZuzuBattery({seed}={}){
  const state=await getState(); const b=await batteryBlueprint(state,seed);
  return {ok:true,generatedAt:nowIso(),seed:b.seed,source:'ControlEvent · tablas reales · solo lectura',dataCounts:b.counts,tests:{FAST:b.fast.length,'AI-SMOKE':b.smoke.length,'FULL-CERT':b.full.length},cases:{'AI-SMOKE':b.smoke.map(c=>publicBatteryCase(c,'AI-SMOKE')),'FULL-CERT':b.full.map(c=>publicBatteryCase(c,'FULL-CERT'))},estimated:{'AI-SMOKE':{cases:Math.min(24,b.smoke.length),costEurRange:'0,05–0,25 €',hardCapSuggested:0.25},'FULL-CERT':{turns:Math.min(18,b.full.length),costEurRange:'0,10–0,50 €',hardCapSuggested:0.50}},notes:[`Semilla reproducible de batería: ${b.seed}.`,'FAST usa datos reales y 0 llamadas IA.','AI-SMOKE se ejecuta caso a caso para no agotar la duración máxima de una función serverless.','FULL-CERT puede ejecutarse turno a turno conservando el contexto de conversación en el cliente.','FIX2.10 ORÁCULO FUERTE: FULL-CERT verifica contexto y también verdad canónica (totales, máximos, mínimos, comparaciones, persona/evento y respuestas no vacías).','Ningún modo modifica datos de producción.']};
}

function streamWrite(send,type,payload={}){ send({type,at:nowIso(),...payload}); }
function filterCases(cases,ids){ if(!arr(ids).length)return cases; const s=new Set(arr(ids).map(String)); return cases.filter(c=>s.has(String(c.id))); }

function timedCaseController(parentSignal, timeoutMs){
  const controller=new AbortController(); let timedOut=false;
  const abortFromParent=()=>controller.abort();
  if(parentSignal?.aborted)controller.abort(); else parentSignal?.addEventListener?.('abort',abortFromParent,{once:true});
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},Math.max(5000,Number(timeoutMs)||60000));
  return{signal:controller.signal,timedOut:()=>timedOut,cleanup(){clearTimeout(timer);parentSignal?.removeEventListener?.('abort',abortFromParent);}};
}
async function runTimedAiCase({caseDef,send,parentSignal,index,total,timeoutMs,task}){
  const guard=timedCaseController(parentSignal,timeoutMs),started=Date.now();
  streamWrite(send,'case_start',{case:{id:caseDef.id,group:caseDef.group,label:caseDef.label,prompt:caseDef.prompt||''},index,total,timeoutMs});
  const heartbeat=setInterval(()=>streamWrite(send,'heartbeat',{caseId:caseDef.id,index,total,elapsedMs:Date.now()-started,timeoutMs}),2500);
  let hardTimer=null;
  const taskPromise=Promise.resolve().then(()=>task(guard.signal)).then(value=>({kind:'value',value}),error=>({kind:'error',error}));
  const hardTimeout=new Promise(resolve=>{hardTimer=setTimeout(()=>resolve({kind:'timeout'}),Math.max(5100,Number(timeoutMs)||60000)+150);});
  try{
    const winner=await Promise.race([taskPromise,hardTimeout]);
    if(winner?.kind==='timeout') return {error:new Error(`Tiempo máximo de ${Math.round((Number(timeoutMs)||60000)/1000)} s superado.`),timedOut:true};
    if(winner?.kind==='error') return {error:winner.error,timedOut:guard.timedOut()};
    return {value:winner?.value,timedOut:false};
  } finally { if(hardTimer)clearTimeout(hardTimer);clearInterval(heartbeat);guard.cleanup(); }
}

async function runFast({state,cases,send,signal}){
  const total=cases.length; let ok=0,warn=0,ko=0,done=0; const failures=[];
  for(const c of cases){
    if(signal?.aborted)break; const t0=Date.now(); let r;
    try{ r=await c.run.call(c); }catch(e){r=outcome(c,'KO',e?.message||String(e));}
    r.durationMs=Date.now()-t0; done++; if(r.status==='OK')ok++; else if(r.status==='WARN')warn++; else{ko++;failures.push(r);} streamWrite(send,'case',{case:r,progress:{done,total,ok,warn,ko,percent:total?Math.round(done*100/total):100}});
  }
  return {done,total,ok,warn,ko,failures,costEur:0,calls:0,tokens:0,aborted:!!signal?.aborted};
}

async function runSmoke({state,cases,send,signal,maxCostEur=0.25,maxCases=24}){
  const selected=cases.slice(0,Math.max(1,Math.min(80,Number(maxCases)||24))), total=selected.length; let ok=0,warn=0,ko=0,done=0,costEur=0,calls=0,tokens=0; const failures=[];
  const timeoutMs=Math.max(30000,Math.min(120000,Number(process.env.CONTROLEVENT_ZUZU_TEST_SMOKE_TIMEOUT_MS)||38000));
  for(let i=0;i<selected.length;i++){
    const c=selected[i]; if(signal?.aborted)break;
    const reserve=0.012; if(costEur>0 && costEur+reserve>maxCostEur){streamWrite(send,'budget',{message:`Presupuesto protegido: no se inicia otra prueba porque quedan menos de ${reserve.toFixed(3)} € de margen.`,costEur});break;}
    const t0=Date.now(); let r;
    const timed=await runTimedAiCase({caseDef:c,send,parentSignal:signal,index:i+1,total,timeoutMs,task:async externalSignal=>{
      const result=await analyzeEventPrompt({prompt:c.prompt,stateOverride:state,conversationHistory:[],conversationTurnNumber:1,externalSignal});
      return result;
    }});
    if(signal?.aborted)break;
    if(timed.timedOut){
      costEur=round(costEur+reserve,6);calls+=1;
      r=outcome(c,'WARN',`TIEMPO MÁXIMO: la prueba superó ${Math.round(timeoutMs/1000)} s. Se abortó solo este caso y la batería continúa. El coste mostrado reserva ${reserve.toFixed(3)} € de forma conservadora.`,{timeout:true,usage:{calls:1,tokens:0,costEur:reserve}});
    }else if(timed.error){
      r=outcome(c,'KO',timed.error?.message||String(timed.error));
    }else{
      const result=timed.value,u=usageOf(result);costEur=round(costEur+u.costEur,6);calls+=u.calls;tokens+=u.tokens;const verdict=validatePaidCase(c,result);
      r=outcome(c,verdict.ok?'OK':'KO',`${result?.title||''} · ${trim(result?.answer).slice(0,260)}${verdict.reasons.length?`\nORÁCULO: ${verdict.reasons.join(' | ')}`:''}`,{usage:u,tools:arr(result?.meta?.tools),oracleReasons:verdict.reasons});
    }
    r.durationMs=Date.now()-t0;done++;if(r.status==='OK')ok++;else if(r.status==='WARN')warn++;else{ko++;failures.push(r);}streamWrite(send,'case',{case:r,progress:{done,total,ok,warn,ko,percent:total?Math.round(done*100/total):100,costEur,calls,tokens}});
    if(costEur>=maxCostEur){streamWrite(send,'budget',{message:'Se ha alcanzado el presupuesto máximo configurado.',costEur});break;}
  }
  return {done,total,ok,warn,ko,failures,costEur,calls,tokens,aborted:!!signal?.aborted,caseTimeoutMs:timeoutMs};
}

async function runFull({state,turns,send,signal,maxCostEur=0.50,maxCases=18}){
  const selected=turns.slice(0,Math.max(1,Math.min(40,Number(maxCases)||18))),total=selected.length;let ok=0,warn=0,ko=0,done=0,costEur=0,calls=0,tokens=0;const failures=[];
  const timeoutMs=Math.max(45000,Math.min(150000,Number(process.env.CONTROLEVENT_ZUZU_TEST_FULL_TIMEOUT_MS)||42000));
  let previousInteractionId='',history=[],activeScenario='';
  for(let i=0;i<selected.length;i++){
    const c=selected[i]; if(signal?.aborted)break;
    if(activeScenario && trim(c.scenario)!==activeScenario){ previousInteractionId=''; history=[]; }
    activeScenario=trim(c.scenario);
    const reserve=0.015;if(costEur>0&&costEur+reserve>maxCostEur){streamWrite(send,'budget',{message:`Presupuesto protegido: no se inicia otro turno porque quedan menos de ${reserve.toFixed(3)} € de margen.`,costEur});break;}
    const t0=Date.now();let r;
    const timed=await runTimedAiCase({caseDef:c,send,parentSignal:signal,index:i+1,total,timeoutMs,task:async externalSignal=>analyzeEventPrompt({prompt:c.prompt,stateOverride:state,previousInteractionId,conversationHistory:history.slice(-8),conversationTurnNumber:history.length+1,externalSignal})});
    if(signal?.aborted)break;
    if(timed.timedOut){
      costEur=round(costEur+reserve,6);calls+=1;previousInteractionId='';
      r=outcome(c,'WARN',`TIEMPO MÁXIMO: este turno superó ${Math.round(timeoutMs/1000)} s. Se abortó el turno, se reinicia la cadena del escenario y la ITV continúa.`,{scenario:c.scenario,timeout:true,usage:{calls:1,tokens:0,costEur:reserve}});
    }else if(timed.error){r=outcome(c,'KO',timed.error?.message||String(timed.error),{scenario:c.scenario});previousInteractionId='';}
    else{
      const result=timed.value,u=usageOf(result);costEur=round(costEur+u.costEur,6);calls+=u.calls;tokens+=u.tokens;
      const verdict=validatePaidCase(c,result);
      r=outcome(c,verdict.ok?'OK':'KO',`${result?.title||''} · ${trim(result?.answer).slice(0,300)}${verdict.reasons.length?`\nORÁCULO: ${verdict.reasons.join(' | ')}`:''}`,{usage:u,tools:arr(result?.meta?.tools),scenario:c.scenario,oracleReasons:verdict.reasons});
      previousInteractionId=trim(result?.interactionId||result?.meta?.interactionId||'');
      history.push({user:c.prompt,assistant:trim(result?.answer).slice(0,1200),assistantTail:trim(result?.answer).slice(-900),title:trim(result?.title),provider:trim(result?.provider),selectedEventId:'',pendingAction:result?.meta?.pendingAction||null,resultContext:result?.meta?.resultContext||null});
    }
    r.durationMs=Date.now()-t0;done++;if(r.status==='OK')ok++;else if(r.status==='WARN')warn++;else{ko++;failures.push(r);}streamWrite(send,'case',{case:r,progress:{done,total,ok,warn,ko,percent:total?Math.round(done*100/total):100,costEur,calls,tokens}});
    if(costEur>=maxCostEur){streamWrite(send,'budget',{message:'Se ha alcanzado el presupuesto máximo configurado.',costEur});break;}
  }
  return {done,total,ok,warn,ko,failures,costEur,calls,tokens,aborted:!!signal?.aborted,caseTimeoutMs:timeoutMs};
}


function safeConversationState(raw={}){
  return {previousInteractionId:trim(raw?.previousInteractionId).slice(0,500),scenario:trim(raw?.scenario).slice(0,160),history:arr(raw?.history).slice(-8).map(h=>({user:trim(h?.user).slice(0,1600),assistant:trim(h?.assistant).slice(0,1200),assistantTail:trim(h?.assistantTail).slice(0,900),title:trim(h?.title).slice(0,240),provider:trim(h?.provider).slice(0,80),selectedEventId:trim(h?.selectedEventId).slice(0,160),pendingAction:h?.pendingAction||null,resultContext:h?.resultContext||null}))};
}

export async function runZuzuTestCase({mode='AI-SMOKE',caseId='',conversationState={},seed,signal}={}){
  const m=trim(mode).toUpperCase();
  if(!['AI-SMOKE','FULL-CERT'].includes(m)){const e=new Error('run-case solo admite AI-SMOKE o FULL-CERT.');e.status=400;throw e;}
  const state=await getState(),b=await batteryBlueprint(state,seed),all=m==='AI-SMOKE'?b.smoke:b.full,c=all.find(x=>trim(x.id)===trim(caseId));
  if(!c){const e=new Error('Caso de ITV no encontrado en la batería actual. Actualiza datos y batería.');e.status=404;throw e;}
  if(signal?.aborted){const e=new Error('Prueba cancelada.');e.name='AbortError';e.status=499;throw e;}
  const started=Date.now(),reserve=m==='AI-SMOKE'?0.012:0.015,timeoutMs=m==='AI-SMOKE'?Math.max(20000,Math.min(45000,Number(process.env.CONTROLEVENT_ZUZU_TEST_SMOKE_TIMEOUT_MS)||38000)):Math.max(25000,Math.min(48000,Number(process.env.CONTROLEVENT_ZUZU_TEST_FULL_TIMEOUT_MS)||42000));
  let r,nextConversationState=null;
  if(m==='AI-SMOKE'){
    const timed=await runTimedAiCase({caseDef:c,send:()=>{},parentSignal:signal,index:1,total:1,timeoutMs,task:externalSignal=>analyzeEventPrompt({prompt:c.prompt,stateOverride:state,conversationHistory:[],conversationTurnNumber:1,externalSignal})});
    if(signal?.aborted){const e=new Error('Prueba cancelada.');e.name='AbortError';e.status=499;throw e;}
    if(timed.timedOut) r=outcome(c,'WARN',`TIEMPO MÁXIMO: el caso superó ${Math.round(timeoutMs/1000)} s. Se cancela este caso y el cliente puede continuar con el siguiente.`,{timeout:true,usage:{calls:1,tokens:0,costEur:reserve}});
    else if(timed.error) r=outcome(c,'KO',timed.error?.message||String(timed.error),{usage:{calls:1,tokens:0,costEur:reserve}});
    else {const result=timed.value,u=usageOf(result),verdict=validatePaidCase(c,result);r=outcome(c,verdict.ok?'OK':'KO',`${result?.title||''} · ${trim(result?.answer).slice(0,320)}${verdict.reasons.length?`\nORÁCULO: ${verdict.reasons.join(' | ')}`:''}`,{usage:u,tools:arr(result?.meta?.tools),oracleReasons:verdict.reasons});}
  } else {
    let cs=safeConversationState(conversationState);
    if(cs.scenario!==trim(c.scenario)) cs={previousInteractionId:'',history:[],scenario:trim(c.scenario)};
    const timed=await runTimedAiCase({caseDef:c,send:()=>{},parentSignal:signal,index:1,total:1,timeoutMs,task:externalSignal=>analyzeEventPrompt({prompt:c.prompt,stateOverride:state,previousInteractionId:cs.previousInteractionId,conversationHistory:cs.history,conversationTurnNumber:cs.history.length+1,externalSignal})});
    if(signal?.aborted){const e=new Error('Prueba cancelada.');e.name='AbortError';e.status=499;throw e;}
    if(timed.timedOut){r=outcome(c,'WARN',`TIEMPO MÁXIMO: este turno superó ${Math.round(timeoutMs/1000)} s. El siguiente turno reiniciará la cadena del escenario.`,{scenario:c.scenario,timeout:true,usage:{calls:1,tokens:0,costEur:reserve}});nextConversationState={previousInteractionId:'',history:[],scenario:trim(c.scenario)};}
    else if(timed.error){r=outcome(c,'KO',timed.error?.message||String(timed.error),{scenario:c.scenario,usage:{calls:1,tokens:0,costEur:reserve}});nextConversationState={previousInteractionId:'',history:[],scenario:trim(c.scenario)};}
    else {
      const result=timed.value,u=usageOf(result),verdict=validatePaidCase(c,result);
      r=outcome(c,verdict.ok?'OK':'KO',`${result?.title||''} · ${trim(result?.answer).slice(0,360)}${verdict.reasons.length?`\nORÁCULO: ${verdict.reasons.join(' | ')}`:''}`,{usage:u,tools:arr(result?.meta?.tools),scenario:c.scenario,oracleReasons:verdict.reasons});
      const hist=cs.history.slice(-7);hist.push({user:c.prompt,assistant:trim(result?.answer).slice(0,1200),assistantTail:trim(result?.answer).slice(-900),title:trim(result?.title),provider:trim(result?.provider),selectedEventId:'',pendingAction:result?.meta?.pendingAction||null,resultContext:result?.meta?.resultContext||null});
      nextConversationState={previousInteractionId:trim(result?.interactionId||result?.meta?.interactionId||'').slice(0,500),history:hist,scenario:trim(c.scenario)};
    }
  }
  r.durationMs=Date.now()-started;
  return {ok:true,mode:m,case:r,conversationState:nextConversationState,timeoutMs};
}

export async function runZuzuTestStream({mode='FAST',maxCostEur=0.25,maxCases,caseIds,seed,send,signal}){
  const state=await getState(); const b=await batteryBlueprint(state,seed); const m=trim(mode).toUpperCase();
  const all=m==='AI-SMOKE'?b.smoke:m==='FULL-CERT'?b.full:b.fast; const selected=filterCases(all,caseIds);
  streamWrite(send,'start',{mode:m,seed:b.seed,dataCounts:b.counts,total:selected.length,source:'tablas reales de ControlEvent',maxCostEur:m==='FAST'?0:round(maxCostEur,2)});
  const result=m==='AI-SMOKE'?await runSmoke({state,cases:selected,send,signal,maxCostEur:Math.max(0.02,num(maxCostEur)||0.25),maxCases:maxCases||24}):m==='FULL-CERT'?await runFull({state,turns:selected,send,signal,maxCostEur:Math.max(0.02,num(maxCostEur)||0.50),maxCases:maxCases||18}):await runFast({state,cases:selected,send,signal});
  streamWrite(send,'summary',{mode:m,...result,finishedAt:nowIso(),certified:result.ko===0&&!result.aborted&&result.done===selected.length&&result.done>0});
  return result;
}
