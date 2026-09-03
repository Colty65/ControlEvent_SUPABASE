const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const lab=fs.readFileSync(path.join(root,'services/zuzu-test-lab.service.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'public/app/features/zuzu-test-console-gd.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
let ok=0,bad=0;const t=(n,c,d='')=>{if(c){ok++;console.log('OK ',n)}else{bad++;console.error('KO ',n,d)}};
function slice(src,a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);if(i<0||j<0)throw Error(`slice ${a} -> ${b}`);return src.slice(i,j)}
const p2r=slice(ai,'function vnextP2Tools()','function vnextP2NeedsNarration');
const run=slice(ai,'async function runZuzuVNextP2Agent','async function runZuzuVNextP13Agent');

// Schema: una sola tool plana, sin branching.
t('una sola tool plan_turn',/return \[\{type:'function',name:'plan_turn'/.test(p2r));
t('seis intenciones',/enum:\['DATA','VIEW','CALCULATE','MEMORY','PERSON','CHAT'\]/.test(p2r));
t('schema sin anyOf',!p2r.includes('anyOf'));
t('schema no expone contratos query_ce',!p2r.includes('parameters:queryCeCompactToolParameters'));
t('plan_turn requerido',/stage:'VNEXT P2-R · planificador mínimo',toolChoice:'required'/.test(run));
t('una decisión normal',/stage:'VNEXT P2-R · planificador mínimo'[\s\S]{0,180}maxCalls:1/.test(run));
t('provider P2-R',run.includes("provider:'zuzu-vnext-p2r-minimal-planner'"));
t('sin retries semánticos',!run.includes('DIALOGUE_STATE_AUTHORITY_RETRY')&&!run.includes('PENDING_INTENT_RETRY')&&!run.includes('FUNCTION CALL RETRY'));

// El traductor cubre las seis intenciones.
for(const intent of ['CHAT','MEMORY','PERSON','VIEW','CALCULATE','DATA'])t(`traductor ${intent}`,p2r.includes(`intent==='${intent}'`));
t('args no JSON: key=value',p2r.includes('cadena opcional key=value separada por ;'));
t('OR del mismo campo',p2r.includes("value.slice(colon+1).split('|')"));
t('show recupera columnas',p2r.includes("['show','visible','visible_columns'].includes(key)"));
t('sort plano',p2r.includes("if(key==='sort')"));
t('personas múltiples',p2r.includes('for(const person of people.slice(0,8))'));
t('dataset por título visible',p2r.includes('vnextP125ResolveWorkingSet(history'));
t('ledger sesión',p2r.includes('compact.session_ledger=topics.slice(-16)'));
t('referentes actuales',ai.includes('out.current_entities=people'));

// Evalúa realmente el parser de args y el traductor 6x20 con stubs deterministas.
try{
  const parserCode=slice(ai,'function vnextP2RScalar','function vnextP2NormalizeCalls');
  const ctx={console,Date,Math,JSON,Set,Map,
    trim:v=>v==null?'':String(v).trim(),arr:v=>Array.isArray(v)?v:[],num:v=>Number.isFinite(Number(v))?Number(v):0,
    vnextP17LooseNorm:v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim(),
    vnextNorm:v=>String(v??'').toLowerCase(),
    vnextP119LastStructuredFocus:()=>({type:'multi_person',entities:['Colty','Esther']}),
    vnextP125ResolveWorkingSet:()=>({dataset_id:'econ-1',key:'economics_chart',title:'Economía · SySA 2026'}),
    vnextP1222LastWorkingSet:()=>({dataset_id:'econ-1',key:'economics_chart',title:'Economía · SySA 2026'}),
    vnextP13UniqueCalls:x=>x,
    vnextP122NormalizeMemoryCalls:x=>x,
    zuzuTracePush:()=>{}
  };vm.createContext(ctx);vm.runInContext(parserCode+'\nthis.P=vnextP2RParseArgs;this.T=vnextP2RPlanToCalls;',ctx);
  const parsed=ctx.P('filter=Indicador:Ingresos|Compras realizadas; show=Valor; sort=Valor:desc; reset_filters=false');
  t('parser produce 2 filtros OR',parsed.view_filters?.length===2&&parsed.view_filters.every(x=>x.operator==='eq'));
  t('parser produce sort desc',parsed.view_sort?.[0]?.field==='Valor'&&parsed.view_sort?.[0]?.direction==='desc');
  t('parser show Valor',parsed.visible_columns?.[0]==='Valor');
  const plans=[
    [{intent:'DATA',operation:'event_summary',target:'SySA 2026'},c=>c.length===1&&c[0].name==='query_ce'&&c[0].arguments.operation==='event_summary'&&c[0].arguments.event==='SySA 2026'],
    [{intent:'VIEW',target:'Economía · SySA 2026',args:'filter=Indicador:Ingresos|Compras realizadas'},c=>c[0]?.arguments?.operation==='view_current'&&c[0].arguments.dataset_id==='econ-1'&&c[0].arguments.view_filters?.length===2],
    [{intent:'CALCULATE',operation:'MAX',target:'Economía · SySA 2026',args:'field=Valor; label_field=Indicador'},c=>c[0]?.arguments?.operation==='derive'&&c[0].arguments.derive_operation==='MAX'&&c[0].arguments.field==='Valor'],
    [{intent:'MEMORY',operation:'search',target:'Pocholo'},c=>c[0]?.name==='recall_memory'&&c[0].arguments.action==='search'&&c[0].arguments.query==='Pocholo'],
    [{intent:'PERSON',operation:'person_events',entities:['Colty','Esther']},c=>c.length===2&&c.every(x=>x.name==='query_ce'&&x.arguments.operation==='person_events')&&c.map(x=>x.arguments.person).join('|')==='Colty|Esther'],
    [{intent:'CHAT',response:'Seguimos con ello.'},c=>c[0]?.name==='local_response'&&c[0].arguments.response==='Seguimos con ello.']
  ];
  let pass=0,total=0;for(let r=0;r<20;r++)for(const [plan,check] of plans){total++;if(check(ctx.T(plan,[],[])))pass++;}
  t('traductor aislado 6x20 = 120/120',pass===total,`${pass}/${total}`);
}catch(e){t('ejecución aislada del traductor',false,String(e));}

// GOLDEN semántico honesto.
t('GOLDEN usa indicadores reales',lab.includes('Indicador sea Ingresos o Compras realizadas'));
t('GOLDEN verifica filas/columnas/orden',lab.includes('expectedRowCount')&&lab.includes('expectedColumns')&&lab.includes('expectedSort'));
t('GOLDEN acepta resumen equivalente del recuerdo',lab.includes("semantic:'memory_summary'"));
t('GOLDEN no fuerza cascadas',/if\(\/GOLDEN\\s\+DIALOGUE\/i\.test\(scenario\)\)/.test(lab));
t('battery P2R golden',lab.includes("'GOLDEN-DIALOG-P2R-14'"));
t('battery P2R dialog',lab.includes("'DIALOGUE-P2R-24'"));
t('LIGHT P2R',ui.includes("reportFormat:'LIGHT-P2R'"));
t('build UI P2R',ui.includes("20260902-P2R-MINIMAL-PLANNER-GOLDEN-NHC"));
t('cache P2R',html.includes('20260902-VNEXT-P2R-MINIMAL-PLANNER-GOLDEN-NHC'));
t('package registra P2R',pkg.scripts?.['test:vnext-p2r']==='node scripts/v4-1-exp-vnext-p2r-minimal-planner-regression.cjs');
console.log(`VNEXT P2-R MINIMAL PLANNER: ${ok} OK · ${bad} KO`);process.exitCode=bad?1:0;
