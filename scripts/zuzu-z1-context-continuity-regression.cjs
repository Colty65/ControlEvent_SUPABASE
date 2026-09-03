const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const ai=fs.readFileSync(path.join(root,'services','event-ai.service.js'),'utf8');
let ok=0,total=0;function t(name,cond){total++;if(cond){ok++;console.log('OK · '+name);}else{console.error('KO · '+name);process.exitCode=1;}}

t('Z1 declara autoridad lingüística Gemini',/Z1 · CONTEXTO Y CONTINUIDAD[\s\S]{0,260}Gemini[\s\S]{0,180}autoridad lingüística/.test(ai));
t('Z1 no convierte navegación humana en regex local',/CE NO interpreta expresiones como «el anterior»/.test(ai));
t('paquete semántico tipado por turno',/function v78TurnSemanticPacket/.test(ai)&&/domains:domains\.length\?domains/.test(ai));
t('pila de temas usa referencias Tn',/function v78TopicStack/.test(ai)&&/ref:`T\$\{Number\(turn\?\.seq\)\|\|0\}`/.test(ai));
t('pila de eventos conserva recencia',/function v78EventTrail/.test(ai)&&/recency_index:out\.length/.test(ai));
t('resultado actual conserva orden físico',/function v78DistinctOrderedValues/.test(ai)&&/for\(const r of arr\(rows\)\)/.test(ai));
t('resultado expone PERSON/RESPONSABLE/DONANTE',/\['person','Persona'\]/.test(ai)&&/\['responsible','Responsable'\]/.test(ai)&&/\['donor','Donante'\]/.test(ai));
t('resultado expone EVENT/PRODUCT/STORE/TICKET',/\['event','Evento'\]/.test(ai)&&/\['product','Producto'\]/.test(ai)&&/\['store','Tienda'\]/.test(ai)&&/\['ticket','Ticket u otros gastos'\]/.test(ai));
t('ordinales conservan orden named_events',/function v78OrdinalSets/.test(ai)&&/scope\?\.kind\)==='named_events'\)put\('events',scope\.events\)/.test(ai));
t('ordinales incluyen conjuntos de personas y responsables',/put\('people',q\.people\|\|q\.person\)/.test(ai)&&/put\('responsibles',q\.responsibles\|\|q\.responsible\)/.test(ai));
t('THREAD_NAVIGATION forma parte de CURRENT_CONTEXT',/thread_navigation:v78ThreadNavigation\(session,base\)/.test(ai));
t('reset vacía navegación Z1',/thread_navigation:\{version:'Z1',topics_recent_first:\[\],events_recent_first:\[\],ordinal_sets:\{\},current_result_referents:null\}/.test(ai));
t('prompt explica que índice factual no interpreta',/thread_navigation es un ÍNDICE FACTUAL creado por CE, no una interpretación/.test(ai));
t('prompt deja a Gemini resolver referencias naturales',/TÚ decides lingüísticamente si «el anterior»[\s\S]{0,220}«el siguiente»/.test(ai));
t('cambio puro de foco usa ce_set_context',/SOLO quiere cambiar de foco[\s\S]{0,160}ce_set_context/.test(ai));
t('volver a resultado usa restore_snapshot',/VOLVER A VER un resultado anterior[\s\S]{0,120}restore_snapshot/.test(ai));
t('datos nuevos tras referencia usan ce_query',/Si además pide datos nuevos, usa ce_query/.test(ai));
t('ordinales no se reordenan',/El orden de ordinal_sets es semánticamente significativo y no se debe reordenar/.test(ai));
t('siguiente usa orden materializado',/«siguiente» se resuelve por el orden materializado de la vista actual/.test(ai));
t('traza registra contexto de entrada Z1',/v4_1_exp · Z1 · CONTEXTO DE ENTRADA/.test(ai));
t('exports estructurales incluyen Z1',/v78TurnSemanticPacket,[\s\S]{0,260}v78ThreadNavigation/.test(ai));
t('arquitectura visible marca Z1 CONTEXT AUTHORITY/Z1R',/(?:RAW14V · DISCOURSE \+ MEMORY FOCUS \+ EVENT COVERAGE · Z1 CONTEXT AUTHORITY|Z1R PERFORMANCE · CONTEXT AUTHORITY)/.test(ai));

console.log(`\nZ1 CONTEXTO/CONTINUIDAD · ${ok}/${total} comprobaciones OK`);if(ok!==total)process.exitCode=1;
