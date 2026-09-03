const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const reg=fs.readFileSync(path.join(root,'services/zuzu-capability-registry.service.js'),'utf8');
const lab=fs.readFileSync(path.join(root,'services/zuzu-test-lab.service.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'public/app/features/zuzu-test-console-gd.js'),'utf8');
const zuzuUi=fs.readFileSync(path.join(root,'public/app/features/v11-3-zuzu-analitica-libre.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const sql=fs.readFileSync(path.join(root,'sql/ce_zuzu_capability_registry_p123.sql'),'utf8');
let ok=0,bad=0;function t(name,cond,detail=''){if(cond){ok++;console.log('OK ',name);}else{bad++;console.error('KO ',name,detail);}}
function extractFunction(src,name){
  const re=new RegExp(`(?:async\\s+)?function\\s+${name.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}\\s*\\(`);const m=re.exec(src);if(!m)throw new Error(`No encuentro ${name}`);const i=m.index;let p=src.indexOf('(',i),pd=0,quote='',esc=false,body=-1;
  for(let j=p;j<src.length;j++){const c=src[j];if(quote){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='(')pd++;else if(c===')'){pd--;if(pd===0){body=src.indexOf('{',j);break;}}}
  if(body<0)throw new Error(`Cuerpo no encontrado ${name}`);let depth=0;quote='';esc=false;for(let j=body;j<src.length;j++){const c=src[j];if(quote){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'&&--depth===0)return src.slice(i,j+1);}throw new Error(`Función incompleta ${name}`);
}

t('registro P1.23',reg.includes("CAPABILITY_REGISTRY_VERSION='20260902-P123'"));
t('change_focus es metadato universal',reg.includes("change_focus:{type:'boolean'}")&&reg.includes("const META=['requested_fields','focus_mode','focus_type','focus_entities','change_focus']"));
t('filas reversibles en view_current',reg.includes('remove_view_filters')&&reg.includes('reset_filters')&&reg.includes('reincorporar filas'));
t('tool dialogue_state publicada',ai.includes("name:'dialogue_state'")&&ai.includes("set_pending")&&ai.includes("pending_tool"));
t('Dialogue State Authority runtime',ai.includes('function vnextP123DialogueState')&&ai.includes('function vnextP123AuthorityViolations')&&ai.includes('DIALOGUE_STATE_AUTHORITY_RETRY'));
t('pending_intent se completa estructuralmente',ai.includes('function vnextP123ApplyPendingIntent')&&ai.includes('PENDING INTENT'));
t('NO EMPTY PROMISE protege intención pendiente',ai.includes('[NO_EMPTY_PROMISE_RETRY]')&&ai.includes('pending_intent activo'));
t('provider P1.23',ai.includes('zuzu-vnext-p123-dialogue-state-authority-adaptive-itv-jsonlight'));
t('usuario sintético adaptativo exportado',ai.includes('export async function generateZuzuItvDialogueUserTurn')&&ai.includes('No recites un guion ni una lista de preguntas'));
t('ITV DIÁLOGO 24 existe',lab.includes("DIALOGUE:{id:'DIALOGUE',label:'DIÁLOGO · 24',count:24")&&lab.includes('buildAdaptiveDialogueCases'));
t('turnos posteriores nacen de respuesta real',lab.includes('dialogueNext')&&lab.includes('generateZuzuItvDialogueUserTurn')&&lab.includes('nextUtterance'));
t('ITV evalúa promesa/foco/coherencia/tool',lab.includes('empty_promise===true')&&lab.includes('previous_coherent===false')&&lab.includes('focus_preserved===false')&&lab.includes('requiresTool===true'));
t('misión adaptativa no contiene lista fija de preguntas',lab.includes('NO sigas un guion de preguntas')&&lab.includes('No hay orden obligatorio'));
t('UI expone botón DIÁLOGO',ui.includes('data-level="DIALOGUE"')&&ui.includes('Usuario sintético adaptativo'));
t('manifiesto admite prompts adaptativos',ui.includes("c?.dialogue?.adaptive!==true&&trim(r?.prompt)!==trim(c?.prompt)"));
t('JSON LIGHT P1.23 conserva diálogo y métricas',ui.includes("reportFormat:'LIGHT-P123'")&&ui.includes('dialogueMetrics')&&ui.includes('dialogue:r.dialogue||null'));
t('PDF protege conversación local frente a sync parcial',zuzuUi.includes('P1.23 · guardia adicional')&&zuzuUi.includes('before.length>hist.length')&&zuzuUi.includes('hacemos UNION por turnId'));
t('cache bust P1.23',html.includes('20260902-VNEXT-P123-DIALOGUE-STATE-AUTHORITY-ADAPTIVE-ITV-PDF-GUARD-NHC'));
t('SQL espejo P1.23',sql.includes('20260902-P123')&&sql.includes('remove_view_filters')&&sql.includes('change_focus'));

const sandbox={console};sandbox.arr=v=>Array.isArray(v)?v:[];sandbox.trim=v=>v==null?'':String(v).trim();sandbox.vnextNorm=v=>sandbox.trim(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');sandbox.zuzuTracePush=()=>{};
sandbox.vnextP1222LastWorkingSet=()=>({dataset_id:'d1',title:'Tabla actual',source_tool:'recall_memory',source_operation:'search'});sandbox.vnextP1223LastSelectedMemoryEpisode=()=>({});sandbox.vnextP119LastStructuredFocus=()=>({type:'person',entities:['Gema'],mode:'replace'});
vm.createContext(sandbox);for(const n of ['vnextP123DialogueState','vnextP123ApplyPendingIntent','vnextP123AuthorityViolations'])vm.runInContext(extractFunction(ai,n),sandbox);
let hist=[{user:'sí, memoria',resultContext:{dialogue_state:{version:'P1.23',active_focus:{type:'person',entities:['Gema'],mode:'replace'},active_object:{type:'dataset',id:'d1',title:'Tabla actual',source:'recall_memory:search'},pending_intent:{active:true,tool:'recall_memory',operation:'',args:{action:'search',query:'Gema'},missing:['scope'],goal:'histórico de Gema'},artifact_visible:true}}}];
const ds=sandbox.vnextP123DialogueState(hist);t('estado persistido gana a reconstrucción antigua',ds.active_object.id==='d1'&&ds.pending_intent.args.query==='Gema',JSON.stringify(ds));
const merged=sandbox.vnextP123ApplyPendingIntent([{name:'recall_memory',arguments:{action:'search'}}],hist,[]);t('pending args heredados sin reinterpretar frase',merged[0].arguments.query==='Gema',JSON.stringify(merged));
const allowed=sandbox.vnextP123AuthorityViolations([{name:'query_ce',arguments:{operation:'person_events',person:'Gema'}}],hist);t('dataset permite continuación del foco personal',allowed.length===0,JSON.stringify(allowed));
const rejected=sandbox.vnextP123AuthorityViolations([{name:'query_ce',arguments:{operation:'events_catalog'}}],hist);t('dataset bloquea salto factual no declarado',rejected.length===1,JSON.stringify(rejected));
const switched=sandbox.vnextP123AuthorityViolations([{name:'query_ce',arguments:{operation:'events_catalog',change_focus:true}}],hist);t('change_focus permite salto deliberado',switched.length===0,JSON.stringify(switched));

const viewSandbox={arr:sandbox.arr,trim:sandbox.trim,vnextP110NormalizeViewFilters:v=>sandbox.arr(v),vnextP110NormalizeViewSort:v=>sandbox.arr(v),vnextP1222NormalizeWorkingSet:v=>v,vnextP1222MergeViewFilters:(a,b)=>[...sandbox.arr(a),...sandbox.arr(b)],vnextP1223ResolveColumnIds:()=>[] ,vnextP17LooseNorm:sandbox.vnextNorm};vm.createContext(viewSandbox);vm.runInContext(extractFunction(ai,'vnextP1222NextViewState'),viewSandbox);
let vws={view_state:{filters:[{field:'Persona',operator:'neq',value:'Tita'}],sort:[],visible_columns:[],hidden_columns:[]}};
let vs=viewSandbox.vnextP1222NextViewState(vws,{remove_view_filters:[{field:'Persona',operator:'neq',value:'Tita'}]});t('reincorporar fila elimina exclusión concreta',vs.filters.length===0,JSON.stringify(vs));
vs=viewSandbox.vnextP1222NextViewState(vws,{reset_filters:true});t('reset_filters recupera todas las filas',vs.filters.length===0,JSON.stringify(vs));

const p123Chunk=ai.slice(ai.indexOf('function vnextP123DialogueState'),ai.indexOf('function vnextP1Input'));
t('NHC P1.23: autoridad no contiene entidades/preguntas de prueba',!/Ayuntamiento|Cordo|Gema|Emiliano|Tita|veinticinco/i.test(p123Chunk));
console.log(`P1.23 DIALOGUE STATE + ADAPTIVE ITV: ${ok} OK · ${bad} KO`);process.exitCode=bad?1:0;
