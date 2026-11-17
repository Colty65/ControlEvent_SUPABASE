const fs=require('fs');
const ledger=fs.readFileSync('services/zuzu-conversation-ledger.service.js','utf8');
const routes=fs.readFileSync('routes/event-ai.routes.js','utf8');
const ui=fs.readFileSync('public/app/features/v11-3-zuzu-analitica-libre.js','utf8');
const index=fs.readFileSync('public/index.html','utf8');
let ok=0,ko=0;function t(name,cond){if(cond){ok++;console.log('OK ',name)}else{ko++;console.error('KO ',name)}}
t('core turn write is strict Supabase insert',/async function strictInsertTurn[\s\S]*from\(T_TURN\)\.insert\(row\)\.select\('\*'\)\.single\(\)/.test(ledger));
t('core conversation write is strict Supabase upsert',/async function strictEnsureConversation[\s\S]*from\(T_CONV\)\.upsert\(row/.test(ledger));
t('append no longer falls back turn write to ce_meta',!/from\(T_TURN\)\.insert\(trow\)[\s\S]{0,220}metaSet\(mkey\('turn'/.test(ledger));
t('append verifies persistence after memory projection',/verifyCorePersistence\(\{conversationId:conv\.conversationId,turnId,seq,userPrompt,answer\}\)/.test(ledger));
t('verification checks current turn and seq',/conversation_current_turn_mismatch/.test(ledger)&&/conversation_seq_mismatch/.test(ledger)&&/turn_seq_mismatch/.test(ledger));
t('diagnostic orders conversations by updated_at',/diagnoseZuzuPersistence[\s\S]*order\('updated_at',\{ascending:false\}\)/.test(ledger));
t('diagnostic orders turns by created_at',/diagnoseZuzuPersistence[\s\S]*order\('created_at',\{ascending:false\}\)/.test(ledger));
t('persistence audit endpoint exists',/event-ai\/persistence\/audit/.test(routes));
t('MEM UI shows database persistence evidence',/Persistencia BBDD/.test(ui)&&/recent24hCount/.test(ui));
t('cache buster present',/FIX(?:44-P20-MEMORY-PERSISTENCE-HARDEN|46-P22-DIALOGUE-STATE|47-P23-PENDING-DURABILITY|48-P24-LAST-SUCCESSFUL-AUTHORITY)/.test(index));
console.log(`P20 persistence hardening: ${ok}/${ok+ko} OK`);process.exitCode=ko?1:0;
