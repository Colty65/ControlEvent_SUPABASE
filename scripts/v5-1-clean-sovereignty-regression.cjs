const fs=require('fs');
const src=fs.readFileSync('services/event-ai.service.js','utf8');
const start=src.indexOf('async function runZuzuBrainLiteAgentCore');
const end=src.indexOf('// FIX45',start);
if(start<0||end<0)throw new Error('No se localiza la ruta soberana Brain-Lite');
const core=src.slice(start,end);
const checks=[];
const t=(name,ok,detail='')=>checks.push({name,ok,detail});
const forbidden=[
  'v4BrainLitePromptSemantics(',
  'v5PromptRouteSignals(',
  'v5ExplicitFactualDomain(',
  'v5P11AllViewsCue(',
  'v5ContinuationAddsOperations(',
  'v5ChartRequestOnly(',
  'v4BrainLiteComposeLocal(',
  '_user_prompt'
];
for(const token of forbidden)t(`ruta soberana no usa ${token}`,!core.includes(token));
const execStart=src.indexOf('function v5P15ExecutionArgsFromFrozenAction');
const execEnd=src.indexOf('function v5P15FreezePlan',execStart);
const exec=src.slice(execStart,execEnd);
t('ejecución no reinyecta texto humano',!exec.includes('exec._user_prompt'));
const selectStart=src.indexOf('function v5SelectContextFromBook');
const selectEnd=src.indexOf('function v5ConversationFrameFromHistory',selectStart);
const select=src.slice(selectStart,selectEnd);
t('selector de contexto no recibe prompt',select.includes('function v5SelectContextFromBook(book={})'));
t('selector de contexto no clasifica lenguaje',!select.includes('v5PromptRouteSignals')&&!/\.test\(/.test(select));
const frameStart=src.indexOf('function v5FrameAfterTurn');
const frameEnd=src.indexOf('function v5AttachResponseAndViews',frameStart);
const frame=src.slice(frameStart,frameEnd);
t('commit posterior no recibe prompt',frame.includes('function v5FrameAfterTurn(prev={},plan={},good=[],resultContext={})'));
t('commit posterior no reclasifica lenguaje',!frame.includes('v5PromptRouteSignals')&&!frame.includes('v4BrainLitePromptSemantics')&&!frame.includes('v5ContinuationAddsOperations'));
t('JSON inválido no usa reparador regex en planner soberano',!src.slice(src.indexOf('async function v4BrainLitePlan'),src.indexOf('function v5P15CloneDecisionPlan')).includes('parsePlanJsonLenientHf37'));
const failed=checks.filter(x=>!x.ok);
for(const c of checks)console.log(`${c.ok?'OK':'KO'} · ${c.name}${c.detail?` · ${c.detail}`:''}`);
if(failed.length){console.error(`\n${failed.length} controles de soberanía fallan.`);process.exit(1);}else console.log(`\n${checks.length} controles de soberanía OK.`);
