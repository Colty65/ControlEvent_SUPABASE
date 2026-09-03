const fs=require('fs');
const src=fs.readFileSync(require('path').join(__dirname,'..','services','event-ai.service.js'),'utf8');
const ledger=fs.readFileSync(require('path').join(__dirname,'..','services','zuzu-conversation-ledger.service.js'),'utf8');
let ok=0,ko=0;function t(name,cond){if(cond){ok++;console.log('OK',name)}else{ko++;console.error('KO',name)}}
t('semantic structural retry gets second Gemini call',src.includes('externalSignal,maxCalls:2,maxOutputTokens:1700'));
t('memory state machine exists',src.includes('function v422MemoryFollowupAction')&&src.includes('BANK4_22 · FOLLOW-UP DE MEMORIA'));
t('ordinal memory can be resolved locally',src.includes('function v422PickMemoryOrdinal')&&src.includes('BANK4_22 · MEMORIA ORDINAL'));
t('memory overview distinct from list',src.includes("memory_mode:mode==='overview'?'overview':'list'")&&src.includes('v422MemoryOverviewText'));
t('memory list has actual textual preview',src.includes('v422MemoryListText')&&src.includes('Te dejo la tabla completa debajo'));
t('literal memory field survives normalization',src.includes("type==='memory_literal'&&['question','answer','both'].includes"));
t('full transcript survives normalization',src.includes("if(r?.full_transcript===true)out.reference.full_transcript=true"));
t('common structural reference aliases canonicalized',src.includes("recalled_episode:'recall_episode'")&&src.includes("recalled_turn:'recall_turn'"));
t('remembered topic without date counts as recall',ledger.includes('estuvimos|hemos\\s+estado|hemos|habiamos|habíamos'));
t('what do you remember counts as recall',ledger.includes('dime\\s+(?:que|qué)\\s+recuerdas'));
t('active-memory literal answer goes recall_turn',src.includes("literal_${literal}")&&src.includes("action:'recall_turn'"));
t('active-memory full conversation goes recall_episode full',src.includes("full_transcript:true,reason:'full_episode'"));
t('go back to first works from memory context',src.includes('v422OrdinalFromMemoryContext')&&src.includes('vuelve|volvamos|regresa'));
console.log(`BANK4_22: ${ok} OK / ${ko} KO`);process.exitCode=ko?1:0;
