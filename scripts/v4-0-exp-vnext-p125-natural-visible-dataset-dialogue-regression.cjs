const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const lab=fs.readFileSync(path.join(root,'services/zuzu-test-lab.service.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'public/app/features/zuzu-test-console-gd.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
let ok=0,bad=0;function t(name,cond,detail=''){if(cond){ok++;console.log('OK ',name);}else{bad++;console.error('KO ',name,detail);}}
function extractFunction(src,name){
  const re=new RegExp(`(?:async\\s+)?function\\s+${name.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}\\s*\\(`),m=re.exec(src);if(!m)throw new Error(`No encuentro ${name}`);const i=m.index;let p=src.indexOf('(',i),pd=0,quote='',esc=false,body=-1;
  for(let j=p;j<src.length;j++){const c=src[j];if(quote){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='(')pd++;else if(c===')'){pd--;if(pd===0){body=src.indexOf('{',j);break;}}}
  if(body<0)throw new Error(`Cuerpo no encontrado ${name}`);let depth=0;quote='';esc=false;for(let j=body;j<src.length;j++){const c=src[j];if(quote){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'&&--depth===0)return src.slice(i,j+1);}throw new Error(`Función incompleta ${name}`);
}
const arr=v=>Array.isArray(v)?v:[],trim=v=>v==null?'':String(v).trim(),norm=v=>trim(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

// Marcadores estructurales P1.25.
t('provider P1.25',ai.includes("provider:'zuzu-vnext-p125-natural-visible-dataset-dialogue'"));
t('arquitectura P1.25',ai.includes('VNext P1.25 · autoridad de datasets visibles'));
t('JSON LIGHT P1.25',ui.includes("reportFormat:'LIGHT-P125'"));
t('cache bust P1.25',html.includes('20260902-VNEXT-P125-NATURAL-VISIBLE-DATASET-DIALOGUE-NHC'));
t('todas las tablas visibles persisten',ai.includes('presented_datasets')&&ai.includes('visible_datasets'));
t('procedencia interna no cruza query_ce',ai.includes("delete rawArgs.source_base_args")&&ai.includes('INTERNAL PROVENANCE'));
t('retry real puede superar la primera Interaction',/repara autoridad de estado[\s\S]{0,220}maxCalls:3/.test(ai)&&/completa intención pendiente[\s\S]{0,220}maxCalls:3/.test(ai));
t('ITV endurecida frente a tabla equivocada',lab.includes('p125DialogueArtifactGuard')&&lab.includes('La respuesta materializó otra tabla'));
t('simulador bloquea JSON bruto',ai.includes('vnextP125ExtractDialogueJson')&&ai.includes('JSON USER GUARD'));

// 1) Dos positivos sobre una columna son OR; negativos siguen siendo AND.
{
 const s={arr,trim,vnextP17LooseNorm:norm,vnextP110ValueMatch:(cell,wanted)=>norm(cell)===norm(wanted)};vm.createContext(s);vm.runInContext(extractFunction(ai,'vnextP110NormalizeViewFilters'),s);vm.runInContext(extractFunction(ai,'vnextP110FilterRows'),s);
 const rows=[{Indicador:'Coste de personal'},{Indicador:'Ingresos por patrocinio'},{Indicador:'Gastos operativos'}];
 const got=s.vnextP110FilterRows(rows,[{field:'Indicador',operator:'contains',value:'Coste de personal'},{field:'Indicador',operator:'contains',value:'Ingresos por patrocinio'}]);
 t('filtros A o B sobre misma columna funcionan como OR',got.length===2&&got.some(x=>x.Indicador==='Coste de personal')&&got.some(x=>x.Indicador==='Ingresos por patrocinio'),JSON.stringify(got));
}

// 2) Memoria: lote 0/1 usa índices zero-based si el modelo emitió 0 y manda la referencia materializada.
{
 const s={arr,trim,zuzuTracePush:()=>{},vnextP122LastMemoryContext:()=>({memory_candidates:[{conversation_id:'c1',turn_id:'t1'},{conversation_id:'c2',turn_id:'t2'}]}),vnextP1223LastSelectedMemoryEpisode:()=>({})};vm.createContext(s);vm.runInContext(extractFunction(ai,'vnextP122NormalizeMemoryCalls'),s);
 const got=s.vnextP122NormalizeMemoryCalls([{name:'recall_memory',arguments:{action:'read',result_index:0,conversation_id:'inventado'}},{name:'recall_memory',arguments:{action:'read',result_index:1,conversation_id:'inventado'}}],[],[]);
 t('memoria abre exactamente resultados 0 y 1 recién mostrados',got[0].arguments.conversation_id==='c1'&&got[0].arguments.matched_turn_id==='t1'&&got[1].arguments.conversation_id==='c2'&&got[1].arguments.matched_turn_id==='t2',JSON.stringify(got));
}

// 3) El usuario sintético nunca puede entregar el JSON de control entero como mensaje.
{
 const body=ai.slice(ai.indexOf('function vnextP125ExtractDialogueJson'),ai.indexOf('export async function generateZuzuItvDialogueUserTurn'));
 t('ITV parser prioriza parsed.utterance',body.includes('if(trim(parsed?.utterance))return parsed'));
 t('ITV parser tiene rescate literal de utterance',body.includes('text0.match(/\"utterance\"')&&body.includes('return{utterance:JSON.parse'));
 const gs=ai.indexOf('export async function generateZuzuItvDialogueUserTurn'),gen=ai.slice(gs,gs+9000);
 t('ITV no usa raw como fallback de utterance',gen.includes("utterance=trim(parsed?.utterance)||fallback")&&!gen.includes("utterance=trim(parsed?.utterance)||raw"));
}

// 4) Routing real sobre dos datasets visibles: Indicadores se mantiene y la llamada equivocada de ingresos va a Economía.
{
 const indicadores={dataset_id:'d_ind',key:'kpis',title:'Indicadores de FUNCION 2026',base_columns:['Indicador','Valor'],base_rows:[{Indicador:'A',Valor:2},{Indicador:'B',Valor:1}],source_operation:'event_summary'};
 const economia={dataset_id:'d_eco',key:'economics_chart',title:'Economía · FUNCION 2026',base_columns:['Indicador','Valor'],base_rows:[{Indicador:'Coste de personal',Valor:500},{Indicador:'Ingresos por patrocinio',Valor:900},{Indicador:'Gastos operativos',Valor:300}],source_operation:'event_summary'};
 const s={arr,trim,norm,vnextP17LooseNorm:norm,zuzuTracePush:()=>{},vnextP125RecentWorkingSets:()=>[indicadores,economia],vnextP1222NormalizeWorkingSet:v=>v,vnextP1223EditSimilarity:(a,b)=>norm(a)===norm(b)?1:0,vnextP1222HasViewMutation:a=>arr(a?.hidden_columns).length||arr(a?.visible_columns).length||arr(a?.view_filters).length||arr(a?.view_sort).length||a?.reset_table===true,vnextP110ResolveColumn:(cols,q)=>arr(cols).find(c=>norm(c)===norm(q))||'',vnextP110NormalizeViewFilters:v=>arr(v).map(x=>({...x})),vnextP110NormalizeViewSort:v=>arr(v).map(x=>({...x})),vnextP116DefaultLabelField:t=>arr(t?.columns)[0]||''};vm.createContext(s);
 for(const n of ['vnextP125DatasetTitleTokens','vnextP125DatasetMentionScore','vnextP125ResolveWorkingSet','vnextP125MentionedWorkingSets','vnextP125CanonicalDecisionForWorkingSet','vnextP125RepairRowValueRequests','vnextP125NormalizeVisibleDatasetCalls'])vm.runInContext(extractFunction(ai,n),s);
 const prompt="De la tabla de Indicadores de FUNCION 2026 dame los 3 mayores; y de Economía dime si está Coste de personal o Ingresos por patrocinio";
 const calls=[
  {name:'query_ce',arguments:{operation:'derive',table_key:'Indicadores de FUNCION 2026',field:'Indicador',derive_field:'Valor',derive_operation:'MAX',top_n:3}},
  {name:'query_ce',arguments:{operation:'event_income_status',event:'FUNCION 2026',requested_fields:['Indicador','Valor'],view_filters:[{field:'Indicador',operator:'contains',value:'Coste de personal'},{field:'Indicador',operator:'contains',value:'Ingresos por patrocinio'}]}}
 ];
 const got=s.vnextP125NormalizeVisibleDatasetCalls(calls,[],prompt,[]);
 t('derive queda ligado a Indicadores',got[0].arguments.operation==='derive'&&got[0].arguments.dataset_id==='d_ind',JSON.stringify(got[0]));
 t('Economía no se reinterpreta como ingresos',got[1].arguments.operation==='view_current'&&got[1].arguments.dataset_id==='d_eco'&&got[1].arguments.table_key==='economics_chart',JSON.stringify(got[1]));
}

// 5) Contrato derive: la métrica es derive_field y field queda como etiqueta.
{
 const body=extractFunction(ai,'vnextP116ExecuteDerive');
 t('derive separa métrica de etiqueta',body.includes("metricRaw=trim(decision?.derive_field)||trim(decision?.field)")&&body.includes("labelRaw=trim(decision?.label_field)||((trim(decision?.derive_field)&&trim(decision?.field))?trim(decision.field):'')"),body.slice(0,900));
 t('MAX/MIN respetan top_n',body.includes("chosen=sorted.slice(0,Math.max(1,Number(decision?.top_n)||1))"));
 t('derive visible no reabre módulo empresarial',body.includes('DERIVE SNAPSHOT')&&body.includes('vnextP1222RenderWorkingSet(targetWs'));
}

// 6) Una corrección explícita no puede escapar de dataset solo con focus_mode=replace.
{
 const s={arr,trim,vnextNorm:norm,vnextP1222LastWorkingSet:()=>null,vnextP1223LastSelectedMemoryEpisode:()=>({}),vnextP119LastStructuredFocus:()=>({type:'event',entities:['FUNCION 2026'],mode:'replace'})};vm.createContext(s);vm.runInContext(extractFunction(ai,'vnextP123DialogueState'),s);vm.runInContext(extractFunction(ai,'vnextP123AuthorityViolations'),s);
 const hist=[{resultContext:{dialogue_state:{version:'P1.23',active_focus:{type:'event',entities:['FUNCION 2026'],mode:'replace'},active_object:{type:'dataset',id:'d_eco',title:'Economía · FUNCION 2026',source:'query_ce:event_summary'}}}}];
 const badJump=s.vnextP123AuthorityViolations([{name:'query_ce',arguments:{operation:'event_income_lines',event:'FUNCION 2026',focus_mode:'replace'}}],hist);
 const explicit=s.vnextP123AuthorityViolations([{name:'query_ce',arguments:{operation:'event_income_lines',event:'FUNCION 2026',change_focus:true}}],hist);
 t('focus_mode replace solo no rompe dataset activo',badJump.length===0 ? false : true,JSON.stringify(badJump));
 t('change_focus explícito sí permite salir',explicit.length===0,JSON.stringify(explicit));
}

console.log(`P1.25 NATURAL VISIBLE DATASET DIALOGUE: ${ok} OK · ${bad} KO`);process.exitCode=bad?1:0;
