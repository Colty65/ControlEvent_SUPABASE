const fs=require('fs');
const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','services','event-ai.service.js'),'utf8');
let ok=0,ko=0;
function test(name,cond){ if(cond){ok++; console.log('OK ',name);} else {ko++; console.error('KO ',name);} }
const actions=['restore_snapshot','reexecute_plan','reexecute_episode','recall_turn','recall_episode','resume_episode'];
test('referenceAction enum exists',/referenceAction=\{type:'string',[\s\S]{0,250}?enum:\['restore_snapshot','reexecute_plan','reexecute_episode','recall_turn','recall_episode','resume_episode'\]\}/.test(src));
test('ce_reference uses constrained referenceAction',/make\('ce_reference'[\s\S]{0,220}?reference_action:referenceAction/.test(src));
test('ce_reference no longer uses free string for action',!/make\('ce_reference'[\s\S]{0,220}?reference_action:str/.test(src));
for(const a of actions) test(`normalizer/protocol contains ${a}`,src.includes(`'${a}'`));
test('invalid restore alias is not added to enum',!/referenceAction=\{[\s\S]{0,300}?enum:\[[^\]]*'restore'[^_]/.test(src));
test('invalid reattempt alias is not added to enum',!/referenceAction=\{[\s\S]{0,300}?enum:\[[^\]]*'reattempt'/.test(src));
console.log(`\nBANK4_12 MEMORY REFERENCE CONTRACT: ${ok} OK / ${ko} KO`);
process.exitCode=ko?1:0;
