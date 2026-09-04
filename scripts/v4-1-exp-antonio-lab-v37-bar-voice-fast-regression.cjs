const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const lab=read('public/app/features/antonio-lab-v3.js'),svc=read('services/antonio-lab.service.js'),ai=read('services/event-ai.service.js'),bridge=read('public/app/features/v11-3-zuzu-analitica-libre.js'),html=read('public/antonio-lab.html'),itv=read('public/app/features/zuzu-test-console-gd.js');
const checks=[
 ['build V3.7',/V3\.7-BAR-VOICE-FAST/.test(lab)&&/V3\.7-BAR-VOICE-FAST/.test(svc)&&/Antonio LAB V3\.7/.test(html)],
 ['voz Sharvard M',/es_ES-sharvard-medium/.test(lab)&&/es_ES-sharvard-medium/.test(svc)&&/Sharvard M/.test(html)],
 ['ritmo 1.10',/playbackRate\.value=1\.10/.test(lab)],
 ['VAD 600ms',/silentFrames>=30/.test(lab)&&!/silentFrames>=34/.test(lab)],
 ['anti-eco barge iPhone',/S\.speaking\?0\.040:0\.012/.test(lab)&&/needFrames=S\.speaking\?6:3/.test(lab)],
 ['cache V37',/20260904-V37/.test(lab)&&/20260904-V37/.test(html)&&/20260904-V37/.test(itv)],
 ['detector cifras explícitas',/function v437VoiceWantsFigures/.test(ai)&&/cuanto/.test(ai)&&/exactamente/.test(ai)],
 ['override sin cifras',/function v437VoiceNoFiguresRequested/.test(ai)&&/sin\\s\+\(\?:cifras/.test(ai)],
 ['saldo coloquial',/No sobró ni zarapeta/.test(ai)&&/Sobró poca pasta/.test(ai)&&/pegado a las costillas/.test(ai)],
 ['pagos coloquiales',/ha pagao todo el mundo/.test(ai)&&/rezaguero/.test(ai)],
 ['compras cualitativas',/Lo gordo de las compras/.test(ai)&&/alguna cosa por rematar/.test(ai)],
 ['banco cualitativo',/cuadre bancario/.test(ai)&&/movimiento por justificar/.test(ai)],
 ['fast path sin narrador factual',/FAST PATH ORAL/.test(ai)&&/const needsOptionalNarration/.test(ai)&&/voiceConversation&&\(currentSummary\|\|memoryEpisodeSummary\)/.test(ai)],
 ['answer escrito completo',/const answer=writtenAnswer/.test(ai)],
 ['spoken local V3.7',/v437VoiceAnswerFromResults/.test(ai)&&/voiceWantsFigures=oral\.wantsFigures/.test(ai)],
 ['memoria guarda lo hablado',/assistant:String\(data\.spokenAnswer\|\|data\.answer/.test(bridge)&&/assistantWritten:String\(data\.answer/.test(bridge)],
 ['puente fuente V37',/antonio-lab-v37/.test(lab)],
 ['ITV abre V3.7',/Antonio LAB V3\.7/.test(itv)],
 ['BANK4.9 permanece',fs.existsSync(path.join(root,'scripts/v4-1-exp-bank49-manual-state-authority-regression.cjs'))]
];let ok=0;for(const [n,p] of checks){console.log(`${p?'OK':'KO'} · ${n}`);if(p)ok++;}console.log(`\nAntonio LAB V3.7 BAR VOICE FAST: ${ok}/${checks.length}`);process.exitCode=ok===checks.length?0:1;
