const fs=require('fs');
const ledger=fs.readFileSync('services/zuzu-conversation-ledger.service.js','utf8');
const ai=fs.readFileSync('services/event-ai.service.js','utf8');
const sql=fs.readFileSync('sql/ce_zuzu_memory_raw14t.sql','utf8');
let ok=0,ko=0;function t(n,c){if(c){console.log('OK · '+n);ok++;}else{console.error('KO · '+n);ko++;}}

t('RAW14T declara tablas como única fuente histórica',/MEMORIA HISTÓRICA: fuente única = tablas persistentes/.test(ledger)&&/NUNCA aporta recuerdos/.test(ledger));
t('índice histórico no lee ce_meta',/async function memoryIndexItemsForUser[\s\S]*No se consulta ce_meta[\s\S]*from\(T_CONV\)[\s\S]*from\(T_TURN\)/.test(ledger));
t('updateHistoryIndex ya no persiste índice de memoria en ce_meta',/async function updateHistoryIndex\(\)[\s\S]*NO escribimos índice de recuerdos en ce_meta[\s\S]*return;/.test(ledger));
t('episodio histórico se lee solo desde tablas',/readZuzuMemoryEpisode[\s\S]*conversation=await tableGetConversation\(id\)[\s\S]*turns=await tableListTurns\(id,limit\)/.test(ledger));
t('si faltan tablas, memoria devuelve vacío',/FUENTE ÚNICA[\s\S]*if\(isMissingTable\(error\)\|\|isMissingColumn\(error\)\)return\[\]/.test(ledger));
t('candidatos transportan memory_source db',/memory_source:'db'/.test(ledger)&&/memory_source:trim\(x\.memory_source\)\|\|'db'/.test(ai));
t('traza identifica DB persistente',/MEMORIA EPISÓDICA · FUENTE[\s\S]*DB persistente/.test(ai));

t('orden natural joven a viejo con excepción contextual',/Comportamiento humano: normalmente recordamos de lo más joven a lo más viejo/.test(ledger)&&/semanticMargin=preferRecent\?2\.25:1\.25/.test(ledger));
t('búsquedas recientes exigen mayor ventaja semántica para saltarse recencia',/compareMemoryCandidates\(a,b,broadRecent\|\|topicTerms\.length===0\)/.test(ledger));
t('prompt explica fecha orienta y contexto identifica',/MÁS JOVEN a MÁS VIEJO[\s\S]*La fecha orienta y el contexto identifica/.test(ai));
t('episodio elegido se sigue reconstruyendo inicio a fin',/Te reconstruyo el hilo de más antiguo a más reciente/.test(ai));

t('visibilidad nace private en código',/memoryVisibility:trim\(r\.memory_visibility\)\|\|'private'/.test(ledger)&&/visibility:'private'/.test(ledger));
t('SQL añade visibilidad a conversación y turno',/ce_zuzu_conversations[\s\S]*memory_visibility text not null default 'private'/.test(sql)&&/ce_zuzu_turns[\s\S]*memory_visibility text not null default 'private'/.test(sql));
t('RAW14T no habilita memoria cruzada',/no habilita lectura cruzada entre usuarios/.test(sql)&&/Nunca mezcles ni reveles conversaciones de usuarios distintos/.test(ai));

t('huella de experiencia se persiste como JSON',/memory_experience_signature:memory\.experienceSignature\|\|\{\}/.test(ledger)&&/memory_experience_signature jsonb/.test(sql));
t('huella usa estructura y roles, no valores de entidades',/const shape=\{[\s\S]*domains,scope_kind:[\s\S]*entity_roles:entityRoles[\s\S]*operation_types:operations/.test(ledger));
t('huella declara exclusión de PERSON EVENT STORE PRODUCT literal',/nunca QUIÉN la hizo[\s\S]*PERSON\/EVENT\/STORE\/PRODUCT/.test(ledger));
t('huella tiene shape_id estable',/shape_id:fingerprint\(shape\)/.test(ledger));
t('huella no toma userPrompt ni answer dentro de memoryExperienceSignature',(()=>{const a=ledger.indexOf('function memoryExperienceSignature('),b=ledger.indexOf('export function deriveZuzuExperienceSignature',a),x=ledger.slice(a,b);return !/userPrompt|\.answer\b/.test(x);})());
t('huella no toma valores literales de entidades',(()=>{const a=ledger.indexOf('function memoryExperienceSignature('),b=ledger.indexOf('export function deriveZuzuExperienceSignature',a),x=ledger.slice(a,b);return !/\.value\b|scope\.event|people\]|stores\]|product\.text/.test(x);})());

t('arquitectura final conserva Memory Core en RAW14U',/RAW14U · TOKEN BUDGET \+ CONTEXTO ESTRICTO/.test(ai)&&/CANDIDATOS TIPADOS RAW14U/.test(ai));

console.log(`\nRAW14T MEMORY CORE / EXPERIENCIA SEMILLA · ${ok}/${ok+ko} comprobaciones OK`);if(ko)process.exit(1);
