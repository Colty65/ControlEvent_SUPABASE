const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8'),pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
let ok=0,bad=0;const t=(n,c,d='')=>{if(c){ok++;console.log('OK ',n)}else{bad++;console.error('KO ',n,d)}};
const cut=(a,b)=>{const i=ai.indexOf(a),j=ai.indexOf(b,i+a.length);if(i<0||j<0)throw Error(`${a} -> ${b}`);return ai.slice(i,j)};

t('parser label se canoniza a label_field',ai.includes("if(key==='label'){out.label_field=value;continue;}"));
t('narrate del planner se conserva tras capability audit',ai.includes('const plannerNarrate=rawArgs.narrate===true')&&ai.includes('if(plannerNarrate)args.narrate=true'));
t('conversación actual conserva hasta 80 turnos',ai.includes('arr(currentHistory).slice(-80)')&&ai.includes('flatMap(t=>arr(t?.rows)).slice(-80)'));
t('workspace conserva estado de liquidación por operación',ai.includes('settlement_status:trim(rc.settlement_status)')&&ai.includes('detail:trim(rc.detail)'));
t('contexto conserva settlement_status/detail',ai.includes('settlement_status:trim(args?.settlement_status)||trim(f?.settlement_status)'));
t('identidad se limita a usuario autenticado',ai.includes('IDENTITY GROUNDING')&&ai.includes('Aquí te conozco como ${display}')&&ai.includes('no conviertas en hecho que sea tu creador'));
t('liquidaciones all con solo cerradas narra magnitudes cerradas',ai.includes('no hay liquidaciones abiertas y hay ${num(f.closed_settlement_count)} cerradas')&&ai.includes('DEBE ${fmt(f.closed_debe)}'));
t('derive redondea flotantes visibles',ai.includes('text(round(Number(v),2))'));
t('planner documenta fechas relativas de tiempo',ai.includes('Las fechas pedidas mandan sobre las fechas históricas del evento'));
t('planner documenta eso/aquello como referente inmediato',ai.includes('«eso», «aquello», «ponme eso otra vez»'));

try{
  const src=cut('function vnextP2RScalar','function vnextP2CatalogMentions');
  const ctx={trim:v=>v==null?'':String(v).trim(),arr:v=>Array.isArray(v)?v:[],num:v=>Number.isFinite(Number(v))?Number(v):0,vnextP17LooseNorm:v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim(),vnextP119LastStructuredFocus:()=>({type:'',entities:[]}),vnextP125ResolveWorkingSet:()=>null,vnextP1222LastWorkingSet:()=>null,vnextP122NormalizeMemoryCalls:x=>x,vnextP13UniqueCalls:x=>x,zuzuTracePush:()=>{},Date,Math,Set,JSON};
  vm.createContext(ctx);vm.runInContext(src+'\nthis.P=vnextP2RParseArgs;',ctx);
  const p=ctx.P('field=Compras realizadas; label=Evento');
  t('runtime parser label→label_field',p.field==='Compras realizadas'&&p.label_field==='Evento'&&!('label' in p),JSON.stringify(p));
}catch(e){t('runtime parser FIX10',false,e.stack||String(e));}

