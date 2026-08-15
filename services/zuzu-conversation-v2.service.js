/* ControlEvent v1.0_exp · Zuzu Conversation V2
   Pure helpers only: planning contract, structured continuity and channel-aware presentation.
   No database access and no business data hard-coded here. */

function txt(v){ return v == null ? '' : String(v).trim(); }
function arr(v){ return Array.isArray(v) ? v : []; }
function num(v){ const n=Number(v); return Number.isFinite(n)?n:0; }
function norm(v){ const s=txt(v); return (s.normalize?s.normalize('NFD').replace(/[\u0300-\u036f]/g,''):s).toLowerCase().replace(/\s+/g,' ').trim(); }

export const ZUZU_V2_DOMAINS = Object.freeze([
  'conversation','event','purchases','donations','attendance','incomes','person','documents','management','bank','catalog','compare'
]);
export const ZUZU_V2_OPERATIONS = Object.freeze([
  'chat','summary','amount','count','list','detail','verify','compare','explain','chart'
]);

export function zuzuV2PlanSchema(){
  const step={
    type:'OBJECT',
    properties:{
      domain:{type:'STRING',enum:ZUZU_V2_DOMAINS},
      operation:{type:'STRING',enum:ZUZU_V2_OPERATIONS},
      event:{type:'STRING'},
      person:{type:'STRING'},
      entity:{type:'STRING'},
      filters:{type:'OBJECT',properties:{product:{type:'STRING'},segment:{type:'STRING'},destination:{type:'STRING'},store:{type:'STRING'},donor:{type:'STRING'},ticket:{type:'STRING'},status:{type:'STRING'}},required:[]},
      fields:{type:'ARRAY',items:{type:'STRING'}},
      detail:{type:'STRING',enum:['brief','standard','full']}
    },
    required:['domain','operation','event','person','entity','filters','fields','detail']
  };
  return {
    type:'OBJECT',
    properties:{
      mode:{type:'STRING',enum:['answer','clarify']},
      clarification:{type:'STRING'},
      intent:{type:'STRING'},
      confidence:{type:'NUMBER'},
      needs_synthesis:{type:'BOOLEAN'},
      steps:{type:'ARRAY',items:step}
    },
    required:['mode','clarification','intent','confidence','needs_synthesis','steps']
  };
}

export function zuzuV2PlannerSystem(){
  return [
    'Eres el PLANIFICADOR de voz de ControlEvent. No contestas al usuario: produces un plan JSON mínimo y exacto.',
    'El usuario conversa en español y puede usar elipsis: «¿y cuánto?», «¿cuáles?», «revísalo», «uno por uno». Usa LAST_CONTEXT para conservar SOLO el referente estructurado inmediato.',
    'Elige el mínimo número de pasos; normalmente 1. Máximo 3 solo si la pregunta exige cruzar fuentes.',
    'Dominios: event=resumen/KPI del evento; purchases=compras; donations=donaciones/donantes; attendance=asistencia; incomes=ingresos/personas; person=dossier de persona; documents=documentos; management=hitos/LG; bank=banco; catalog=catálogo; conversation=charla no factual.',
    'Para comparar, crea 2 o 3 pasos de los dominios reales que hay que consultar y marca needs_synthesis=true. NO uses un dominio abstracto compare si puedes expresar las fuentes reales.',
    'Operaciones: summary panorama, amount importe, count cantidad, list lista concreta, detail detalle, verify revisar fuente, compare comparar, explain explicar, chart gráfica, chat conversación.',
    'NO inventes nombres ni cifras. Mantén las palabras del usuario para filtros (p.ej. product="cerveza"); ControlEvent resolverá contra sus catálogos.',
    'Si el turno es continuación y no cambia de dominio, hereda event/person/filters de LAST_CONTEXT salvo que el usuario los sustituya explícitamente.',
    'Para voz pide detail=brief salvo que el usuario solicite uno por uno/lista/detalle/precio/unidades, en cuyo caso standard. full solo para líneas/tickets exactos o auditoría explícita.',
    'needs_synthesis=true solo si hay comparación, explicación causal/opinión, varias fuentes o razonamiento que no pueda verbalizarse directamente desde una única fuente.',
    'Si hay dos referentes realmente plausibles y no puedes decidir, mode=clarify y pregunta una sola cosa breve.'
  ].join('\n');
}

