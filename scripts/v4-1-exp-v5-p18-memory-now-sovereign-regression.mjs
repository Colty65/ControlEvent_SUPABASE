import fs from 'node:fs';
const src=fs.readFileSync(new URL('../services/event-ai.service.js',import.meta.url),'utf8');
const checks=[
  ['P18 Gemini planner exists', src.includes('async function v5P18GeminiMemoryNowPlan')],
  ['historical contract persisted from memory', src.includes('memory_historical_contract:historicalContract')],
  ['memory rows preserve plan signature', src.includes('_plan_signature:t.plan_signature||{}')],
  ['MEMORY→NOW validates before freeze', src.includes('v5P18ValidateMemoryNowPlan(nowPlan)')],
  ['MEMORY→NOW freezes Gemini decision', src.includes('const frozen=v5P15FreezePlan(nowPlan,flowTrace)')],
  ['execution comes from frozen action', src.includes('v5P15ExecutionArgsFromFrozenAction(act,state,selectedEventId,userPrompt,flowTrace)')],
  ['old local person replay removed', !src.includes('function v5P13MemoryReplayActionFromRows')],
  ['no old memory_replay_action runtime', !src.includes('memory_replay_action')],
  ['prompt forbids incidental historical answer entities', src.includes('El texto de la RESPUESTA histórica NO es autoridad')],
  ['compare with now is not compare_events', src.includes('significa mostrar ENTONCES y HOY, no comparar dos eventos')],
  ['comparison stores historical and current contracts', src.includes('historicalContract,currentContract')],
  ['invalid current contract does not fall back to another query', src.includes('Mantengo el recuerdo y la acción pendientes para que podamos retomarlos')&&src.includes("provider:'zuzu-v5-memory-now-no-commit'")],
  ['memory evidence keeps historical contract', src.includes('v5P18HistoricalContractFromEvidenceRows(rows)')],
  ['P18 provider identifies sovereign memory now', src.includes("provider:'zuzu-v5-memory-now-gemini-sovereign'")]
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'OK':'KO'} · ${name}`);if(pass)ok++;}
console.log(`P18 MEMORY→NOW SOVEREIGN: ${ok}/${checks.length} OK`);if(ok!==checks.length)process.exit(1);
