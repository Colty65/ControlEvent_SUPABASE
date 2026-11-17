import fs from 'node:fs';
import { validateCleanDecisionContract, cleanCapabilityContractCatalogText } from '../services/zuzu-capability-registry.service.js';
const src=fs.readFileSync(new URL('../services/event-ai.service.js',import.meta.url),'utf8');
const runStart=src.indexOf('async function runZuzuBrainLiteAgent');
const runEnd=src.indexOf('\nasync function ',runStart+30)>0?src.indexOf('\nasync function ',runStart+30):src.length;
const run=src.slice(runStart,runEnd);
const goodGlobal=validateCleanDecisionContract({operation:'event_income_status',scope:'all_events',status:'pending'});
const badGlobal=validateCleanDecisionContract({operation:'event_income_status',scope:'all_events',event:'EVENTO X',status:'pending'});
const goodCurrent=validateCleanDecisionContract({operation:'event_income_status',scope:'current_event',status:'pending'});
const badMissing=validateCleanDecisionContract({operation:'event_income_status',status:'pending'});
const catalog=cleanCapabilityContractCatalogText();
const checks=[
 ['global income legal without event',goodGlobal.ok],
 ['global income rejects event',!badGlobal.ok&&badGlobal.issues.some(x=>x.includes('prohíbe event'))],
 ['current event legal without named event',goodCurrent.ok],
 ['missing event/scope rejected',!badMissing.ok],
 ['Gemini receives capability contracts',src.includes('${cleanCapabilityContractCatalogText()}')],
 ['pre-freeze validator exists',run.includes('v5P16ValidatePlanBeforeFreeze(plan)')],
 ['invalid semantics repaired only by Gemini',run.includes('v5P16GeminiRepairInvalidPlan')],
 ['freeze happens after validation',(()=>{const m=run.indexOf('// P16: VALIDAR ANTES DEL FREEZE');const v=run.indexOf('v5P16ValidatePlanBeforeFreeze(plan)',m);const f=run.indexOf('v5P15FreezePlan(',v);return m>=0&&v>m&&f>v;})()],
 ['legacy P9 mutator absent',!run.includes('v5P9ApplyContract(plan')],
 ['legacy P10 mutator absent',!run.includes('v5P10ApplyStateAuthority(plan')],
 ['legacy args mutator absent',!run.includes('v4BrainLiteArgs(act')],
 ['global executor already supported',src.includes("allEventsIncome=op==='event_income_status'&&trim(decision?.scope)==='all_events'")&&src.includes('v5P14AllEventsIncomeStatus')],
 ['global response is evidence-aware',src.includes('He revisado ${Math.round(num(f.event_count))} eventos')],
 ['catalog states invariant',catalog.includes('scope=all_events significa event AUSENTE')],
];
let bad=0;for(const [n,ok] of checks){console.log(`${ok?'OK':'KO'} · ${n}`);if(!ok)bad++;}
if(bad)process.exit(1);console.log(`P16 GEMINI SOVEREIGN: ${checks.length}/${checks.length} OK`);
