const fs=require('fs');
const p='public/app/features/v11-3-zuzu-analitica-libre.js';
const s=fs.readFileSync(p,'utf8');
let ok=0,ko=0;
function t(name,cond){if(cond){ok++;console.log('OK ',name)}else{ko++;console.error('KO ',name)}}
t('conversationSessionId por pestaña',/ZUZU_TAB_SESSION_SLOT/.test(s)&&/zuzuCurrentConversationSessionId/.test(s));
t('namespace incluye usuario y sesion',/zuzuUserStorageScope\(\).*_c_/s.test(s)||/zuzuStorageBasePrefix/.test(s)&&/zuzuUserStorageScope\(\)/.test(s));
t('detector de pestaña duplicada por BroadcastChannel',/BroadcastChannel\('controlevent:zuzu:tab-session:v2'\)/.test(s)&&/type:'probe'/.test(s)&&/type:'alive'/.test(s));
t('fork genera nuevo conversationSessionId',/function zuzuForkConversationSession/.test(s)&&/zuzuNewConversationSessionId\(\)/.test(s));
t('fork no copia ids servidor/interaccion',/cloneSuffixes=\['conversation','context','usage_total','prompt_draft_p16','prompt_last_p16','runtime_build'\]/.test(s)&&/removeItem\(newPrefix\+'interaction_id'\)/.test(s)&&/removeItem\(newPrefix\+'server_conversation_id'\)/.test(s));
t('voice recovery queda namespaced',/function zuzuVoiceRecoveryKey\(\)\{ return zuzuStorageKey\('voice_recovery_v311'\); \}/.test(s));
t('migracion ya no barre todas las claves',!/for\(var i=0;i<sessionStorage\.length;i\+=1\)/.test(s)&&/zuzuLegacyStorageKey/.test(s));
t('clear actual no barre conversaciones de otras sesiones',/\['conversation','context','interaction_id','usage_total','server_conversation_id'\]/.test(s));
t('lease localStorage endurece Safari/iOS',/zuzuClaimTabLease/.test(s)&&/controlevent:zuzu:tab-lease:v2/.test(s)&&/setInterval\(zuzuClaimTabLease,5000\)/.test(s));
t('runtime build FIX35+',/FIX3[5-9]|FIX[4-9][0-9]/.test(s));
console.log(`RESULT ${ok} OK / ${ko} KO`);process.exitCode=ko?1:0;
