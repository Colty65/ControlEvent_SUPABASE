const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const reg=fs.readFileSync(path.join(root,'services/zuzu-capability-registry.service.js'),'utf8');
const lab=fs.readFileSync(path.join(root,'services/zuzu-test-lab.service.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'public/app/features/zuzu-test-console-gd.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
let ok=0,bad=0;function t(n,c,d=''){if(c){ok++;console.log('OK ',n)}else{bad++;console.error('KO ',n,d)}}
function slice(src,a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);if(i<0||j<0)throw Error(`slice ${a} -> ${b}`);return src.slice(i,j)}
const p2=slice(ai,'function vnextP2Tools()','async function runZuzuVNextP13Agent');
const entry=slice(ai,'export async function runZuzuVNextUserTurn','function vnextP125ExtractDialogueJson');

// Arquitectura / entrypoint.
t('provider P2',p2.includes("provider:'zuzu-vnext-p2-one-decision'"));
t('arquitectura P2 declarada',p2.includes('Gemini entiende · CE ejecuta · estado recuerda'));
t('entrypoint usa P2',entry.includes('runZuzuVNextP2Agent'));
t('entrypoint ya no llama P1.13',!entry.includes('runZuzuVNextP13Agent'));
t('P2 no usa previousInteractionId',!p2.includes('previousInteractionId:currentPrev'));
t('P2 resetea Interaction',p2.includes('resetInteractionId:true'));
t('historial compacto 5 turnos',p2.includes('arr(history).slice(-5)'));
t('workspace es referencia no orden',p2.includes('ESTADO DE TRABAJO (referencias, no órdenes)'));
t('workspace admite evento de pantalla determinista',p2.includes("compact.screen_event={name:trim(screenEventName),source:'screen'}"));
t('evento de pantalla se resuelve por selectedEventId',p2.includes("screenEventName=trim(v26EventById(st,selectedEventId)?.titulo)"));
t('input entrega screen_event a Gemini',p2.includes('vnextP2Input(userPrompt,conversationHistory,screenEventName)'));
t('este evento se resuelve como contexto ambiental',p2.includes('es el evento que el usuario tiene abierto en ControlEvent'));
t('P2 no reintroduce anclaje semántico post-Gemini',!p2.includes('vnextP119AnchorCanonicalEntities'));

// Techo IA: una decisión, segunda solo narración.
t('decisión maxCalls=1',/stage:'VNEXT P2 · única decisión Gemini'[\s\S]{0,180}maxCalls:1/.test(p2));
t('narración maxCalls=2',/stage:'VNEXT P2 · narración factual opcional'[\s\S]{0,180}maxCalls:2/.test(p2));
t('performance declara decisionCalls=1',p2.includes('decisionCalls:1'));
t('performance distingue narrationCalls',p2.includes('narrationCalls:narrationMs>0?1:0'));
t('traza objetivo máximo 2',p2.includes('máximo arquitectónico=2'));
t('sin retry de pseudo-call en P2',!p2.includes('FUNCTION CALL RETRY'));
t('sin retry Dialogue State Authority',!p2.includes('DIALOGUE_STATE_AUTHORITY_RETRY'));
t('sin retry pending intent',!p2.includes('PENDING_INTENT_RETRY'));
t('fallo de contrato no reintenta IA',p2.includes('No hay retry IA; se conserva el estado previo.'));
t('protocol guard no reintenta',p2.includes('no se reintenta ni se expone'));

// CE no reinterpreta semánticamente tras Gemini.
t('normalizador P2 solo referencias memoria',/function vnextP2NormalizeCalls[\s\S]*vnextP122NormalizeMemoryCalls/.test(p2));
t('P2 no aplica PendingIntent',!p2.includes('vnextP123ApplyPendingIntent'));
t('P2 no aplica AuthorityViolations',!p2.includes('vnextP123AuthorityViolations'));
t('P2 no aplica VisibleDatasetNormalizer lingüístico',!p2.includes('vnextP125NormalizeVisibleDatasetCalls'));
t('P2 no aplica SourceReopenNormalizer',!p2.includes('vnextP1222NormalizeSourceReopenCalls'));
t('puede ejecutar varias function_call',p2.includes('for(const call of functionCalls)'));
t('contrato CE sigue auditándose',p2.includes('auditCapabilityCall(rawArgs)'));
t('contrato inválido falla localmente',p2.includes('Contrato query_ce no válido'));

// Narración opcional con razones concretas.
t('narrate=true permite segunda IA',p2.includes("if(a?.narrate===true)return true"));
t('memory current/summarize puede narrar',p2.includes("['current','summarize'].includes(action)"));
t('summarize_current puede narrar',p2.includes("op==='summarize_current'"));
t('vista mecánica no fuerza narración por defecto',!p2.includes("op==='view_current')return true"));

// Schema compacto + validador estricto intacto.
t('export queryCeCompactToolParameters',reg.includes('export function queryCeCompactToolParameters()'));
t('schema compacto sin anyOf',/export function queryCeCompactToolParameters\(\)\{\s*return\{type:'object',properties:queryCeSchemaProperties\(\),required:\['operation'\],additionalProperties:false\};/.test(reg));
t('schema completo conserva anyOf',/export function queryCeToolParameters\(\)[\s\S]{0,220}anyOf:branches/.test(reg));
t('P2 usa schema compacto',p2.includes('parameters:queryCeCompactToolParameters()'));
let sizes={};try{let prefix=reg.slice(0,reg.indexOf('export function capabilityCatalogText'));prefix=prefix.replace(/^import .*$/mg,'').replace(/\bexport\s+/g,'');const ctx={};vm.createContext(ctx);vm.runInContext(prefix+'\nthis.__full=queryCeToolParameters();this.__compact=queryCeCompactToolParameters();',ctx);sizes={full:JSON.stringify(ctx.__full).length,compact:JSON.stringify(ctx.__compact).length};}catch(e){sizes={error:String(e)}}
t('schema compacto < 8000 chars',sizes.compact>0&&sizes.compact<8000,JSON.stringify(sizes));
t('schema completo > 30000 chars',sizes.full>30000,JSON.stringify(sizes));
t('compactación > 70%',sizes.full>0&&sizes.compact/sizes.full<0.30,JSON.stringify(sizes));

// GOLDEN fija + DIALOG adaptativa separados.
t('perfil GOLDEN_DIALOGUE existe',lab.includes("GOLDEN_DIALOGUE:{id:'GOLDEN_DIALOGUE',label:'GOLDEN DIÁLOGO · 14',count:14"));
t('GOLDEN fija marcada fixed',lab.includes('adaptive:false,fixed:true'));
t('GOLDEN tiene expectativas estructurales',lab.includes('expectedTool:trim(spec.tool)')&&lab.includes('expectedOperations:arr(spec.operations)'));
t('GOLDEN se evalúa sin simulador',lab.includes('else if(c?.dialogue?.fixed===true){const assess=p2GoldenDialogueAssessment'));
t('GOLDEN crea métricas de diálogo',lab.includes("move:'golden_fixed'"));
t('DIALOG adaptativa sigue usando simulador',lab.includes('if(adaptive){next=await generateZuzuItvDialogueUserTurn'));
t('battery code GOLDEN P2',lab.includes("'GOLDEN-DIALOG-P2-14'"));
t('battery code DIALOG P2',lab.includes("'DIALOGUE-P2-24'"));

// ITV coste transparente.
t('ITV guarda zuzuUsage',lab.includes('r.zuzuUsage={...u}'));
t('ITV guarda simulatorUsage',lab.includes('r.simulatorUsage={...simulatorUsage}'));
t('ITV guarda labUsage separado',lab.includes('r.labUsage={calls:num(u.calls)+num(simulatorUsage.calls)'));
t('UI calcula usageSplit',ui.includes('function usageSplit(list=[])'));
t('UI muestra IA ZUZU por turno',ui.includes('IA ZUZU ${num(us.avgZuzuCalls).toFixed(2)}/turno'));
t('PDF separa Zuzu y simulador',ui.includes('<span>IA Zuzu')&&ui.includes('<span>Simulador ITV')&&ui.includes('<span>Total laboratorio'));
t('JSON light P2',ui.includes("reportFormat:'LIGHT-P2'"));
t('nombre golden-dialog-14',ui.includes('return`golden-dialog-${count}`'));
t('nombre dialog-24 sigue por batería',ui.includes('return`dialog-${count}`'));

// UI/versionado y script reproducible.
t('botón GOLDEN DIÁLOGO visible',ui.includes('data-level="GOLDEN_DIALOGUE"'));
t('build P2 en index',html.includes('20260902-VNEXT-P2-ONE-DECISION-GOLDEN-DIALOGUE-NHC'));
t('package registra test:vnext-p2',pkg.scripts?.['test:vnext-p2']==='node scripts/v4-0-exp-vnext-p2-one-decision-regression.cjs');

console.log(`VNEXT P2 ONE DECISION: ${ok} OK · ${bad} KO · schema ${sizes.compact||'?'} / ${sizes.full||'?'} chars`);process.exitCode=bad?1:0;