try{
  const src=cut('function vnextP2CatalogMentions','function vnextP2NormalizeCalls');
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const state={eventos:[{titulo:'Semana Santa 2026 (Resurrección)'},{titulo:'FUNCION 2025'},{titulo:'FUNCION 2026'}],personas:[{nombre:'Colty'},{nombre:'Cito'},{nombre:'Esther'}]};
  const hist=[
    {resultContext:{operation:'person_profile',person:'Colty',focus_type:'person',focus_entities:['Colty'],current_entities:['Colty']}},
    {resultContext:{operation:'person_profile',person:'Cito',focus_type:'person',focus_entities:['Cito'],current_entities:['Cito']}},
    {resultContext:{operation:'compare_events',events:['FUNCION 2025','Semana Santa 2026 (Resurrección)'],focus_type:'dataset',focus_entities:['FUNCION 2025','Semana Santa 2026 (Resurrección)']}},
    {resultContext:{operation:'event_bank',event:'Semana Santa 2026 (Resurrección)',focus_type:'event',focus_entities:['Semana Santa 2026 (Resurrección)']}},
    {resultContext:{operation:'event_liquidations',event:'FUNCION 2026',settlement_status:'all',focus_type:'event',focus_entities:['FUNCION 2026']}},
  ];
  const resolve=(st,v)=>{const q=norm(v),e=st.eventos.find(x=>norm(x.titulo)===q||norm(x.titulo.replace(/\s*\([^)]*\)\s*$/,''))===q);if(!e)throw Error('event');return e.titulo};
  const ctx={trim:v=>v==null?'':String(v).trim(),arr:v=>Array.isArray(v)?v:[],num:v=>Number.isFinite(Number(v))?Number(v):0,vnextNorm:norm,vnextP17LooseNorm:norm,vnextP1ResolveEventName:resolve,vnextPersonAliasRows:()=>[],vnextP119LastStructuredFocus:(h)=>{for(let i=h.length-1;i>=0;i--){const r=h[i].resultContext||{};if(r.focus_type&&r.focus_entities?.length)return{type:r.focus_type,entities:r.focus_entities};}return{type:'',entities:[]}},vnextP1223LastSelectedMemoryEpisode:()=>({conversation_id:'mem1',matched_turn_id:'t1',title:'Pocholo'}),vnextP13UniqueCalls:x=>x,zuzuTracePush:()=>{},Date,Math,Set,Map,JSON};
  vm.createContext(ctx);vm.runInContext(src+'\nthis.R=vnextP2RepairTranslatedCalls;this.D=vnextP2DateRangeFromPrompt;',ctx);
  const personCmp=ctx.R([{name:'query_ce',arguments:{operation:'person_profile',person:'Cito'}}],state,'Compárame un poco a los dos',null,hist,[],'2026-09-03T17:00:00+02:00');
  t('los dos expande perfiles recientes',personCmp.length===2&&personCmp.some(x=>x.arguments.person==='Colty')&&personCmp.some(x=>x.arguments.person==='Cito'),JSON.stringify(personCmp));
  const other=ctx.R([{name:'local_response',arguments:{response:'dato inventado'}}],state,'Y del otro qué sabes?',null,hist,[],'2026-09-03T17:00:00+02:00');
  t('otro evento no permite respuesta factual CHAT',other[0]?.name==='query_ce'&&other[0]?.arguments?.operation==='event_summary',JSON.stringify(other));
  const bank=ctx.R([{name:'query_ce',arguments:{operation:'event_bank',event:'FUNCION 2026'}}],state,'dime otra vez cómo quedó el banco',null,hist,[],'2026-09-03T17:00:00+02:00');
  t('otra vez banco recupera último banco por operación',bank[0]?.arguments?.event==='Semana Santa 2026 (Resurrección)',JSON.stringify(bank));
  const liq=ctx.R([{name:'query_ce',arguments:{operation:'event_liquidations',event:'FUNCION 2026'}}],state,'dime los tickets y productos de la liquidación de Cito',null,hist,[],'2026-09-03T17:00:00+02:00');
  t('liquidación persona + tickets fuerza person/detail full',liq[0]?.arguments?.person==='Cito'&&liq[0]?.arguments?.detail==='full',JSON.stringify(liq));
  const weather=ctx.R([{name:'query_ce',arguments:{operation:'event_weather',event:'FUNCION 2026'}}],state,'dime el tiempo desde hoy hasta el 7/9',null,hist,[],'2026-09-03T17:00:00+02:00');
  t('tiempo hoy→7/9 usa rango actual',weather[0]?.arguments?.start_date==='2026-09-03'&&weather[0]?.arguments?.end_date==='2026-09-07',JSON.stringify(weather));
  const comp=ctx.R([{name:'query_ce',arguments:{operation:'derive',derive_operation:'MAX'}}],state,'Compáralos.',null,hist,[],'2026-09-03T17:00:00+02:00');
  t('Compáralos sin field vuelve a comparación de eventos',comp[0]?.arguments?.operation==='compare_events'&&comp[0]?.arguments?.events?.length===2,JSON.stringify(comp));
  const mem=ctx.R([{name:'local_response',arguments:{response:'¿qué recuerdo?'}}],state,'¿Y qué sacas en claro de aquello?',null,hist,[],'2026-09-03T17:00:00+02:00');
  t('sacas en claro reabre resumen del recuerdo seleccionado',mem[0]?.name==='recall_memory'&&mem[0]?.arguments?.action==='summarize'&&mem[0]?.arguments?.conversation_id==='mem1',JSON.stringify(mem));
}catch(e){t('runtime repair FIX10',false,e.stack||String(e));}

t('package registra FIX10',pkg.scripts?.['test:fix10-dialogue']==='node scripts/v4-1-exp-fix10-grounded-continuity-regression.cjs');
console.log(`FIX10 GROUNDED CONTINUITY: ${ok} OK · ${bad} KO`);process.exitCode=bad?1:0;
