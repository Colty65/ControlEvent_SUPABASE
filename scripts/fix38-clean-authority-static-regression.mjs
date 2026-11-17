import fs from 'node:fs';
const src=fs.readFileSync(new URL('../services/event-ai.service.js',import.meta.url),'utf8');
const runStart=src.indexOf('async function runZuzuBrainLiteAgent');
const runEnd=src.indexOf('\nasync function ',runStart+20)>0?src.indexOf('\nasync function ',runStart+20):src.length;
const run=src.slice(runStart,runEnd);
const checks=[
  ['freeze present',run.includes('v5P15FreezePlan(plan,flowTrace)')],
  ['clean executor present',run.includes('v5P15ExecutionArgsFromFrozenAction')],
  ['legacy structural guard absent from active run',!run.includes('v4BrainLitePlanStructuralGuard(plan')],
  ['P9 mutator absent from active run',!run.includes('v5P9ApplyContract(plan')],
  ['P10 mutator absent from active run',!run.includes('v5P10ApplyStateAuthority(plan')],
  ['legacy args mutator absent from active run',!run.includes('v4BrainLiteArgs(act')],
  ['decision contract exposed',run.includes('decisionContract:x.decisionContract')],
  ['scope validated before target',src.includes("if(scope==='all_events')return true;")],
  ['all_events does not derive event',src.includes("if(scope==='all_events')delete exec.event;")],
];
let bad=0;for(const [n,ok] of checks){console.log(`${ok?'OK':'KO'} · ${n}`);if(!ok)bad++;}
if(bad)process.exit(1);
console.log(`FIX38 CLEAN AUTHORITY: ${checks.length}/${checks.length} OK`);
