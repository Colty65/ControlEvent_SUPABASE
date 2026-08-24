const fs=require('fs'),vm=require('vm');
const svc=fs.readFileSync('services/event-ai.service.js','utf8');
const ui=fs.readFileSync('public/app/features/v11-3-zuzu-analitica-libre.js','utf8');
const voice=fs.readFileSync('public/app/features/v22-voz3-zuzu.js','utf8');
const ledger=fs.readFileSync('services/zuzu-conversation-ledger.service.js','utf8');
const route=fs.readFileSync('routes/event-ai.routes.js','utf8');
let pass=0,fail=0;function t(name,ok){if(ok){console.log('OK · '+name);pass++;}else{console.error('KO · '+name);fail++;}}

t('historial local ya no está capado a 50',/ZUZU_LOCAL_HISTORY_LIMIT=500/.test(ui)&&!(/slice\(-50\)/.test(ui)));
t('contador usa secuencia real del ledger',/function zuzuConversationTurnCount\(/.test(ui)&&/turnSeq:Number\(data\.turnSeq/.test(ui));
t('PDF sincroniza turnos del servidor antes del selector',/await syncZuzuConversationFromServer\(ZUZU_LOCAL_HISTORY_LIMIT\)/.test(ui));
t('PDF conserva número real de turno',/Turno '\+zuzuTurnNumber\(turn,idx\+1\)/.test(ui)&&/n=zuzuTurnNumber\(turn,item\.idx\+1\)/.test(ui));
t('backend permite recuperar hasta 1000 turnos',/Math\.min\(1000,Number\(limit\)\|\|500\)/.test(ledger)&&/limit:body\.limit\|\|500/.test(route));
t('solo queda un estado visual neutro de espera',/ZUZU_WAIT_STATUS='Zuzu está trabajando…'/.test(ui)&&!(/ZUZU_WAIT_PHRASES/.test(ui)));

const m=voice.match(/var ENTERTAINMENT_PHRASES=\[([\s\S]*?)\n  \];/);let phrases=[];if(m){phrases=[...m[1].matchAll(/'((?:\\'|[^'])*)'/g)].map(x=>x[1]);}
t('catálogo entretenimiento ampliado a 60',phrases.length>=60);
t('frases de entretenimiento son únicas',new Set(phrases).size===phrases.length);
t('entretenimiento usa deck persistente',/entertainmentDeck/.test(voice)&&/function refillEntertainmentDeck/.test(voice)&&/function nextEntertainmentIndex/.test(voice));
t('frase cancelada vuelve al deck y no se da por dicha',/requeueEntertainmentIndex\(idx\)/.test(voice)&&/u\.onerror=function\(\)\{entertainmentEnded\(false,idx\)/.test(voice));
t('frase completa se confirma al terminar',/u\.onend=function\(\)\{entertainmentEnded\(true,idx\)/.test(voice)&&/commitEntertainmentIndex\(idx\)/.test(voice));
t('respuesta sigue esperando 500 ms tras entretenimiento',/Math\.max\(0,500-/.test(voice));

t('prompt de voz conserva todos los puntos importantes',/NO un resumen telegráfico/.test(svc)&&/NO resumas la sustancia/.test(svc)&&/2 a 6 frases naturales/.test(svc));
t('hay control automático de cobertura hablada',/function v73SpokenCoverageNeedsRepair/.test(svc)&&/Zuzu completa la voz/.test(svc)&&/WRITTEN_ANSWER_VALIDO_Y_AUTORITATIVO/.test(svc));

const pf=svc.match(/function v73ProtocolViolation\(raw=\{\},plan=\{\}\)\{[\s\S]*?\n\}\nfunction v73RecentDistinctEntities/);
let protocol=null;if(pf){const code=pf[0].replace(/\nfunction v73RecentDistinctEntities[\s\S]*$/,'')+'\nthis.fn=v73ProtocolViolation;';const box={trim:v=>String(v==null?'':v).trim(),arr:v=>Array.isArray(v)?v:(v==null?[]:[v])};vm.createContext(box);vm.runInContext(code,box);protocol=box.fn;}
let bad='',good='';if(protocol){
 bad=protocol({action:'query',response_kind:'amount',query:{targets:[{domain:'donations'}],scope:{kind:'named_event',event:'E'},people:['A','B']}},{});
 good=protocol({action:'query',response_kind:'amount',query:{targets:[{domain:'donations'}],scope:{kind:'named_event',event:'E'},people:['A','B'],operations:[{type:'group',group_field:'Donante',metric:'Valor',metric_role:'amount',aggregation:'sum'}]}},{});
}
t('CE rechaza magnitud multi-entidad sin agregado',/sin agregación explícita/.test(bad));
t('CE acepta magnitud multi-entidad agrupada por Zuzu',good==='');
t('prompt obliga a no sumar filas crudas en comparaciones',/VARIAS personas\/donantes\/responsables\/tiendas\/productos/.test(svc)&&/nunca entregues filas crudas/.test(svc));

const sf=svc.match(/function v73SpokenCoverageNeedsRepair\(final=\{\},plan=\{\}\)\{[\s\S]*?\n\}/);let cov=null;if(sf){const box={trim:v=>String(v==null?'':v).trim()};vm.createContext(box);vm.runInContext(sf[0]+'\nthis.fn=v73SpokenCoverageNeedsRepair;',box);cov=box.fn;}
t('control detecta voz severamente comprimida',cov&&cov({written:'A'.repeat(500)+'. B'.repeat(10),spoken:'C'.repeat(100)},{action:'query'})===true);
t('control no fuerza ampliación en conversación meta',cov&&cov({written:'A'.repeat(500)+'. B'.repeat(10),spoken:'C'.repeat(100)},{action:'conversation'})===false);

console.log(`\nRAW14B · ${pass}/${pass+fail} comprobaciones OK`);process.exit(fail?1:0);
