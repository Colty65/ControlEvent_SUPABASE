const fs=require('fs');
const service=fs.readFileSync('services/event-ai.service.js','utf8');
const ui=fs.readFileSync('public/app/features/v11-3-zuzu-analitica-libre.js','utf8');
let ok=0,total=0;function t(name,cond){total++;if(cond){ok++;console.log('OK',name)}else{console.error('KO',name);process.exitCode=1}}
t('Brain-Lite core separated from persistence wrapper',/async function runZuzuBrainLiteAgentCore\(/.test(service)&&/async function runZuzuBrainLiteAgent\(args=\{\}\)/.test(service));
t('Brain-Lite wrapper ensures persistent conversation',/ensureZuzuConversation\(\{conversationId:trim\(args\?\.conversationId\)/.test(service));
t('Brain-Lite wrapper appends every successful turn',/appendZuzuTurn\(\{conversation,actor,userPrompt:args\?\.userPrompt/.test(service));
t('Persistence result is returned to client',/memoryPersistence:'brain-lite-ledger-v1'/.test(service)&&/persistence:saved\.persistence/.test(service));
t('Typed Brain-Lite request reuses server conversation id',/conversationId:loadZuzuServerConversationId\(\),previousInteractionId:vnext\?/.test(ui));
t('Voice Brain-Lite request reuses server conversation id',/voiceConversation:true,brainLite:true/.test(ui)&&/conversationId:loadZuzuServerConversationId\(\),previousInteractionId:loadZuzuInteractionId/.test(ui));
t('No vnext request forces blank conversationId',!/(?:analyze-vnext[\s\S]{0,500})conversationId:''/.test(ui));
t('Historical memory replies are persisted non-recursively',/memoryHistorical[\s\S]{0,500}actionType:'reference'[\s\S]{0,500}memory_episode/.test(service));
t('Persistence audit failure is visible in MEM',/⚠ Persistencia BBDD/.test(ui));
console.log(`P21 ${ok}/${total} OK`);if(ok!==total)process.exit(1);
