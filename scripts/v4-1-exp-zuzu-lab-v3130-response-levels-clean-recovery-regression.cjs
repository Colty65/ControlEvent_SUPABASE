const fs=require('fs'),path=require('path'),vm=require('vm');
const R=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(R,p),'utf8');
const ai=read('services/event-ai.service.js'),lab=read('public/app/features/antonio-lab-v3.js'),bridge=read('public/app/features/v11-3-zuzu-analitica-libre.js'),svc=read('services/antonio-lab.service.js'),html=read('public/antonio-lab.html');
let ok=0,ko=0;function t(n,c){if(c){ok++;console.log('OK ',n)}else{ko++;console.error('KO ',n)}}
function fn(src,name,nextName){const a=src.indexOf(`function ${name}`);if(a<0)return'';const b=nextName?src.indexOf(`function ${nextName}`,a+10):-1;return src.slice(a,b>0?b:src.length)}

t('build V3.13 coherente',/V3\.13\.0-RESPONSE-LEVELS-CLEAN-RECOVERY/.test(lab)&&/V3\.13\.0-RESPONSE-LEVELS-CLEAN-RECOVERY/.test(svc)&&/V3\.13/.test(html));
t('plan_turn expone response_level',/response_level:\{type:'string',enum:\['BASIC','MEDIUM','HIGH'\]/.test(ai));
t('planner define BASIC MEDIUM HIGH',/NIVELES DE RESPUESTA \(response_level\)/.test(ai)&&/BASIC por defecto/.test(ai)&&/MEDIUM cuando/.test(ai)&&/HIGH cuando/.test(ai));
t('escrito define tres niveles',/NIVELES DE PRESENTACIÓN ESCRITA/.test(ai)&&/NIVEL BÁSICO/.test(ai)&&/NIVEL MEDIO\/GRÁFICA/.test(ai)&&/NIVEL ALTO/.test(ai));
t('gráfica escrita reutiliza CURRENT',/MEDIO gráfico:[\s\S]{0,260}CURRENT exacto ya materializado/.test(ai));
t('voz usa redactor Gemini certificado',/vnextP2NarrateResults\(\{userPrompt,model,results:narratableGood[\s\S]{0,180}responseLevel/.test(ai)&&/REDACTOR ORAL CERTIFICADO/.test(ai));
t('redactor no es autoridad semántica',/NO decides la intención, NO eliges herramientas y NO cambias filtros/.test(ai)&&/La autoridad semántica sigue siendo plan_turn/.test(ai));
t('voz prohíbe todos los decimales',/TODAS las cifras habladas van SIN DECIMALES/.test(ai)&&/nunca digas punto\/coma decimal/.test(ai));
t('responsable explícito no se pierde',/v3130ResponsibleCandidate/.test(ai)&&/op==='event_purchases'&&responsible/.test(ai)&&/a\.responsible=responsible/.test(ai));
t('persona y evento no se concatenan',/separación persona\/evento/.test(ai)&&/personOps\.has\(op\)/.test(ai));
t('mismatch objetivo dispara recovery',/v3130ContractMismatch/.test(ai)&&/trigger:'contract_mismatch'/.test(ai)&&/cleanRestart:true/.test(ai));
t('plan factual vacío dispara recovery',/trigger:'empty_contract_plan'/.test(ai)&&/no_executable_contract/.test(ai));
t('rechazo del usuario limpia el hilo',/trigger:'user_rejection'/.test(ai)&&/RECUPERACIÓN LIMPIA/.test(ai));
t('queja corta no se maquilla localmente',!fn(lab,'localConversationFastReply','waitBrainBridge').includes("if(isComplaintOnly(text))return 'Vale.'"));
t('quejas fuertes activan recovery interno',(()=>{const x=fn(ai,'v3130RecoveryFeedbackCue','v3130RecoveryHasNewOrder');return x.includes('fatal')&&x.includes('muy\\s+mal')&&x.includes('vaya\\s+mierda')})());
t('MEDIUM/HIGH abre evidencia factual completa',/function v3130ApplyResponseDetailLevel/.test(ai)&&/MEDIUM','HIGH/.test(ai)&&/event_purchases/.test(fn(ai,'v3130ApplyResponseDetailLevel','vnextP2RecentEvents'))&&/a\.detail='full'/.test(fn(ai,'v3130ApplyResponseDetailLevel','vnextP2RecentEvents')));
t('runner aplica nivel de evidencia antes de ejecutar',/v3130ApplyResponseDetailLevel\(functionCalls,responseLevel,userPrompt,flowTrace\)/.test(ai));
t('recovery deja resultContext recovery_reset',/operation:'recovery_reset'/.test(ai)&&/v3130RecoveryContextFromAttempt/.test(ai));
t('cliente borra historial antes del turno recuperado',/if\(recovery&&recovery\.cleanRestart===true\)/.test(bridge)&&/window\.__ceZuzuConversationV26=\[\]/.test(bridge)&&/ce:zuzu-clean-restart/.test(bridge));
t('diagnóstico conserva recovery',/state:\{[\s\S]{0,300}recovery:S\.lastRecovery/.test(lab)&&/recoveryCount:S\.recoveryCount/.test(lab));
t('hora local evita planner',/HORA AUTORITATIVA LOCAL/.test(ai)&&/v3130ServerCurrentTimeCue/.test(ai));
t('mañana evita event_weather heredado',/FECHA MAÑANA LOCAL/.test(ai)&&/sin event_weather ni herencia del evento anterior/.test(ai));
t('planner impide weather genérico heredado',/event_weather solo se usa si el usuario relaciona explícitamente la meteorología con un evento/.test(ai));

try{
  const ctx={result:null};vm.createContext(ctx);
  vm.runInContext(`const clean=(v,m=8000)=>String(v==null?'':v).slice(0,m);\n${fn(lab,'integerToSpanishWords','parseSpanishNumeric')}\n${fn(lab,'parseSpanishNumeric','speechReadableText')}\n${fn(lab,'speechReadableText','speak').replace(/\basync\s*$/,'')}\nresult=[speechReadableText('5.886,73 €'),speechReadableText('18.4 °C'),speechReadableText('33,1 %'),speechReadableText('El total es 5.886,73 y la media 18.4.')];`,ctx);
  const [money,temp,pct,bare]=ctx.result||[];
  t('TTS dinero queda entero y sin punto',/cinco mil ochocientos ochenta y seis euros/i.test(money)&&!/[.,]\d/.test(money)&&!/punto|coma/i.test(money));
  t('TTS temperatura queda entera',/dieciocho grados/i.test(temp)&&!/[.,]\d/.test(temp));
  t('TTS porcentaje queda entero',/treinta y tres por ciento/i.test(pct)&&!/[.,]\d/.test(pct));
  t('TTS decimal español sin unidad no deja punto',!/5\.|886[,.]73|18\.4/.test(bare)&&!/punto|coma/i.test(bare));
}catch(e){console.error(e);t('helpers TTS ejecutables',false)}

console.log(`\nV3.13 response levels + clean recovery: ${ok} OK · ${ko} KO`);process.exit(ko?1:0);
