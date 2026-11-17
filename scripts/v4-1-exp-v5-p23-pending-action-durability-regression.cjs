const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const svc=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const checks=[
 ['P23 durable state resolver',/function v5P23ConversationState\(/.test(svc)],
 ['history pending resolver',/function v5P23PendingStateFromHistory\(/.test(svc)],
 ['pending reads turn.pendingAction',/t\.pendingAction&&typeof t\.pendingAction==='object'/.test(svc)],
 ['terminal completed/cancelled blocks stale pending',/\['completed','cancelled'\]\.includes\(st\)/.test(svc)],
 ['memory creates explicit pending action',/function v5P23PendingFromMemoryTurn\(/.test(svc)&&/type:'REEXECUTE_MEMORY_NOW'/.test(svc)],
 ['cancel persists suspended pendingAction',/pendingAction=basePending\?\{\.\.\.basePending,status:'suspended'\}/.test(svc)],
 ['social preserves same pendingAction',/V5 P23 · SOCIAL REACTION/.test(svc)&&/pendingAction=cs\.pending_action\|\|null/.test(svc)],
 ['memory return surfaces pendingAction',/memoryPresentation:mp,pendingAction:\(v5P23ConversationState/.test(svc)],
 ['memory exact passage surfaces pendingAction',/Memory Frame \+ Pending Action durable/.test(svc)||/pendingAction:\(mp\.canRefresh\?\{type:'REEXECUTE_MEMORY_NOW'/.test(svc)],
 ['memory-now uses durable pending contract first',/durablePending\?\.historical_contract/.test(svc)],
 ['memory-now planner has dialogueState in local scope',/v5P18GeminiMemoryNowPlan[\s\S]{0,900}dialogueState=v5P23ConversationState/.test(svc)],
 ['success marks pending completed',/status:'completed',current_contract:currentContract/.test(svc)],
 ['failure keeps pending action',/status:'pending',last_error:cleanGeminiError\(error\)/.test(svc)],
 ['social cue catches te estas liando',/te\\s\+estas\\s\+liando/.test(svc)],
 ['voice never offers to ask Gemini',!svc.includes('puedo pedir a Gemini que ejecute hoy la misma consulta')],
 ['P23-or-newer cachebuster',/FIX(?:47-P23-PENDING-DURABILITY|48-P24-LAST-SUCCESSFUL-AUTHORITY)/.test(html)],
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'OK':'KO'} ${name}`);if(pass)ok++;}
console.log(`P23: ${ok}/${checks.length} OK`);if(ok!==checks.length)process.exit(1);
