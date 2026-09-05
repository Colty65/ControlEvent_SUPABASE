const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const lab=fs.readFileSync(path.join(root,'public/app/features/antonio-lab-v3.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/antonio-lab.html'),'utf8');
const ui=fs.readFileSync(path.join(root,'public/app/features/zuzu-test-console-gd.js'),'utf8');
let ok=0,ko=0;function t(n,c){if(c){ok++;console.log('OK',n)}else{ko++;console.error('KO',n)}}
t('hotfix build visible',/V3\.12\.2A/.test(lab)&&/V3\.12\.2A/.test(html)&&/V3\.12\.2A/.test(ui));
t('isIosLike restaurada',/function\s+isIosLike\s*\(\)/.test(lab));
t('speak puede consultar isIosLike sin símbolo huérfano',(lab.match(/isIosLike\s*\(/g)||[]).length>=3);
t('cache bust V3122A',/20260905-V3122A/.test(html)&&/20260905-V3122A/.test(ui));
t('arquitectura V3.12 preservada',/gemini-3\.1-flash-tts-preview/.test(lab)&&/fallbackSpeak/.test(lab)&&!/gemini-live/i.test(lab));
t('fecha/persona/ghost tune preservados',/localConversationFastReply/.test(lab)&&/isLocalWakeCluster/.test(lab)&&/geminiVoiceBackoffUntil/.test(lab));
console.log(`\nV3.12.2A hotfix: ${ok} OK / ${ko} KO`);process.exit(ko?1:0);