export function zuzuV2PlannerInput({prompt,lastContext,eventNames=[]}={}){
  const events=arr(eventNames).map(txt).filter(Boolean).slice(0,80);
  const ctx=(lastContext&&typeof lastContext==='object')?lastContext:{};
  return [
    `USER: ${txt(prompt)}`,
    `LAST_CONTEXT: ${JSON.stringify(ctx)}`,
    events.length?`EVENT_CATALOG: ${JSON.stringify(events)}`:'EVENT_CATALOG: []',
    'Devuelve solo el JSON del plan.'
  ].join('\n');
}

function cleanFilters(v){
  const f=(v&&typeof v==='object')?v:{};
  return {product:txt(f.product),segment:txt(f.segment),destination:txt(f.destination),store:txt(f.store),donor:txt(f.donor),ticket:txt(f.ticket),status:txt(f.status)};
}
function validDomain(v){ const x=txt(v); return ZUZU_V2_DOMAINS.includes(x)?x:'conversation'; }
function validOperation(v){ const x=txt(v); return ZUZU_V2_OPERATIONS.includes(x)?x:'chat'; }

export function normalizeZuzuV2Plan(raw,lastContext={}){
  const src=(raw&&typeof raw==='object')?raw:{};
  const ctx=(lastContext&&typeof lastContext==='object')?lastContext:{};
  const steps=arr(src.steps).slice(0,3).map(s=>({
    domain:validDomain(s?.domain),operation:validOperation(s?.operation),event:txt(s?.event),person:txt(s?.person),entity:txt(s?.entity),filters:cleanFilters(s?.filters),fields:arr(s?.fields).map(txt).filter(Boolean).slice(0,12),detail:['brief','standard','full'].includes(txt(s?.detail))?txt(s.detail):'brief'
  }));
  if(!steps.length)steps.push({domain:'conversation',operation:'chat',event:'',person:'',entity:'',filters:cleanFilters({}),fields:[],detail:'brief'});
  for(const step of steps){
    const sameDomain=txt(ctx.domain)&&norm(ctx.domain)===norm(step.domain);
    if(!step.event)step.event=txt(ctx.event);
    if(!step.person&&step.domain==='person')step.person=txt(ctx.subject||ctx.person);
    if(sameDomain&&ctx.filters&&typeof ctx.filters==='object'){
      const prior=cleanFilters(ctx.filters);
      Object.keys(step.filters).forEach(k=>{ if(!step.filters[k])step.filters[k]=prior[k]||''; });
    }
  }
  const mode=txt(src.mode)==='clarify'?'clarify':'answer';
  return {mode,clarification:txt(src.clarification),intent:txt(src.intent),confidence:Math.max(0,Math.min(1,num(src.confidence))),needsSynthesis:src.needs_synthesis===true,steps};
}

export function zuzuV2ResultContext(plan, evidence=[]){
  const step=arr(plan?.steps)[0]||{};
  const ev=arr(evidence)[0]||{};
  const facts=ev?.facts||{};
  const filters=cleanFilters(step.filters);
  const items=arr(ev?.items).map(x=>txt(x?.label||x?.Producto||x?.Donante||x?.Asistente||x?.name)).filter(Boolean).slice(0,20);
  return {
    domain:txt(step.domain),operation:txt(step.operation),event:txt(facts.event||step.event),subject:txt(facts.person||step.person),filters,
    fields:arr(step.fields).slice(0,12),resultCount:num(ev?.resultCount||facts.product_count||facts.purchase_line_count||facts.donation_record_count||facts.attendees_canonical),items
  };
}

function euro(v){
  return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(num(v));
}
function qty(v){
  const n=num(v); return Number.isInteger(n)?String(n):new Intl.NumberFormat('es-ES',{maximumFractionDigits:3}).format(n);
}

