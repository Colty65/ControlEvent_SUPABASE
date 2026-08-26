const fs=require('fs');
const ledger=fs.readFileSync('services/zuzu-conversation-ledger.service.js','utf8');
const ai=fs.readFileSync('services/event-ai.service.js','utf8');
let ok=0,ko=0;function t(n,c){if(c){console.log('OK · '+n);ok++;}else{console.error('KO · '+n);ko++;}}

t('memoria histórica RAW14T no usa índice ce_meta',/FUENTE ÚNICA[\s\S]*No se consulta ce_meta/.test(ledger));
t('memoria lee conversaciones persistentes recientes',/order\('updated_at',\{ascending:false\}\)\.limit\(240\)/.test(ledger)&&/from\(T_TURN\)/.test(ledger));
t('memoria se deduplica por turn_id y conserva ventana amplia',/seen\.has\(id\)[\s\S]*out\.length>=2000/.test(ledger));
t('reproyección actualiza recuerdos con reglas vigentes',/recomputed=memoryProjectionForTurn\(turn\)[\s\S]*stored=/.test(ledger));
t('tags semánticos incluyen people/responsibles/donors/stores/tickets',/\['person','people'\][\s\S]*\['responsible','responsibles'\][\s\S]*\['donor','donors'\][\s\S]*\['store','stores'\][\s\S]*\['ticket','tickets'\]/.test(ledger));
t('tags de memoria se deduplican',/const deduped=\[\],seen=new Set\(\)/.test(ledger));

