const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const reg=fs.readFileSync(path.join(root,'services/zuzu-capability-registry.service.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'public/app/features/zuzu-test-console-gd.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const sql=fs.readFileSync(path.join(root,'sql/ce_zuzu_capability_registry_p1222.sql'),'utf8');
let ok=0,bad=0;function t(name,cond,detail=''){if(cond){ok++;console.log('OK ',name);}else{bad++;console.error('KO ',name,detail);}}
function extractFunction(src,name){let i=src.indexOf(`function ${name}(`);if(i<0)i=src.indexOf(`async function ${name}(`);if(i<0)throw new Error(`No encuentro ${name}`);let p=src.indexOf('(',i),pd=0,quote='',esc=false,b=-1;for(let j=p;j<src.length;j++){const c=src[j];if(quote){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quote)quote='';continue;}if(c==='\"'||c==="'"||c==='`'){quote=c;continue;}if(c==='(')pd++;else if(c===')'&&--pd===0){b=src.indexOf('{',j);break;}}if(b<0)throw new Error(`Cuerpo no encontrado ${name}`);let depth=0;quote='';esc=false;for(let j=b;j<src.length;j++){const c=src[j];if(quote){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quote)quote='';continue;}if(c==='\"'||c==="'"||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'&&--depth===0)return src.slice(i,j+1);}throw new Error(`Función incompleta ${name}`);}
// Estructura / registro
t('registro P1.22.2',reg.includes("CAPABILITY_REGISTRY_VERSION='20260901-P1222'"));
t('summarize_current registrado',reg.includes("summarize_current:def('VISTA'"));
t('view_current persiste y vuelve a mostrar',reg.includes("view_current:'Transforma o vuelve a mostrar"));
t('working_set separado de view_state',ai.includes('function vnextP1222WorkingSetFromResult')&&ai.includes('base_columns')&&ai.includes('view_state'));
t('contexto conserva current_dataset en conversación',ai.includes('function vnextP1222ContextFromResults')&&ai.includes('current_dataset:ws')&&ai.includes('previous=vnextP1222LastWorkingSet(history)'));
t('reabrir misma fuente preserva CURRENT_DATASET',ai.includes('function vnextP1222NormalizeSourceReopenCalls')&&ai.includes("trim(a.action)!=='read'||trim(ws.source_tool)!=='recall_memory'")&&ai.includes("functionCalls=vnextP1222NormalizeSourceReopenCalls(functionCalls,conversationHistory,flowTrace)"));
t('tabla persistente cuando el turno no trae tabla nueva',ai.includes('persistentTables=outputTables.length?outputTables:vnextP1222PersistentTables'));
t('summarize_current usa dataset visible',ai.includes('function vnextP1222ExecuteSummarizeCurrent')&&ai.includes('vnextP1222SummarizeCurrentDataset'));
t('memory current usa facts.action además de args',ai.includes("good[0]?.args?.action||good[0]?.result?.facts?.action"));
t('memory read tiene retry único',ai.includes('VNEXT P1.22.2 · MEMORY READ RETRY'));
t('leak guard de metadatos',ai.includes('function vnextP1222StripInternalMetadata')&&ai.includes('Contexto VNext:')&&ai.includes('capabilityAudit:'));
t('contexto al modelo marcado NO_REPETIR',ai.includes('ESTADO_INTERNO_NO_REPETIR'));
t('provider P1.22.2',ai.includes('zuzu-vnext-p1222-current-dataset-state-summary-leak-guard-jsonlight'));
t('JSON LIGHT P1.22.2',ui.includes("reportFormat:'LIGHT-P1222'"));
t('cache-bust P1.22.2',html.includes('20260901-VNEXT-P1222-CURRENT-DATASET-STATE-SUMMARY-LEAK-GUARD-GOLDEN110-NHC'));
t('SQL P1.22.2 incluye summarize_current',sql.includes("('summarize_current','VISTA','20260901-P1222'")&&sql.includes('20260901-P1222'));
// Ejecuta funciones reales extraídas para comprobar acumulación del view_state y leak guard.
const names=['vnextP110NormalizeViewFilters','vnextP110NormalizeViewSort','vnextP16MergeUniqueText','vnextP18ColumnMatches','vnextP1222NormalizeWorkingSet','vnextP1222NextViewState','vnextP1222StripInternalMetadata'];
const sandbox={console};sandbox.arr=v=>Array.isArray(v)?v:[];sandbox.trim=v=>v==null?'':String(v).trim();sandbox.norm=v=>sandbox.trim(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');sandbox.vnextP17LooseNorm=v=>sandbox.norm(v).replace(/[^a-z0-9]+/g,' ').trim();vm.createContext(sandbox);for(const n of names)vm.runInContext(extractFunction(ai,n),sandbox);
let ws={dataset_id:'x',key:'memory',title:'Memoria',base_columns:['Fecha','Pregunta','Respuesta','Resumen','Coincidencia'],base_rows:[{Fecha:'f',Pregunta:'p',Respuesta:'r',Resumen:'s',Coincidencia:'c'}],view_state:{filters:[],sort:[],visible_columns:[],hidden_columns:[]}};
for(const c of ['Fecha','Coincidencia','Pregunta','Resumen'])ws={...ws,view_state:sandbox.vnextP1222NextViewState(ws,{hidden_columns:[c]})};
t('ocultaciones se acumulan',JSON.stringify(ws.view_state.hidden_columns)===JSON.stringify(['Fecha','Coincidencia','Pregunta','Resumen']),JSON.stringify(ws.view_state.hidden_columns));
const reset=sandbox.vnextP1222NextViewState(ws,{reset_table:true});t('reset explícito limpia view_state',!reset.hidden_columns.length&&!reset.filters.length&&!reset.sort.length&&!reset.visible_columns.length);
const safe=sandbox.vnextP1222StripInternalMetadata('Aquí tienes la tabla.\nContexto VNext: {"kind":"data"}');t('leak guard conserva respuesta y corta contexto',safe==='Aquí tienes la tabla.',safe);
console.log(`P1.22.2 CURRENT DATASET: ${ok} OK · ${bad} KO`);process.exitCode=bad?1:0;
