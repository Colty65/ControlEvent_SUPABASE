const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('services/event-ai.service.js','utf8');
const voice=fs.readFileSync('public/app/features/v22-voz3-zuzu.js','utf8');
const ledger=fs.readFileSync('services/zuzu-conversation-ledger.service.js','utf8');

function extractFunction(name){
  const start=src.indexOf(`function ${name}(`); if(start<0)throw new Error(`No encuentro ${name}`);
  const p0=src.indexOf('(',start); let pd=0,quote='',esc=false,close=-1;
  for(let i=p0;i<src.length;i++){const c=src[i];if(quote){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='(')pd++;else if(c===')'&&--pd===0){close=i;break;}}
  const brace=src.indexOf('{',close); let depth=0; quote=''; esc=false;
  for(let i=brace;i<src.length;i++){const c=src[i];if(quote){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'&&--depth===0)return src.slice(start,i+1);}
  throw new Error(`Función incompleta ${name}`);
}
const helpers=`
const text=v=>v==null?'':String(v);const trim=v=>text(v).trim();const arr=v=>Array.isArray(v)?v:[];
const norm=v=>{const s=text(v);return (s.normalize?s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,''):s).toLowerCase().replace(/[^a-z0-9ñ ]+/g,' ').replace(/\\s+/g,' ').trim();};
const zuzuTracePush=()=>{};
const v73PrimaryDomain=q=>trim(arr(q?.targets)[0]?.domain);
`;
const code=[helpers,
  extractFunction('v77MemoryConfirmationIntent'),extractFunction('v413MemoryIndexIntent'),extractFunction('v413MemoryIndexOrder'),
  extractFunction('v413FeedbackOnlyIntent'),extractFunction('v413RepairFeedbackOnly'),extractFunction('v413RepairSubjectEllipsis'),
  'return {v77MemoryConfirmationIntent,v413MemoryIndexIntent,v413MemoryIndexOrder,v413FeedbackOnlyIntent,v413RepairFeedbackOnly,v413RepairSubjectEllipsis};'
].join('\n');
const F=new Function(code)();
let n=0;function ok(cond,msg){assert.ok(cond,msg);n++;console.log(`OK ${n}: ${msg}`);}function eq(a,b,msg){assert.deepStrictEqual(a,b,msg);n++;console.log(`OK ${n}: ${msg}`);}

ok(F.v77MemoryConfirmationIntent('sí'),'«sí» sigue siendo confirmación corta de memoria');
ok(!F.v77MemoryConfirmationIntent('sí, dame una tabla con la info de mis recuerdos de más antiguo a más moderno'),'«sí + nueva petición» ya no secuestra el turno como confirmación');
ok(F.v413MemoryIndexIntent('dame una tabla con la info de mis recuerdos de más antiguo a más moderno'),'petición plural de recuerdos activa índice de memoria');
eq(F.v413MemoryIndexOrder('mis recuerdos de más antiguo a más moderno'),'oldest','orden antiguo → moderno se conserva');
ok(!F.v413MemoryIndexIntent('recuérdame nuestra primera conversación'),'ordinal singular sigue usando recall_episode y no índice');

ok(F.v413FeedbackOnlyIntent('Ya te has despistado, siempre lo haces, siempre te escapas por algún sitio que no debes.'),'queja pura se reconoce como feedback');
ok(F.v413FeedbackOnlyIntent('pelín desaster Zuzu. No aciertas últimamente'),'variante coloquial/mal escrita de desastre sigue siendo feedback');
ok(!F.v413FeedbackOnlyIntent('fatal, busca ahora en qué eventos aparece'),'queja + petición factual no se traga la consulta');
const fb=F.v413RepairFeedbackOnly({action:'reference',reference:{target_ref:'T5',action:'reexecute_plan'}},'pelín desaster Zuzu. No aciertas ultimamente',[]);
eq(fb,{action:'conversation',conversation:{kind:'feedback',note:'El usuario está valorando negativamente la respuesta anterior y no ha pedido una nueva consulta factual.'}},'feedback puro no reejecuta por accidente el turno anterior');

const repaired=F.v413RepairSubjectEllipsis({action:'query',response_kind:'summary',query:{targets:[{domain:'event'}],scope:{kind:'all_events'}}},{discourse_focus:{subject_type:'PERSON',subject:'Clara Alvarez Garcia-Brazales'}},{typed:{PERSON:[]}},'Busca en que eventos aparece',[]);
eq(repaired.query.targets,[{domain:'person'}],'sujeto omitido sobre eventos se convierte en dossier transversal de la PERSON viva');
eq(repaired.query.scope,{kind:'all_events'},'búsqueda transversal mantiene all_events');
eq(repaired.query.people,['Clara Alvarez Garcia-Brazales'],'la persona procede del discourse_focus, no del usuario logado');
eq(repaired.response_kind,'which_event','pregunta «en qué eventos» pide which_event');

ok(/conversationKind=\{type:'string',[\s\S]{0,420}?enum:\['general','greeting','farewell','feedback','correction','system_complaint','current_context','conversation_summary','incoherent_input','incoherent_progress','irrelevant_input'\]/.test(src),'ce_conversation publica enum canónico y feedback válido');
ok(/kind=\['general'[\s\S]{0,320}?'memory_index'\]/.test(src),'normalizador admite memory_index interno sin exponerlo como tool Gemini');
ok(src.includes("BANK4_13 · ÍNDICE DE MEMORIA")&&src.includes("v73LocalCompiledConversation('memory_index'"),'índice de memoria se compila localmente antes de Gemini');
ok(src.includes('listZuzuMemoryEpisodes({actor,conversationId:conversation.conversationId,limit:200})')&&ledger.includes('export async function listZuzuMemoryEpisodes'),'índice plural usa el inventario DB completo de episodios, no un Top-12 temático');
ok(src.includes("execution?.memory_index===true?{table:arr(tables).length>0")&&src.includes("if(execution?.memory_index===true){visibleTables=arr(tables).slice();}"),'tabla de recuerdos se muestra sin contaminarla con el dataset operativo anterior');
ok(src.includes("BANK4_13 · KO SIN ALUCINACIÓN FINAL")&&/if\(status==='KO'\)\{[\s\S]{0,700}?response_mode:'local_execution_error'/.test(src),'un KO se presenta localmente y no pasa a Gemini final');
ok(src.includes('reconoce el despiste concreto con naturalidad')&&src.includes('mi objetivo es ayudarte'),'prompt final evita respuesta de atención al cliente ante frustración');
ok(src.includes("const executedPerson=trim(execution?.focus?.person")&&src.includes("out.subject_type='PERSON';out.subject=executedPerson"),'reejecución desde memoria persiste la PERSON factual como discourse focus');

ok(voice.includes("'Ummm...................'"),'mensaje Ummm usa exactamente el texto solicitado');
ok(voice.includes("'Calla............... ya lo tengo....., besitos muá.'"),'mensaje Calla usa exactamente el texto solicitado');
ok(voice.includes("return 'Ummm...................';"),'fallback de entretenimiento usa el nuevo Ummm');
ok(!voice.includes("'Calla… que ya lo tengo.'"),'mensaje Calla antiguo ya no está en el mazo');
ok(voice.includes('entertainment_deck_v47')&&voice.includes('entertainment_used_v47'),'se renueva el mazo v47 para que el navegador no conserve el carrusel anterior');

console.log(`\nBANK4_13 MEMORY CONTINUITY / FEEDBACK / VOICE: ${n}/${n} OK`);
