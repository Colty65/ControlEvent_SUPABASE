const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');let ok=0,ko=0;
function t(name,cond,detail=''){if(cond){ok++;console.log('OK ',name);}else{ko++;console.error('KO ',name,detail);}}
(async()=>{
  const lang=await import(path.join(root,'services/zuzu-human-language.service.js'));
  const state={personas:[
    {id:'e',nombre:'Esther',nombreAmigo:'La Estercita',aliases:['La Estercita']},{id:'ce',nombre:'Colty y Esther'},
    {id:'jm',nombre:'Jose Manuel',nombreAmigo:'el primo',aliases:['el primo']},{id:'jmr',nombre:'Jose Manuel -hno.rubia-'},
    {id:'p',nombre:'Pocholo',nombreAmigo:'Manolo',aliases:['Manolo']},{id:'pc',nombre:'Pocholo y Celes'}
  ],eventos:[{id:'s26',titulo:'SySA 2026',nombreHablado:'Santiago y Santa Ana de este año'},{id:'f26',titulo:'FUNCION 2026',nombreHablado:'La Función de este año'}]};
  for(const [a,w] of [['La Estercita','Esther'],['el primo','Jose Manuel'],['Manolo','Pocholo']]){const r=lang.resolveFamiliarPersonAlias(state,a);t(`${a} resuelve persona individual`,r.ok&&r.nombre===w&&!r.ambiguous,JSON.stringify(r));}
  const ev=lang.humanizeSpokenEventNames('Recuerdo SySA 2026. Después hablamos de FUNCION 2026.',state,{});
  t('nombre hablado final sustituye todos los eventos',!/SySA 2026|FUNCION 2026/.test(ev.text)&&/Santiago y Santa Ana/.test(ev.text)&&/La Función/.test(ev.text),ev.text);

  const voice=fs.readFileSync(path.join(root,'public/app/features/v22-voz3-zuzu.js'),'utf8');
  const a=voice.indexOf('  function spokenNumberEs'),b=voice.indexOf('  function stopSpeaking',a);
  const ctx={console,clean:v=>String(v==null?'':v).replace(/\s+/g,' ').trim(),stripReservedFromSpeech:v=>String(v)};vm.createContext(ctx);vm.runInContext(voice.slice(a,b),ctx);
  const seg=ctx.speechProsodySegments('Uno, dos: tres; cuatro. Cinco?');
  t('comas y dos puntos permanecen dentro del mismo utterance',seg[0]&&seg[0].text.includes('Uno, dos: tres; cuatro.'),JSON.stringify(seg));
  t('frase larga se divide por frase/tamaño, no por cada coma',seg.length===2,JSON.stringify(seg));
  t('hora 18:30 permanece íntegra',ctx.speechProsodySegments('A las 18:30 empieza.')[0]?.text.includes('18:30'));
  t('entretenimiento usa un solo utterance',/Una frase de entretenimiento = UN utterance/.test(voice)&&/function entertainmentVoiceText/.test(voice));
  t('beforeinput protege primera tecla',/addEventListener\('beforeinput'/.test(voice)&&/lectura anterior cortada/.test(voice));
  t('nueva petición cancela lectura anterior',/ce:zuzu-request-started[\s\S]{0,500}if\(state\.speaking\)stopSpeaking\(true\)/.test(voice));
  const svc=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
  t('última aduana oral de eventos existe',/BANK4_27 · ÚLTIMA ADUANA ORAL DE EVENTOS/.test(svc)&&/humanizeSpokenEventNames\(spokenAnswer\|\|answer/.test(svc));
  console.log(`TOTAL ${ok+ko} · OK ${ok} · KO ${ko}`);process.exit(ko?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
