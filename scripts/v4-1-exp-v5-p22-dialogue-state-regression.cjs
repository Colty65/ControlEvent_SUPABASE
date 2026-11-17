const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const svc=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const checks=[
 ['P22 state function',/function v5P22ConversationState\(/.test(svc)],
 ['pending action explicit',/type:'REEXECUTE_MEMORY_NOW'/.test(svc)],
 ['memory frame explicit',/memory_frame:mem\?\{open:true/.test(svc)],
 ['last successful action explicit',/last_successful_action:last/.test(svc)],
 ['affirmative includes claro',/vale\|ok\|de acuerdo\|hazlo\|adelante\|claro\|venga\|perfecto/.test(svc)],
 ['cancel cue',/function v5P22CancelCue\(/.test(svc)],
 ['cancel suspends pending',/status:'suspended'/.test(svc)],
 ['return cue supports vuelva',/vuelve\|vuelva\|volver/.test(svc)],
 ['resume supports haz lo de antes',/haz\\s\+lo\\s\+de\\s\+antes/.test(svc)],
 ['planner receives dialogue state',/ESTADO_DIALOGO=\$\{JSON\.stringify\(dialogueState\)\}/.test(svc)],
 ['social preserves state',/0 cambio de MEMORY_FRAME, PENDING_ACTION y LAST_SUCCESSFUL_ACTION/.test(svc)],
 ['spoken no Gemini has executed',!svc.includes('Gemini ha ejecutado hoy la misma consulta con los datos actuales.')],
 ['memory suggestion first person',svc.includes('Si quieres, puedo ejecutar hoy la misma consulta y te dejo ambas versiones para comparar.')],
];
let ok=0; for(const [name,pass] of checks){console.log(`${pass?'OK':'KO'} ${name}`); if(pass)ok++;}
console.log(`P22: ${ok}/${checks.length} OK`); if(ok!==checks.length)process.exit(1);
