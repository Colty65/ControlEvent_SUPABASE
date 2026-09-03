const fs=require('fs');
const vm=require('vm');
const path=require('path');
let ok=0,ko=0;
function check(cond,msg){if(cond){ok++;console.log('OK ',msg);}else{ko++;console.error('KO ',msg);}}
(async()=>{
  const mod=await import('file:///mnt/data/bank419/services/zuzu-human-language.service.js?x='+Date.now());
  const state={personas:[
    {id:'esther',nombre:'Esther'},{id:'angeles',nombre:'Angeles'},{id:'nines',nombre:'Nines (Emiliano)'},
    {id:'pocholo',nombre:'Pocholo y Celes'},{id:'miguel',nombre:'Miguel Angel'},{id:'cordo',nombre:'Cordo y Sierra'},
    {id:'curvas',nombre:'Curvas'},{id:'rafa',nombre:'Rafa'},{id:'victor',nombre:'Victor Cuervo'},{id:'placi',nombre:'Placidín'}
  ]};
  const pairs=[['La Estercita','Esther'],['la rubia','Angeles'],['Angelines','Nines (Emiliano)'],['Manolo','Pocholo y Celes'],['Veinticinco','Miguel Angel'],['Pipitilla','Rafa'],['Cuervito','Victor Cuervo'],['Placi','Placidín'],['el gordo','Placidín']];
  for(const [alias,canon] of pairs){
    const r=mod.resolveFamiliarPersonAlias(state,alias);check(r.ok&&r.nombre===canon,`${alias} -> ${canon}`);
    const c=mod.familiarPersonAliasCandidates(state,`Háblame de ${alias}, anda.`);check(c.some(x=>x.name===canon&&x.match_kind==='exact'),`prompt candidate ${alias}`);
  }
  const paco=mod.resolveFamiliarPersonAlias(state,'Paco');check(!paco.ok&&paco.ambiguous&&paco.candidates.length===2,'Paco conserva ambigüedad real Cordo/Curvas');
  check(mod.familiarAliasCanonicalCandidates('Veinticinco').some(x=>/Miguel/i.test(x)),'Veinticinco tiene pista canónica configurable');
  check(mod.humanLanguageProfile().version==='BANK4_19','perfil BANK4_19');

  const voice=fs.readFileSync('/mnt/data/bank419/public/app/features/v22-voz3-zuzu.js','utf8');
  check(/BANK4_19-Z1H-VOICE-V52/.test(voice),'build VOICE-V52');
  check(!/['\"]Mmm/.test(voice),'no quedan microfrases que empiecen por Mmm');
  check((voice.match(/display:'/g)||[]).length>=18,'mazo de entretenimiento amplio');
  check(/speech:\[\['ummmmm'/.test(voice),'Ummmmm visual usa token TTS ummmmm');
  check(/besitos muá/.test(voice)&&/\['calla',620\].*\['ya lo tengo',480\].*\['besitos muá',0\]/s.test(voice),'Calla se reproduce completa por cláusulas');
  check(/pauseMs/.test(voice),'pausas explícitas por cláusula');
  check(/entertainment_deck_v49/.test(voice),'mazo cacheado nuevo v49');
  const html=fs.readFileSync('/mnt/data/bank419/public/index.html','utf8');check(/BANK419-Z1H-VOICE-V52/.test(html),'cache bust BANK419');
  const eventAi=fs.readFileSync('/mnt/data/bank419/services/event-ai.service.js','utf8');
  check(/v419ResolveFamiliarPerson/.test(eventAi),'certificación post-Gemini de alias social');
  check(/familiarAliasCanonicalCandidates/.test(eventAi),'fallback canónico de alias social');
  check(/¿Me lo puedes concretar un poco\?/.test(eventAi),'CLARIFY vacío no rompe el turno');
  console.log(`\nTOTAL ${ok} OK / ${ko} KO`);process.exitCode=ko?1:0;
})().catch(e=>{console.error(e);process.exit(1)});
