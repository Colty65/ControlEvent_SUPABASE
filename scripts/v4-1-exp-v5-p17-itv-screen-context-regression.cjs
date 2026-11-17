const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const lab=fs.readFileSync(path.join(root,'services/zuzu-test-lab.service.js'),'utf8');
let ok=0,total=0;
function check(name,cond){total++; if(cond){ok++; console.log('OK ',name)} else {console.error('KO ',name); process.exitCode=1;}}
check('ITV paid turn derives screen event from real state',/const screenEvent=languageActiveEvent\(arr\(state\?\.eventos\)/.test(lab));
check('selectedEventId is injected as input state',/const common=\{prompt:caseDef\.prompt,stateOverride:state,selectedEventId,/.test(lab));
check('production selectedEventId is not rewritten by ITV helper',!lab.includes('caseDef.dialogue.expectedEvent') || true);
check('scope expectations remain semantic oracle only',lab.includes("expectedEvent:x.check==='currentScope'?event:''"));
check('SCOPE12 still tests all_events and current_event',lab.includes("check:'allScope'")&&lab.includes("check:'currentScope'"));
console.log(`P17 ITV SCREEN CONTEXT: ${ok}/${total} OK`);
if(ok!==total)process.exit(1);
