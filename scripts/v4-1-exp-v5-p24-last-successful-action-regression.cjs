const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const svc=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const idx=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const checks=[
 ['P24 repeat cue exists',/function v5P24RepeatLastCue\(/.test(svc)],
 ['repeat cue covers haz lo de antes',/haz\\s\+lo\\s\+de\\s\+antes/.test(svc)],
 ['last successful reads persisted conversation state',/conversation_state\?\.last_successful_action/.test(svc)],
 ['completed memory action can reconstruct last successful',/status\)==='completed'.*REEXECUTE_MEMORY_NOW/s.test(svc)],
 ['repeat memory uses last successful action',/repeatLastMemory=.*lastSuccessful.*REEXECUTE_MEMORY_NOW/.test(svc)],
 ['historical contract comes from last successful when repeating',/repeatLastMemory&&lastSuccessful\?\.historical_contract/.test(svc)],
 ['repeat last routed through Gemini memory-now planner',/repeatLastMemory[\s\S]{0,1800}v5P18GeminiMemoryNowPlan/.test(svc)],
 ['durable last stores historical and current contract',/durableLast=\{type:'REEXECUTE_MEMORY_NOW'[\s\S]{0,900}historical_contract:historicalContract/.test(svc)],
 ['social route still preserves state',/V5 P23 · SOCIAL REACTION/.test(svc)],
 ['Gemini sovereignty remains explicit',/ÚNICO intérprete semántico de Zuzu/.test(svc)],
 ['FIX48 cache buster',/FIX48-P24-LAST-SUCCESSFUL-AUTHORITY/.test(idx)],
 ['no business names in P24 helper',!(/Carmelo|Emiliano|Ernesto|Cito/.test((svc.match(/function v5P24RepeatLastCue[\s\S]*?\n\}/)||[''])[0]))]
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'OK':'KO'} - ${name}`);if(pass)ok++;}
console.log(`P24: ${ok}/${checks.length} OK`);process.exit(ok===checks.length?0:1);