export function zuzuV2DirectVoiceAnswer(plan,evidence=[]){
  const step=arr(plan?.steps)[0]||{},ev=arr(evidence)[0];
  if(!ev||arr(plan?.steps).length!==1||plan?.needsSynthesis)return null;
  const f=ev.facts||{},event=txt(f.event||step.event||'el evento'),op=step.operation,domain=step.domain,items=arr(ev.items);
  if(domain==='event'){
    if(op==='summary'||op==='detail'||op==='verify'){
      return `${event}${txt(f.status)?` está ${txt(f.status)}`:''}. Ingresos ${euro(f.income_total)}, compras ${euro(f.purchases_realized)}, donaciones ${euro(f.donations_value)}, saldo operativo ${euro(f.operating_balance)} y valoración ${euro(f.event_valuation)}.${Number.isFinite(Number(f.attendees_canonical))?` Asistieron ${qty(f.attendees_canonical)} personas.`:''}`;
    }
  }
  if(domain==='purchases'){
    if(op==='amount')return `En ${event}, esas compras suman ${euro(f.total_amount)} en ${qty(f.purchase_line_count)} registros y ${qty(f.product_count)} productos.`;
    if(op==='count')return `En ${event}, son ${qty(f.purchase_line_count)} registros, ${qty(f.product_count)} productos distintos y ${qty(ev.totalUnits)} unidades en total.`;
    if(op==='summary')return `En ${event}, he encontrado ${qty(f.purchase_line_count)} registros de compra y ${qty(f.product_count)} productos, por ${euro(f.total_amount)}.`;
    if(['list','detail','verify'].includes(op)){
      if(!items.length)return `No encuentro compras que cumplan esos filtros en ${event}.`;
      const max=items.length>12?8:items.length;
      const body=items.slice(0,max).map((x,i)=>{
        const p=[`${i+1}. ${txt(x.label)}`];
        if(x.units!==undefined)p.push(`${qty(x.units)} uds`);
        if(txt(x.price))p.push(`precio ${txt(x.price)}`);
        if(x.amount!==undefined)p.push(`${euro(x.amount)}`);
        return p.join(', ');
      }).join('; ');
      const tail=items.length>max?` Hay ${items.length-max} más; te los sigo si quieres.`:` Total ${euro(f.total_amount)}.`;
      return `${body}.${tail}`;
    }
  }
  if(domain==='donations'){
    if(op==='amount'||op==='summary')return `En ${event} constan ${qty(f.donation_record_count)} registros de donación, ${qty(f.donor_count)} donantes y un valor total de ${euro(f.total_value)}.`;
    if(['list','detail','verify'].includes(op)&&items.length){
      const body=items.slice(0,10).map((x,i)=>`${i+1}. ${txt(x.label)}${x.amount!==undefined?`, ${euro(x.amount)}`:''}`).join('; ');
      return `${body}.${items.length>10?' Hay más registros.':''}`;
    }
  }
  if(domain==='attendance'){
    if(op==='count'||op==='summary')return `En ${event} asistieron ${qty(f.attendees_canonical)} personas: ${qty(f.members_attending)} socios y ${qty(f.nonmembers_attending)} no socios.`;
    if(['list','detail'].includes(op)&&items.length)return `Asistieron ${items.slice(0,16).map((x,i)=>`${i+1}. ${txt(x.label)}`).join('; ')}${items.length>16?'. Hay más nombres.':'.'}`;
  }
  if(domain==='management'&&(op==='summary'||op==='count'))return `En ${event} constan ${qty(f.hitos_count)} hitos y ${qty(f.lg_count)} tareas LG; ${qty(f.lg_completed)} completadas y ${qty(f.lg_pending)} pendientes.`;
  if(domain==='bank'&&(op==='summary'||op==='amount'||op==='count'))return `En ${event}, el impacto bancario es ${euro(f.bank_impact)} y el saldo de cierre calculado ${euro(f.closing_balance)}.`;
  return null;
}

export function zuzuV2SynthesisSystem(){
  return 'Eres el presentador oral de ControlEvent. Responde SOLO con la evidencia recibida. Español natural, directo, normalmente 1-3 frases y menos de 60 palabras. No recites unidades/envases/precios minuciosos salvo que el usuario lo pida. No prometas consultar después. No inventes. Si falta evidencia, dilo en una frase.';
}

export function zuzuV2SynthesisInput({prompt,plan,evidence}={}){
  return `PREGUNTA: ${txt(prompt)}\nPLAN: ${JSON.stringify(plan)}\nEVIDENCIA CANÓNICA: ${JSON.stringify(arr(evidence))}`;
}
