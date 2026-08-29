const fs=require('fs');
const ai=fs.readFileSync('services/event-ai.service.js','utf8');
const ledger=fs.readFileSync('services/zuzu-conversation-ledger.service.js','utf8');
const voice=fs.readFileSync('public/app/features/v22-voz3-zuzu.js','utf8');
let ok=0,ko=0;function t(name,cond){if(cond){ok++;console.log('OK · '+name);}else{ko++;console.error('KO · '+name);}}
function segment(a,b){const i=ai.indexOf(a),j=ai.indexOf(b,i+1);return i>=0&&j>i?ai.slice(i,j):'';}
const tool=segment('function v415SemanticCoreTool(){','function v415SemanticCallToRaw');
const mapper=segment('function v415SemanticCallToRaw','function v73VoiceGateAssessment');
const compiler=segment('async function v73CompileTurn(','// v4_0_exp · ESCAPE LIBRE');
const run=segment('async function runZuzuV73Ledger(','// Entrada ÚNICA del turno Zuzu');
const final=segment('function v79RawFinalInstructionCompact()','function v73RawFinalInstruction()');

t('BANK4_15 declara Semantic Core compacto',ai.includes('BANK4_15 · SEMANTIC CORE COMPACTO')&&ai.includes("name:'ce_semantic_turn'"));
t('schema expone solo action + payload_json',tool.includes("required:['action','payload_json']")&&tool.includes('payload_json:{type:\'string\'')&&!tool.includes('scope_kind:')&&!tool.includes('people_mode:'));
t('schema no usa anyOf/oneOf ni objetos opcionales anidados',!tool.includes('anyOf')&&!tool.includes('oneOf')&&!tool.includes("type:'array'"));
t('action conserva las seis clases semánticas',tool.includes("enum:['query','local','set_context','reference','conversation','clarify']"));
t('payload_json se parsea genéricamente y action del sobre manda',mapper.includes('v73CompactJsonArg(envelope?.payload_json,{})')&&mapper.includes('const a={...payload,action}'));
t('payload se reutiliza con el conversor canónico',mapper.includes('v73CommandCallToRaw({name,arguments:a})'));
t('compilador activo usa solo tool compacta',compiler.includes('tools=[v415SemanticCoreTool()]')&&compiler.includes("allowed=['ce_semantic_turn']"));
t('compilador convierte con mapper BANK4_15',compiler.includes('v415SemanticCallToRaw(calls[0])'));
t('prompt obliga a dos argumentos de primer nivel',ai.includes('SIEMPRE solo dos argumentos de primer nivel: action y payload_json'));
t('prompt mantiene NHC semántico',ai.includes('Cambiar una palabra manteniendo el significado debe producir el mismo marco semántico'));
t('CE no vuelve a usar reparadores lingüísticos antiguos',!run.includes('v76ApplyFocusBindings(compiled.plan')&&!run.includes('v413RepairSubjectEllipsis(normalizedPlan')&&!run.includes('v413RepairFeedbackOnly(normalizedPlan'));
t('memoria recibe más margen sin ser autoridad semántica',run.includes('MEMORY EVIDENCE GATE')&&run.includes('}),1200)')&&run.includes('searchZuzuHistoryCandidates'));
t('respuesta humana sigue prohibiendo call-center',final.includes('Prohibidas las coletillas de call-center')&&final.includes('No pidas al usuario que recuerde el tema'));
t('entretenimiento Ummm se conserva',voice.includes("'Ummm...................'")&&voice.includes("return 'Ummm...................';"));
t('entretenimiento Calla/besitos se conserva',voice.includes("'Calla............... ya lo tengo....., besitos muá.'"));
t('recuerdos de recuerdos siguen excluidos',ledger.includes("['recall_turn','recall_episode','resume_episode','restore_snapshot'].includes(refAction)"));
t('fallo de ejecución no pasa a redacción alucinada',run.includes('KO SIN ALUCINACIÓN FINAL'));
console.log(`\nBANK4_15 COMPACT SEMANTIC SCHEMA: ${ok} OK / ${ko} KO`);if(ko)process.exit(1);
