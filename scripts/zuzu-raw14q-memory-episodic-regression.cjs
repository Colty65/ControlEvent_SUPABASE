const fs=require('fs');
const ledger=fs.readFileSync('services/zuzu-conversation-ledger.service.js','utf8');
const ai=fs.readFileSync('services/event-ai.service.js','utf8');
const sql=fs.readFileSync('sql/ce_zuzu_memory_raw14q.sql','utf8');
let ok=0,ko=0;function t(n,c){if(c){console.log('OK · '+n);ok++;}else{console.error('KO · '+n);ko++;}}

t('SQL conversación guarda resumen/temas/entidades',/memory_summary text[\s\S]*memory_main_topics jsonb[\s\S]*memory_main_entities jsonb[\s\S]*memory_recallable_turns integer/.test(sql));
t('SQL turno guarda calidad/resumen/entidades/firma PLAN',/memory_recallable boolean[\s\S]*memory_quality smallint[\s\S]*memory_summary text[\s\S]*memory_entities jsonb[\s\S]*memory_plan_signature jsonb/.test(sql));
t('turno recordable se calcula después de guardar respuesta real',/const rawTurn=publicTurn\(trow\),memory=memoryProjectionForTurn\(rawTurn\)/.test(ledger));
t('errores y ruido quedan fuera de memoria',/status==='KO'[\s\S]*action==='compile_error'[\s\S]*incoherent_input[\s\S]*voice noise/i.test(ledger));
t('operaciones puramente visuales quedan fuera',/show_table[\s\S]*compact_table[\s\S]*remove_field[\s\S]*clear_filters/.test(ledger));
t('resumen de turno tiene máximo 5 líneas',/\.filter\(Boolean\)\.slice\(0,5\)/.test(ledger));
t('memoria conserva pregunta literal y respuesta real',/userPrompt:turn\.userPrompt[\s\S]*answer:turn\.answer/.test(ledger));
t('firma operativa conserva targets/scope/filtros',/function memoryPlanSignature[\s\S]*sig\.targets[\s\S]*sig\.scope[\s\S]*purchase_status/.test(ledger));
t('índice de memoria es por usuario',/mkey\('index',uid\)/.test(ledger));
t('episodio es por conversation_id',/mkey\('episode',conversation\.conversationId\)/.test(ledger));
t('recuperación episodio filtra solo turnos recallable',/readZuzuMemoryEpisode[\s\S]*if\(!mem\.recallable\|\|Number\(mem\.quality\)<2\)continue/.test(ledger));
t('episodio se ordena de antiguo a reciente',/memoryTurns\.sort\(\(a,b\)=>Number\(a\.seq\)-Number\(b\.seq\)/.test(ledger));
t('hit se deduplica por conversación, no por turno',/const k=trim\(x\.conversationId\)\|\|x\.turnId/.test(ledger));
t('referencias temporales incluyen ayer/anteayer',/anteayer[\s\S]*ayer/.test(ledger));
t('referencias temporales incluyen mañana/tarde/noche',/madrugada[\s\S]*manana[\s\S]*tarde[\s\S]*noche/.test(ledger));
t('referencia año pasado por estas fechas',/ano\\s\+pasado[\s\S]*por\\s\+estas\\s\+fechas/.test(ledger));
t('búsqueda proactiva limitada a 4 días',/searchZuzuProactiveMemory[\s\S]*days=4/.test(ledger));
t('memoria social limitada a dos pistas',/searchZuzuSocialMemoryHints[\s\S]*Math\.min\(2/.test(ledger));
t('compiler conoce recall_episode/resume_episode',/recall_episode/.test(ai)&&/resume_episode/.test(ai));
t('CURRENT_CONTEXT conserva esquema cronológico del episodio retomado',/turn_outline:arr\(me\.turns\)\.slice\(0,24\)/.test(ai));
t('recuerdo explícito recupera conversación completa',/MEMORIA EPISÓDICA · RECALL/.test(ai)&&/readZuzuMemoryEpisode/.test(ai));
t('retomar no reejecuta automáticamente datos antiguos',/Conversación histórica retomada desde el principio[\s\S]*las cifras antiguas NO se convierten en datos actuales/.test(ai));
t('reexecute_plan se conserva para actualización actual',/reexecute_plan/.test(ai));
t('memoria proactiva se busca tras compilar consulta',/searchZuzuProactiveMemory/.test(ai)&&/MEMORIA ASOCIATIVA · SUGERENCIA PROACTIVA/.test(ai));
t('final writer anuncia recuerdo proactivo de forma humana',/Un momento[\s\S]*recuerdo que estuvimos hablando de algo de esto/.test(ai));
t('memoria social es opcional y máximo una alusión',/MEMORIA SOCIAL[\s\S]*como máximo UNA alusión breve/i.test(ai));
t('recuerdo histórico nunca se presenta como dato actual',/No mezcles esas cifras antiguas con datos actuales/i.test(ai));
t('recall/resume no inventan tabla ni gráfica',/action==='reference'&&\['recall_episode','resume_episode'\][\s\S]*table:false,chart:false/.test(ai));
t('CURRENT conserva dataset al recordar',/recall_episode','resume_episode'[\s\S]*carriesActiveDataset/.test(ai)||/carriesActiveDataset=[^;]*recall_episode[^;]*resume_episode/.test(ai));
t('traza registra si el turno entra o no en memoria',/MEMORIA EPISÓDICA · ALMACENAMIENTO/.test(ai));
t('arquitectura identificada como RAW14Q',/RAW14Q · MEMORIA EPISÓDICA \+ ASOCIATIVA \+ SOCIAL/.test(ai));

// Prueba funcional del parser temporal, extrayendo la función pura sin importar Supabase.
function extractFunction(src,name){const start=src.indexOf(`function ${name}(`)>=0?src.indexOf(`function ${name}(`):src.indexOf(`export function ${name}(`);if(start<0)throw new Error(name);const brace=src.indexOf('{',start);let d=0,q='',esc=false;for(let i=brace;i<src.length;i++){const c=src[i];if(q){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===q)q='';continue;}if(c==='"'||c==="'"||c==='`'){q=c;continue;}if(c==='{')d++;else if(c==='}'&&--d===0)return src.slice(start,i+1).replace(/^export\s+/,'');}throw new Error(name);}
try{
  const consts=ledger.slice(ledger.indexOf('const MEMORY_MONTHS='),ledger.indexOf('function memoryNumber'));
  const body=`const text=v=>v==null?'':String(v);const trim=v=>text(v).trim();const norm=v=>trim(v).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\\s+/g,' ').trim();${consts}\n${extractFunction(ledger,'memoryNumber')}\n${extractFunction(ledger,'memoryUtc')}\n${extractFunction(ledger,'memoryAddDays')}\n${extractFunction(ledger,'resolveZuzuMemoryTimeWindow')}\nreturn resolveZuzuMemoryTimeWindow;`;
  const fn=Function(body)();
  const ante=fn('Te acuerdas de lo de anteayer por la tarde','2026-08-26T10:00:00Z');
  t('parser temporal funcional: anteayer',ante&&ante.label.includes('anteayer')&&ante.label.includes('tarde'));
  const year=fn('lo del año pasado por estas fechas','2026-08-26T10:00:00Z');
  t('parser temporal funcional: año pasado',year&&year.label.includes('año pasado'));
}catch(e){console.error(e);t('parser temporal funcional',false);}

console.log(`\nRAW14Q MEMORIA EPISÓDICA · ${ok}/${ok+ko} comprobaciones OK`);if(ko)process.exit(1);
