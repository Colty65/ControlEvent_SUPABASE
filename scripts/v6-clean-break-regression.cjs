const fs=require('fs');
const s=fs.readFileSync('services/event-ai.service.js','utf8');
const v=fs.readFileSync('public/app/version.js','utf8');
const start=s.indexOf('export async function runZuzuVNextUserTurn(input={}){');
const entry=s.slice(start,start+2400);
const checks=[
 ['v6 provider',s.includes("provider:'zuzu-v6.0.4-clean-canonical-compiler'")],
 ['single v6 entry',entry.includes('runZuzuV6Agent(')],
 ['no Brain Lite in active entry',!entry.includes('runZuzuBrainLiteAgent(')],
 ['no P2-R in active entry',!entry.includes('runZuzuVNextP2Agent(')],
 ['no legacy fallback',entry.includes('NO LEGACY FALLBACK')],
 ['five statuses',/NO_ACTION_REQUIRED.*EXECUTE_UI.*EXECUTE_DATA.*NEED_MATERIALS.*NEED_ENTITY_RESOLUTION/s.test(s)],
 ['entity tokens',s.includes('entity_resolution_overrides')&&s.includes("'^\\\\$[A-Z][A-Z0-9_]*$'")],
 ['key facts',s.includes('function v6KeyFacts')],
 ['thread graph',s.includes('function v6ApplyThread')],
 ['ontology v6',s.includes("CE-ONTOLOGY-6.0")],
 ['version v6',v.includes("VERSION = 'v6_1-exp'")],
 ['migration storage from v6.0 and v5.3.2',v.includes("'ControlEvent_v6.0_exp'")&&v.includes("'ControlEvent_v5.3.2_exp'")],
];
let bad=0;for(const [n,ok] of checks){console.log(`${ok?'OK':'KO'} ${n}`);if(!ok)bad++;}console.log(`${checks.length-bad}/${checks.length} OK`);process.exitCode=bad?1:0;
