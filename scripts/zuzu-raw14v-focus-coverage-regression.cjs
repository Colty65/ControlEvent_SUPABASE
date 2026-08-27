const fs=require('fs');
const ai=fs.readFileSync('services/event-ai.service.js','utf8');
let ok=0,total=0;function t(name,cond){total++;if(cond){ok++;console.log('OK · '+name);}else{console.error('KO · '+name);process.exitCode=1;}}

t('arquitectura RAW14V',/RAW14V · DISCOURSE \+ MEMORY FOCUS \+ EVENT COVERAGE/.test(ai));
t('stores_used existe como dominio',/stores_used/.test(ai)&&/stores_used = tiendas\/proveedores donde EXISTEN compras realizadas/.test(ai));
t('stores_used usa compras reales',/if\(d==='stores_used'\)return'event_purchase_lines'/.test(ai));
t('stores_used fuerza compras realizadas',/if\(d==='stores_used'\)\{filters\.purchase_status='realized';filters\.purchase_statuses=\['realized'\]/.test(ai));
t('stores_used agrupa por tienda e importe',/defaultGroup=d==='stores_used'\?\['Tienda'\]/.test(ai)&&/defaultMetrics=d==='stores_used'\?\['sum:Importe','count'\]/.test(ai));
t('catálogo y tiendas usadas quedan separados en presentación',/domain=stores_used significa tiendas realmente utilizadas/.test(ai)&&/catalog_stores\/stores significa catálogo maestro/.test(ai));

t('MEMORY_FOCUS independiente de CURRENT',/function v76MemoryFocus/.test(ai)&&/MEMORY FOCUS PERSISTENTE/.test(ai));
t('MEMORY_FOCUS conserva esquema del episodio',/turn_outline:arr\(me\.turns\)\.slice\(0,16\)/.test(ai));
t('CURRENT de memoria se liga al memory anchor/matched_turn',/anchorTurn=trim\(ma\?\.turn_id\|\|mf\?\.matched_turn_id\)/.test(ai)&&/out\.reference\.target_ref=anchorTurn/.test(ai));
t('todo esto asciende a reexecute_episode',/out\.reference\.action='reexecute_episode'/.test(ai));
t('reexecute_episode es acción tipada',/reexecute_episode/.test(ai)&&/v76ReexecuteEpisode/.test(ai));
t('episodio reejecuta PLAN distintos con datos actuales',/Reejecutados \$\{okCount\} PLAN distintos del episodio/.test(ai)&&/No se reutilizan cifras históricas/.test(ai));

t('recall_turn es acción tipada',/recall_turn/.test(ai)&&/v76MemoryLiteralAnswer/.test(ai));
t('qué pregunté/qué respondiste usa recuerdo literal',/memory_literal/.test(ai)&&/local_authoritative_presentation:true/.test(ai));
t('recuerdo literal evita llamada final Gemini',/compiled\.local_compile\|\|execution\?\.local_authoritative_presentation===true/.test(ai));
t('referencias de memoria no inventan artefactos',/\['recall_episode','resume_episode','recall_turn','reexecute_episode'\]/.test(ai)&&/table:false,chart:false/.test(ai));

t('DISCOURSE_FOCUS existe separado',/function v76DiscourseFocus/.test(ai)&&/function v76NextDiscourseFocus/.test(ai));
t('pronombre de persona se inyecta en people',/if\(d==='people'\)q\.people=\[trim\(df\.subject\)\]/.test(ai));
t('pronombre de persona se inyecta en compras/donaciones',/d==='purchases'\)q\.responsible=trim\(df\.subject\)/.test(ai)&&/d==='donations'\)q\.donor=trim\(df\.subject\)/.test(ai));
t('foco se persiste antes de presentación',/execution=\{\.\.\.\(execution\|\|\{\}\),discourse_focus:nextFocus\}/.test(ai));
t('nuevo tema explícito puede limpiar memory focus',/memory_focus_clear:true/.test(ai));

t('resumen local general no secuestra entidad explícita',/currentConversationRecall&&!arr\(entityCandidates\?\.flat\)\.length/.test(ai));

t('EVENT COVERAGE ENGINE existe',/function v76EventCoverageProfile/.test(ai)&&/EVENT COVERAGE ENGINE/.test(ai));
t('coverage base siempre core narrative documents',/const facets=\['core','narrative','documents'\]/.test(ai));
t('coverage tiene broad contextual full',/mode='contextual'/.test(ai)&&/mode='full'/.test(ai)&&/mode='broad'/.test(ai));
t('contexto compras prioriza purchases finance',/purchases:\['purchases','finance'\]/.test(ai));
t('contexto personas prioriza people',/people:\['people'\]/.test(ai));
t('event_summary poda arrays según coverage',/v76EventCoverageFacts\(rawFacts,plan\?\.query\?\.coverage/.test(ai));
t('documentos se limitan para token budget',/document_context\)\.length>6/.test(ai));
t('tickets/highlights se limitan para token budget',/purchase_ticket_context\)\.length>6/.test(ai)&&/purchase_highlights\)\.length>7/.test(ai));
t('final obliga narrativa Description DOCxx en pregunta general',/CORE\/NARRATIVE\/DOCUMENTS son la base humana/.test(ai)&&/Descripción y los DOCxx\/comentarios/.test(ai));

t('corrección conversacional no finge mutación',/CORRECCIONES NO SON MUTACIONES/.test(ai)&&/Una observación del usuario no altera la BBDD/.test(ai));
t('foco, ancla, replay y coverage viajan a resultado final',/discourse_focus','memory_focus','memory_anchor','memory_replay','data_provenance','memory_compare','event_coverage','episode_reexecution','literal_memory_turn/.test(ai));

console.log(`\nRAW14V FOCO/MEMORIA/COVERAGE · ${ok}/${total} comprobaciones OK`);if(ok!==total)process.exitCode=1;
