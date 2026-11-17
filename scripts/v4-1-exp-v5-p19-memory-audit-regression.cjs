const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const ledger=fs.readFileSync(path.join(root,'services','zuzu-conversation-ledger.service.js'),'utf8');
const routes=fs.readFileSync(path.join(root,'routes','event-ai.routes.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'public/app/features/v11-3-zuzu-analitica-libre.js'),'utf8');
let ok=0,ko=0;function t(n,c){if(c){ok++;console.log('OK',n)}else{ko++;console.error('KO',n)}}
t('diagnóstico exportado',/export async function diagnoseZuzuMemory/.test(ledger));
t('distingue almacenado y recallable',/stored:true[\s\S]*memory_recallable[\s\S]*effective_recallable/.test(ledger));
t('marca conversación actual',/current_conversation:turn\.conversationId===current/.test(ledger));
t('incluye calidad y score de ranking',/memory_quality[\s\S]*ranking_score/.test(ledger));
t('expone endpoint de auditoría',/\/event-ai\/memory\/audit/.test(routes));
t('UI incorpora botón MEM',/id="ceAiMemoryAudit"/.test(ui));
t('UI llama endpoint persistente',/fetch\('\/api\/event-ai\/memory\/audit'/.test(ui));
t('auditoría no muta memoria',!(/diagnoseZuzuMemory[\s\S]{0,5000}\.update\(|diagnoseZuzuMemory[\s\S]{0,5000}\.insert\(|diagnoseZuzuMemory[\s\S]{0,5000}\.delete\(/.test(ledger)));
console.log(`P19 MEMORY AUDIT: ${ok}/8 OK`);process.exitCode=ko?1:0;
