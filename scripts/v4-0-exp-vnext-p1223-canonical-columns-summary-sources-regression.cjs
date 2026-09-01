const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const reg=fs.readFileSync(path.join(root,'services/zuzu-capability-registry.service.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'public/app/features/zuzu-test-console-gd.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const sql=fs.readFileSync(path.join(root,'sql/ce_zuzu_capability_registry_p1223.sql'),'utf8');
let ok=0,bad=0;function t(name,cond,detail=''){if(cond){ok++;console.log('OK ',name);}else{bad++;console.error('KO ',name,detail);}}
function extractFunction(src,name){
  const re=new RegExp(`(?:async\\s+)?function\\s+${name.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}\\s*\\(`);const m=re.exec(src);if(!m)throw new Error(`No encuentro ${name}`);const i=m.index;let p=src.indexOf('(',i),pd=0,quote='',esc=false,body=-1,bracket=0,braceInArgs=0;
  for(let j=p;j<src.length;j++){const c=src[j];if(quote){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='(')pd++;else if(c===')'){pd--;if(pd===0){body=src.indexOf('{',j);break;}}}
  if(body<0)throw new Error(`Cuerpo no encontrado ${name}`);let depth=0;quote='';esc=false;for(let j=body;j<src.length;j++){const c=src[j];if(quote){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'&&--depth===0)return src.slice(i,j+1);}throw new Error(`Función incompleta ${name}`);
}
t('registro P1.22.3',reg.includes("CAPABILITY_REGISTRY_VERSION='20260902-P1223'"));
t('recall_memory publica summarize',ai.includes("enum:['current','search','list','read','summarize']")&&ai.includes("action==='read'||action==='summarize'"));
t('jerarquía resumen documentada al modelo',ai.includes('JERARQUÍA DE RESUMEN')&&ai.includes('recall_memory(action=summarize)')&&ai.includes('summarize_current'));
t('workspace hint compacto',ai.includes('function vnextP1223WorkspaceHint')&&ai.includes('ESPACIO_TRABAJO_INTERNO_NO_REPETIR'));
t('selected memory episode persistente',ai.includes('selected_memory_episode')&&ai.includes('function vnextP1223LastSelectedMemoryEpisode'));
t('artefacto persistente explícito',ai.includes("current_artifact:{kind:'table'")&&ai.includes('artifact_visible:true'));
t('provider P1.22.3',ai.includes('zuzu-vnext-p1223-canonical-columns-summary-sources-artifact-jsonlight'));
t('JSON LIGHT P1.22.3',ui.includes("reportFormat:'LIGHT-P1223'"));
t('cache bust P1.22.3',html.includes('20260902-VNEXT-P1223-CANONICAL-COLUMNS-SUMMARY-SOURCES-ARTIFACT-GOLDEN110-NHC'));
t('SQL espejo P1.22.3',sql.includes('20260902-P1223')&&!sql.includes('20260901-P1222'));

const sandbox={console};sandbox.arr=v=>Array.isArray(v)?v:[];sandbox.trim=v=>v==null?'':String(v).trim();sandbox.norm=v=>sandbox.trim(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');sandbox.vnextP17LooseNorm=v=>sandbox.norm(v).replace(/[^a-z0-9]+/g,' ').trim();sandbox.vnextP110NormalizeViewFilters=v=>sandbox.arr(v);sandbox.vnextP110NormalizeViewSort=v=>sandbox.arr(v);sandbox.vnextP16MergeUniqueText=(a,b)=>{const out=[...sandbox.arr(a)];for(const x of sandbox.arr(b)){const s=sandbox.trim(x);if(s&&!out.some(y=>sandbox.norm(y)===sandbox.norm(s)))out.push(s);}return out;};sandbox.vnextP1222MergeViewFilters=(a,b)=>[...sandbox.arr(a),...sandbox.arr(b)];vm.createContext(sandbox);
const funcs=['vnextP1223ColumnBaseId','vnextP1223ColumnCatalog','vnextP1223EditSimilarity','vnextP1223ResolveColumnId','vnextP1223ResolveColumnIds','vnextP1223ColumnLabels','vnextP1222NormalizeWorkingSet','vnextP1223EffectiveColumnIds','vnextP1222NextViewState','vnextP1223SummaryWorkingSet','vnextP1223LastSelectedMemoryEpisode'];
for(const n of funcs)vm.runInContext(extractFunction(ai,n),sandbox);
let ws={dataset_id:'m1',key:'memory',title:'Recuerdos',base_columns:['Referencia','Fecha','Título','Resumen','Mención visible','Conversation ID','Turn ID','Puntuación'],base_rows:[{'Referencia':'r','Fecha':'f','Título':'t','Resumen':'s','Mención visible':'Sí','Conversation ID':'cid','Turn ID':'tid','Puntuación':1}],view_state:{filters:[],sort:[],visible_columns:[],hidden_columns:[]}};
ws=sandbox.vnextP1222NormalizeWorkingSet(ws);
t('catálogo canónico de columnas',ws.column_catalog.length===8&&ws.column_catalog.some(c=>c.id==='conversation_id'),JSON.stringify(ws.column_catalog));
let state=sandbox.vnextP1222NextViewState(ws,{hidden_columns:['Conversacion ID','Turn ID']});ws={...ws,view_state:state};
t('fuzzy genérico Conversacion/Conversation',state.hidden_columns.includes('conversation_id')&&state.hidden_columns.includes('turn_id'),JSON.stringify(state));
for(const col of ['mENCION VISIBLE','rEFERENCIA','fECHA','Titulo']){state=sandbox.vnextP1222NextViewState({...ws,view_state:state},{hidden_columns:[col]});ws={...ws,view_state:state};}
t('ocultaciones acumulativas por IDs',state.hidden_columns.length===6&&['conversation_id','turn_id','mencion_visible','referencia','fecha','titulo'].every(x=>state.hidden_columns.includes(x)),JSON.stringify(state.hidden_columns));
const shown=sandbox.vnextP1222NextViewState({...ws,view_state:state},{visible_columns:['Fecha']});
t('mostrar columna oculta no destruye proyección',!shown.hidden_columns.includes('fecha')&&shown.visible_columns.length===0,JSON.stringify(shown));
let ws2=sandbox.vnextP1222NormalizeWorkingSet({dataset_id:'ep',key:'memory_turns',title:'Conversación recordada',base_columns:['Fecha','Pregunta','Respuesta','Resumen','Coincidencia'],base_rows:[{Fecha:'f',Pregunta:'p',Respuesta:'r',Resumen:'s',Coincidencia:'★'}],source_tool:'recall_memory',source_operation:'read',source_ref:{conversation_id:'cid-1'},view_state:{hidden_columns:['Fecha','Pregunta','Resumen','Coincidencia'],visible_columns:[],filters:[],sort:[]}});
const sumWs=sandbox.vnextP1223SummaryWorkingSet(ws2,['rESPuEsTA']);
t('summarize requested_fields selecciona columna visible',JSON.stringify(sandbox.vnextP1223EffectiveColumnIds(sumWs))===JSON.stringify(['respuesta']),JSON.stringify(sandbox.vnextP1223EffectiveColumnIds(sumWs)));
const selected=sandbox.vnextP1223LastSelectedMemoryEpisode([{resultContext:{selected_memory_episode:{conversation_id:'abc',title:'Episodio'}}}]);
t('episodio histórico seleccionado recuperable',selected.conversation_id==='abc'&&selected.title==='Episodio',JSON.stringify(selected));
const p1223Chunk=ai.slice(ai.indexOf('function vnextP1223ColumnBaseId'),ai.indexOf('function vnextP1221NormalizeAuxiliaryCalls'));
t('NHC: nuevas funciones sin casos de prueba concretos',!/Ayuntamiento|Cordo|Pilar|Fecha\s*===|Respuesta\s*===/i.test(p1223Chunk));
console.log(`P1.22.3 CANONICAL DATASET: ${ok} OK · ${bad} KO`);process.exitCode=bad?1:0;
