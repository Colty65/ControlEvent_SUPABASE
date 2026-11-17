import fs from 'node:fs';
const s=fs.readFileSync(new URL('../services/event-ai.service.js',import.meta.url),'utf8');
const checks=[
 ['version v6_1-exp',/v6\.0\.10_exp/.test(s)],
 ['conversation_state packet',/conversation_state:conversationState/.test(s)],
 ['6 recent turns',/hist\.slice\(-6\)/.test(s)],
 ['previous user',/previous_user_prompt/.test(s)],
 ['previous assistant',/previous_assistant_reply/.test(s)],
 ['previous execution',/previous_execution_status/.test(s)],
 ['thread chronology exposed',/available_threads/.test(s)],
 ['conversation-first prompt',/CONVERSACIÓN PRIMERO:/.test(s)],
 ['no empty continuation promise',/Nunca respondas solo con una promesa/.test(s)],
 ['do not ask repeat when context exists',/No pidas al usuario que repita algo que ya está en el Context Packet/.test(s)],
 ['last turn persisted',/last_turn:lastTurn/.test(s)],
 ['identity remains Zuzu',/assistant_identity:\{name:'Zuzu',product:'ControlEvent'\}/.test(s)],
];
let ok=0; for(const [n,v] of checks){console.log(`${v?'OK':'KO'} ${n}`); if(v) ok++;}
console.log(`RESULT ${ok}/${checks.length}`); process.exit(ok===checks.length?0:1);
