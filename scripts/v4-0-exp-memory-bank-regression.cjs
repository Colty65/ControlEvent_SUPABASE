const fs=require('fs');
const path=require('path');
const ai=fs.readFileSync('services/event-ai.service.js','utf8');
const bank=fs.readFileSync('services/bank-reconciliation.service.js','utf8');
const ui=fs.readFileSync('public/app/features/v24-cuadre-banco.js','utf8');
const voice=fs.readFileSync('public/app/features/v22-voz3-zuzu.js','utf8');
const version=fs.readFileSync('public/app/version.js','utf8');
const paths=fs.readFileSync('server/paths.js','utf8');
const html=fs.readFileSync('public/index.html','utf8');
const exportRoutes=fs.readFileSync('routes/export.routes.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
let ok=0,total=0;function t(n,c){total++;if(c){ok++;console.log('OK · '+n);}else{console.error('KO · '+n);process.exitCode=1;}}

t('selector bancario solo eventos En curso',/\^EN\\s\+CURSO\$/.test(bank)&&/scope:'in_progress_events_only'/.test(bank));
t('selector bancario ordena importe descendente',/sort:'amount_desc'/.test(bank)&&/num\(b\.amount\)-num\(a\.amount\)/.test(bank));
t('UI explica que solo enseña En curso',/Buscar TKxx En curso/.test(ui)&&/No hay TKxx pagados en eventos En curso/.test(ui));
t('UI protege vínculos ocultos finalizados al guardar',/editableKeys=new Set\(store\.tickets/.test(ui)&&/editableKeys\.has\(link\.key\)/.test(ui));
t('RAW14W multievento sigue presente',/CUADRADO_COMPARTIDO|shared/i.test(bank)&&/eventAppliedAmount/.test(bank));

t('borrador manual tiene storage propio v4',/manualDraft:'ce_zuzu_manual_draft_v4'/.test(voice));
t('primer carácter humano toma propiedad del borrador',/manualDraftOwned=true;storeManualDraft\(v\)/.test(voice));
t('callbacks programáticos no pueden sobreescribir borrador humano',/if\(state\.manualDraftOwned&&!force\)return false/.test(voice));
t('Borra texto puede limpiar de forma explícita',/clearDraftBuffer\(true\)/.test(voice));
t('micro no se rearma encima de texto manual',/if\(state\.manualDraftOwned\)\{setVoicePhase\('MANUAL_DRAFT'/.test(voice));

t('MEMORY EVIDENCE existe',/function v77MemoryEvidence/.test(ai)&&/Pista del recuerdo/.test(ai));
t('evidencia muestra pregunta y respuesta históricas',/Tú me preguntaste/.test(ai)&&/Y yo te respondí/.test(ai));
t('MEMORY ANCHOR conserva conversation y turn',/memory_anchor/.test(ai)&&/conversation_id/.test(ai)&&/turn_id/.test(ai));
t('conversación completa es literal y marca el match',/function v77MemoryTranscript/.test(ai)&&/queda marcado con ★/.test(ai));
t('replay por tramos existe y pausa antes de cambio',/function v77MemorySegments/.test(ai)&&/MEMORY REPLAY/.test(ai)&&/Di «sigue»/.test(ai));
t('sigue avanza por next_turn/segment',/v77MemoryContinueIntent/.test(ai)&&/next_segment_index/.test(ai)&&/next_turn_id/.test(ai));
t('sí esa vuelve a respuesta histórica por defecto',/v77MemoryConfirmationIntent/.test(ai)&&/memory_literal',field:'answer'/.test(ai));
t('ahora reejecuta PLAN histórico',/v77MemoryNowIntent/.test(ai)&&/current_reexecution:true/.test(ai));
t('comparar entonces/ahora está tipado',/v77MemoryCompareIntent/.test(ai)&&/HISTORICAL_VS_CURRENT/.test(ai)&&/v77ThenNowSummary/.test(ai));
t('procedencia histórica/actual viaja al presenter',/memory_anchor','memory_replay','data_provenance','memory_compare'/.test(ai));
t('presenter prohíbe confundir histórico con actual',/PROCEDENCIA DE MEMORIA AUTORITATIVA/.test(ai)&&/HISTORICAL_SNAPSHOT/.test(ai)&&/CURRENT_REEXECUTION/.test(ai));
t('recuerdo explícito no se secuestra por CURRENT actual',/CURRENT descartado como autorrecuerdo/.test(ai));

t('coverage crea cápsula narrativa obligatoria',/coverage_narrative_required/.test(ai)&&/cápsula mínima OBLIGATORIA/.test(ai));
t('coverage limita documentos para token budget',/document_context\)\.length>6/.test(ai)&&/documents:docs/.test(ai));

t('server version v4',/APP_VERSION = 'ControlEvent v4_0_exp'/.test(paths)&&/APP_VERSION_FILE = 'ControlEvent_v4_0_exp'/.test(paths));
t('build v4 actualizado',/20260827-V4_0_EXP-MEMORY-FLASHBACK-BANK2/.test(paths)&&/20260827-V4_0_EXP-MEMORY-FLASHBACK-BANK2/.test(version));
t('HTML visible v4',/<title>ControlEvent v4_0_exp<\/title>/.test(html)&&/>v4_0_exp<\/span>/.test(html));
t('package v4',pkg.name==='controlevent-v4-0-exp'&&pkg.version==='4.0.0-exp.0');
t('BACKUP servidor v4',/BACKUP_VERSION = 'ControlEvent v4_0_exp'/.test(exportRoutes)&&/BACKUP_VERSION_FILE = 'ControlEvent_v4_0_exp'/.test(exportRoutes));
t('INFOEVENTO activo usa VERSION_FILE v4',/VERSION_FILE = 'ControlEvent_v4_0_exp'/.test(fs.readFileSync('public/app/features/v40-fixes.js','utf8'))&&/\$\{VERSION_FILE\}_INFOEVENTO/.test(fs.readFileSync('public/app/features/v40-fixes.js','utf8')));
t('versión central conserva migración desde v3',/legacyPrefixes = \['ControlEvent_v3_0_exp'/.test(version));

console.log(`\nV4.0_exp · MEMORY FLASHBACK + BANK TK EN CURSO · ${ok}/${total} comprobaciones OK`);
if(ok!==total)process.exitCode=1;
