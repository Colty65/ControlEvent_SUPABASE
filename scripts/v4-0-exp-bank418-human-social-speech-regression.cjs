const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {pathToFileURL}=require('url');
const ROOT=path.resolve(__dirname,'..');
(async()=>{
  const mod=await import(pathToFileURL(path.join(ROOT,'services/zuzu-human-language.service.js')).href+'?t='+Date.now());
  let ok=0; const check=(n,fn)=>{try{fn();console.log('OK',n);ok++;}catch(e){console.error('KO',n,e.message);process.exitCode=1;}};
  const people=['Colty','Rafa','Víctor Cuervo','Placidín','Celes','Lucía','Esther','Curvas','Gonzalo','Jose Manuel','Pocholo','Varito','Juli'].map((nombre,i)=>({id:String(i+1),nombre}));
  const state={personas:people,eventos:[
    {titulo:'SySA 2026'},
    {titulo:'CUMPLE PORRETA LIX - MAY26'},
    {titulo:'Hdad. Stmo. Cristo de la Angustias - SEP26'},
    {titulo:'VdB - FdO 2026'}
  ]};
  check('SySA humano',()=>assert.equal(mod.humanizeEventName('SySA 2026',{currentDate:'2026-08-29'}),'Santiago y Santa Ana de este año'));
  check('mes/año visual se omite',()=>assert.equal(mod.humanizeEventName('CUMPLE PORRETA LIX - MAY26',{currentDate:'2026-08-29'}),'CUMPLE PORRETA 59'));
  check('Hdad/Stmo se expande',()=>assert.equal(mod.humanizeEventName('Hdad. Stmo. Cristo de la Angustias - SEP26',{currentDate:'2026-08-29'}),'Hermandad Santísimo Cristo de las Angustias'));
  check('VdB se expande',()=>assert.equal(mod.applySpokenReplacements('Nos vemos en VdB.').text,'Nos vemos en Villanueva de Bogas.'));
  check('FdO se expande',()=>assert.equal(mod.applySpokenReplacements('La FdO empieza mañana.').text,'La Fiesta del Olivo empieza mañana.'));
  const aliasCases=[['La Luci','Lucía'],['La Estercita','Esther'],['Paco','Curvas'],['Gonzalito','Gonzalo'],['el primo','Jose Manuel'],['Manolo','Pocholo'],['Eduardo','Varito'],['Julita','Juli'],['Pipitilla','Rafa'],['Cuervito','Víctor Cuervo'],['Placi','Placidín'],['el gordo','Placidín'],['La Celes','Celes'],['Celeste','Celes']];
  for(const [alias,canonical] of aliasCases)check(`alias ${alias} -> ${canonical}`,()=>{const r=mod.resolveFamiliarPersonAlias(state,alias);assert(r.ok,JSON.stringify(r));assert.equal(r.nombre,canonical);});
  check('Colty permanece Colty al hablar',()=>{for(let i=0;i<40;i++){const x=mod.humanizeSpokenEntities('Jesús Álvarez Seguido está aquí.',{...state,personas:[...people,{id:'u',nombre:'Jesús Álvarez Seguido'}]},{seed:'u'+i,currentDate:'2026-08-29'}).text;if(x.includes('Colty'))return;}throw new Error('no produjo Colty');});
  check('Celes usa La Celes mucho más que Celeste',()=>{let lc=0,ce=0;for(let i=0;i<1000;i++){const x=mod.humanizeSpokenEntities('Celes llegó.',state,{seed:'c'+i,currentDate:'2026-08-29'}).text;if(x.includes('La Celes'))lc++;if(x.includes('Celeste'))ce++;}assert(lc>ce*4,`La Celes=${lc} Celeste=${ce}`);});
  const voice=fs.readFileSync(path.join(ROOT,'public/app/features/v22-voz3-zuzu.js'),'utf8');
  check('voz BANK4_18 V51',()=>assert(voice.includes('BANK4_18-Z1H-VOICE-V51')));
  check('entretenimiento se trocea y termina antes de respuesta',()=>{assert(voice.includes('function entertainmentSpeechParts'));assert(voice.includes('if(state.entertainmentSpeaking){state.pendingAnswerTimer=setTimeout(deliver,60);return;}'));});
  check('frase Calla completa se conserva',()=>assert(voice.includes('Calla............... ya lo tengo....., besitos muá.')));
  check('Ummm completo se conserva',()=>assert(voice.includes('Ummm...................')));
  check('cache v48 entretenimiento',()=>assert(voice.includes('entertainment_deck_v48')));
  const index=fs.readFileSync(path.join(ROOT,'public/index.html'),'utf8');
  check('cache bust BANK418 V51',()=>assert(index.includes('BANK418-Z1H-VOICE-V51')));
  console.log(`TOTAL ${ok} OK`); if(process.exitCode)process.exit(process.exitCode);
})();