t('ventana temporal reconoce hace unos minutos',/hace\\s\+unos\?\\s\+minutos/.test(ledger)&&/label:'hace un rato'/.test(ledger));
t('ventana temporal reconoce hace unas horas',/hace\\s\+unas\?\\s\+horas/.test(ledger)&&/label:'hace unas horas'/.test(ledger));
t('ventana temporal reconoce últimamente/recientemente/hace poco',/ultimamente\|recientemente\|hace\\s\+poco/.test(ledger)&&/label:'últimamente'/.test(ledger));
t('recall reconoce recuerdo/recordado sin abrir por la palabra memoria aislada',/recordad\[oa\]\|recuerdos\?/.test(ledger)&&!/recordad\[oa\]\|memoria\|recuerdos\?/.test(ledger));
t('recall reconoce hemos hablado hace unos minutos',/hemos\\s\+\(\?:hablado/.test(ledger)&&/minutos\?\|horas\?\|rato/.test(ledger));
t('vuelve a revisarla ya no es disparador genérico de memoria',!/\(\?:vuelve\|volvamos\|volver\|retoma\)\\s\+a\(\?:\\s\+lo\\s\+de\)\?/.test(ledger)&&/vuelve a revisarla/.test(ledger));
t('búsqueda reciente da bonus por recencia',/broadRecent[\s\S]*0\.95-daysAgo/.test(ledger));
t('fallback explícito mira una ventana amplia de recuerdos DB',/items\.slice\(0,120\)/.test(ledger));

t('proactividad suma más peso a entidad y recencia',/Math\.min\(2,overlap\)\*1\.45\+recencyBoost/.test(ledger));
t('proactividad tiene umbral más abierto en horas y pocos días',/age<=0\.34\?2\.25:age<=4\?2\.55:age<=180\?3\.6:4\.5/.test(ledger));
t('bromas temporales siguen usando usuario',/Vaya cabecita que tienes \$\{u\}/.test(ledger)&&/se te ha ido un poco la olla/.test(ledger)&&/Yo lo tengo fresco \$\{u\}/.test(ledger));

t('compactado proactivo conserva human_intro',/mode==='proactive'\?\{age_band:trim\(episode\.age_band\)[\s\S]*human_intro:trim\(episode\.human_intro\)/.test(ai));
t('compactado proactivo conserva match y edad',/age_days:Number\(episode\.age_days\)[\s\S]*match:\{turn_id:trim\(me\.turn_id\)[\s\S]*entity_overlap/.test(ai));
t('guard rechaza IDs de entidad como recuerdo',/function v73MemoryReferenceViolation[\s\S]*\^id\[-_\][\s\S]*ID de entidad/.test(ai));
t('guard de memoria forma parte del protocolo de compilación',/v73MemoryReferenceViolation\(raw,historyCandidates\)/.test(ai));
t('prompt prohíbe usar entidad como target_ref',/target_ref NUNCA puede ser el ID de una PERSON\/EVENT\/STORE\/PRODUCT/.test(ai));
t('prompt distingue revisar CURRENT de recordar pasado',/Vuelve a revisarla[\s\S]*NO abrir memoria histórica/.test(ai));
t('detalle de esa conversación vuelve al episodio recordado',/dame detalle de esa conversación[\s\S]*reference_action=\"recall_episode\"/.test(ai));
t('meta-memoria comprensible no es VOICE_NOISE',/META-CONVERSACIÓN[\s\S]*has recuperado de la memoria[\s\S]*NUNCA VOICE_NOISE/.test(ai));
t('arquitectura RAW14S preservada dentro de RAW14T',/RAW14T · MEMORY CORE DB \+ EXPERIENCIA SEMILLA \+ PROACTIVA HUMANA/.test(ai)&&/CANDIDATOS TIPADOS RAW14T/.test(ai));

function extractFunction(src,name){const start=src.indexOf(`function ${name}(`)>=0?src.indexOf(`function ${name}(`):src.indexOf(`export function ${name}(`);if(start<0)throw new Error(name);const brace=src.indexOf('{',start);let d=0,q='',esc=false;for(let i=brace;i<src.length;i++){const c=src[i];if(q){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===q)q='';continue;}if(c==='"'||c==="'"||c==='`'){q=c;continue;}if(c==='{')d++;else if(c==='}'&&--d===0)return src.slice(start,i+1).replace(/^export\s+/,'');}throw new Error(name);}
try{
  const consts=ledger.slice(ledger.indexOf('const MEMORY_MONTHS='),ledger.indexOf('function memoryNumber'));
  const body=`const text=v=>v==null?'':String(v);const trim=v=>text(v).trim();const norm=v=>trim(v).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\\s+/g,' ').trim();${consts}\n${extractFunction(ledger,'memoryNumber')}\n${extractFunction(ledger,'memoryUtc')}\n${extractFunction(ledger,'memoryAddDays')}\n${extractFunction(ledger,'resolveZuzuMemoryTimeWindow')}\n${extractFunction(ledger,'isRecallPrompt')}\nreturn {resolveZuzuMemoryTimeWindow,isRecallPrompt};`;
  const f=Function(body)();
  const mins=f.resolveZuzuMemoryTimeWindow('Hemos estado hablando hace unos minutos de Esther','2026-08-26T17:00:00Z');
  t('funcional: hace unos minutos = ventana reciente',mins&&mins.label==='hace un rato'&&(mins.endMs-mins.startMs)<=7200000);
  const recent=f.resolveZuzuMemoryTimeWindow('Recuérdame de qué hemos hablado últimamente','2026-08-26T17:00:00Z');
  t('funcional: últimamente = 7 días',recent&&recent.label==='últimamente'&&Math.round((recent.endMs-recent.startMs)/86400000)===7);
  t('funcional: revisarla no abre memoria',f.isRecallPrompt('Creo que esta información no es correcta, vuelve a revisarla.')===false);
  t('funcional: hace minutos sí abre memoria',f.isRecallPrompt('Pues hemos estado hablando hace unos minutos. Revísalo bien.')===true);
  t('funcional: corrección sobre recuerdo sí abre memoria',f.isRecallPrompt('Has recordado aquí que había cosas de Esther, asegúrate bien y búscalo.')===true);
  t('funcional: comentario sobre prueba de memoria no abre búsqueda histórica',f.isRecallPrompt('Vale, no sé si es suficiente la prueba de memoria.')===false);
  t('funcional: esa conversación sí mantiene el modo recuerdo',f.isRecallPrompt('Dame detalle de esa conversación.')===true);
}catch(e){console.error(e);t('funciones puras memoria RAW14S',false);}

console.log(`\nRAW14S MEMORIA FIABLE/PROACTIVA · ${ok}/${ok+ko} comprobaciones OK`);if(ko)process.exit(1);
