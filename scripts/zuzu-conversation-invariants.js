#!/usr/bin/env node
import { __zuzuStructuralTesting as T } from '../services/event-ai.service.js';

const state={
  eventos:[
    {id:'e25',titulo:'Cuotas vecinales y mantenimiento 2025',fechaIni:'2025-01-01',fechaFin:'2025-12-31',situacion:'Finalizado',precio:80},
    {id:'e26',titulo:'Cuotas vecinales y mantenimiento 2026',fechaIni:'2026-01-01',fechaFin:'2026-12-31',situacion:'En curso',precio:80},
    {id:'r3',titulo:'III Ruta Rural - OCT26',fechaIni:'2026-10-01',fechaFin:'2026-10-03',situacion:'Finalizado',precio:30},
    {id:'r4',titulo:'IV Ruta Rural - OCT27',fechaIni:'2027-10-01',fechaFin:'2027-10-03',situacion:'Finalizado',precio:30},
    {id:'abc',titulo:'ABC 2027',fechaIni:'2027-05-01',fechaFin:'2027-05-02',situacion:'Finalizado',precio:10},
    {id:'bbq',titulo:'Barbacoa Costa - MAY26',fechaIni:'2026-05-01',fechaFin:'2026-05-02',situacion:'Finalizado',precio:20}
  ],
  personas:[{id:'p1',nombre:'Nora',rango:'SOCIO'},{id:'p2',nombre:'Leo',rango:'SOCIO'}],
  productos:[],tiendas:[],compras:[],colaboradores:[]
};

let ok=0,fail=0;
function check(name,cond,detail=''){
  if(cond){ok++;console.log(`OK  ${name}`);}else{fail++;console.error(`KO  ${name}${detail?` · ${detail}`:''}`);}
}
const histEvent=name=>[{user:`Háblame de ${name}.`,assistant:'ok',resultContext:{domain:'event',event:name,focus:'event'}}];

const exact=T.v310RecentEventFocus(state,'Ahora cambia a Cuotas vecinales y mantenimiento 2026.',histEvent('Cuotas vecinales y mantenimiento 2025'));
check('entidad actual prevalece sobre foco heredado',exact?.event==='Cuotas vecinales y mantenimiento 2026'&&exact?.explicit===true,JSON.stringify(exact));

const rel=T.v325ResolveRelativeYearSibling(state,'¿Y las del año anterior?',histEvent('Cuotas vecinales y mantenimiento 2026'));
check('año anterior resuelve hermano canónico',rel==='Cuotas vecinales y mantenimiento 2025',rel);

const ord=T.v314ResolveOrdinalSibling(state,'¿Y la tercera?',histEvent('IV Ruta Rural - OCT27'));
check('ordinal elíptico resuelve hermano de serie',ord==='III Ruta Rural - OCT26',ord);

const cmpFocus=T.v325CurrentComparisonFocus(state,'Compara Cuotas vecinales y mantenimiento 2025 con Cuotas vecinales y mantenimiento 2026.',[]);
check('comparación conserva dos eventos',cmpFocus?.comparison===true&&cmpFocus?.eventNames?.length===2,JSON.stringify(cmpFocus));
const cmpArgs=T.v310ApplyEventFocusToArgs({toolName:'compare_events',args:{events:['Cuotas vecinales y mantenimiento 2025']},focus:cmpFocus,userPrompt:'Compara ambos',state,flowTrace:[]});
check('compare_events recibe el conjunto canónico completo',cmpArgs.events?.length===2,JSON.stringify(cmpArgs));

const compareResult={id:'cmp',name:'compare_events',ok:true,facts:{event_names:['Cuotas vecinales y mantenimiento 2025','Cuotas vecinales y mantenimiento 2026']},tables:[{key:'comparison',rows:[
  {Evento:'Cuotas vecinales y mantenimiento 2025',Ingresos:1000,'Compras realizadas':700,'Compras pendientes':0,'Donaciones valoradas':100,'Saldo operativo':300,'Valoración del evento':800,'Asistentes canónicos':20},
  {Evento:'Cuotas vecinales y mantenimiento 2026',Ingresos:900,'Compras realizadas':500,'Compras pendientes':50,'Donaciones valoradas':200,'Saldo operativo':350,'Valoración del evento':750,'Asistentes canónicos':22}
]}]};
const closure=T.v305CanonicalClosureFromResults('Compara los dos eventos',[compareResult],[]);
check('cierre canónico de comparación evita degradar a un evento',/compar/i.test(closure?.title||'')&&closure?.showTables?.[0]?.table_key==='comparison',JSON.stringify(closure));
const cmpHistory=[{user:'Compara ambos',assistant:'ok',resultContext:{domain:'comparison',eventNames:compareResult.facts.event_names,evidence:{kind:'event_comparison',complete:true,rows:[
  {event:compareResult.facts.event_names[0],income:1000,purchases:700,pending:0,donations:100,balance:300,valuation:800,attendees:20},
  {event:compareResult.facts.event_names[1],income:900,purchases:500,pending:50,donations:200,balance:350,valuation:750,attendees:22}
]}}}];
const cmpFollow=T.v325ComparisonDerivedFollowUp({userPrompt:'¿Y cuál tuvo más compras?',conversationHistory:cmpHistory,flowTrace:[],previousInteractionId:''});
check('follow-up comparativo no resucita otro foco',/Cuotas vecinales y mantenimiento 2025/.test(cmpFollow?.answer||'')&&/700/.test(cmpFollow?.answer||''),cmpFollow?.answer||'');

const factHistory=[{user:'¿Qué productos hubo?',assistant:'A, B y C',resultContext:{domain:'purchases',event:'Barbacoa Costa - MAY26',evidence:{kind:'product_set',complete:true,rows:[{label:'A',units:2,amount:30},{label:'B',units:5,amount:10},{label:'C',units:1,amount:20}],totalAmount:60,totalUnits:8,distinctCount:3}}}];
const min=T.v311DerivedFollowUp({userPrompt:'¿Y el de menor importe?',conversationHistory:factHistory,eventFocus:{event:'Barbacoa Costa - MAY26'},flowTrace:[],previousInteractionId:''});
check('mínimo usa el result-set, no Gemini',/B/.test(min?.answer||'')&&/10/.test(min?.answer||''),min?.answer||'');
const sum=T.v311DerivedFollowUp({userPrompt:'¿Cuánto suman todos?',conversationHistory:factHistory,eventFocus:{event:'Barbacoa Costa - MAY26'},flowTrace:[],previousInteractionId:''});
check('suma usa el result-set, no recarga datos',/60/.test(sum?.answer||''),sum?.answer||'');

const dossier={id:'pd',name:'person_dossier',ok:true,facts:{person:'Nora',event_count:4,income_linked_total:400,purchase_responsibility_total:125,purchase_responsibility_records:3,purchase_responsibility_ticket_count:2,donations_value:50,donation_lines:2,hitos_count:1,lg_count:2},tables:[
  {key:'summary_by_event',rows:[{Evento:'E1'},{Evento:'E2'}]},
  {key:'income_by_event',rows:[{Evento:'E1',Importe:400}]},
  {key:'purchase_by_event',rows:[{Evento:'E2',Importe:125}]},
  {key:'donations_by_event',rows:[{Evento:'E3',Importe:50}]},
  {key:'management_by_event',rows:[{Evento:'E4'}]}
]};
const personHistory=[{user:'¿Tiene donaciones?',assistant:'sí',resultContext:{domain:'person',subject:'Nora',focus:'donations'}}];
const personEvents=T.v325PersonGroundingDirect({userPrompt:'¿En qué eventos concretamente?',grounding:{subject:'Nora',result:dossier,explicitSubject:false},conversationHistory:personHistory,flowTrace:[],previousInteractionId:''});
check('follow-up personal conserva la dimensión inmediata',/E3/.test(personEvents?.answer||'')&&!/E2/.test(personEvents?.answer||''),personEvents?.answer||'');
const personPurch=T.v325PersonGroundingDirect({userPrompt:'¿Qué compras tuvo?',grounding:{subject:'Nora',result:dossier,explicitSubject:false},conversationHistory:[],flowTrace:[],previousInteractionId:''});
check('compras personales usan dossier global fresco',/125/.test(personPurch?.answer||'')&&/3 registros/.test(personPurch?.answer||''),personPurch?.answer||'');

const epistemic=T.v314UnsupportedConsumptionAttribution('¿Quién gastó más dinero personalmente en Barbacoa Costa - MAY26?',{event:'Barbacoa Costa - MAY26'},[], '');
check('gasto personal no se confunde con responsable de compra',epistemic?.title==='Dato no deducible',epistemic?.answer||'');

// Matriz parametrizada: los nombres son sintéticos y cambian en cada caso para evitar
// que una corrección pueda pasar la suite por reconocer ejemplos de negocio concretos.
const roots=['Alameda','Brisa','Cedro','Delta','Encina','Faro','Granito','Horizonte','Iris','Jade','Karma','Luna'];
for(let i=0;i<roots.length;i++){
  const root=roots[i],a=`Plan ${root} de mantenimiento 2025`,b=`Plan ${root} de mantenimiento 2026`;
  const st={...state,eventos:[
    {id:`${i}a`,titulo:a,fechaIni:'2025-01-01',fechaFin:'2025-12-31'},
    {id:`${i}b`,titulo:b,fechaIni:'2026-01-01',fechaFin:'2026-12-31'},
    {id:`${i}x`,titulo:`Encuentro ${root} 2026 (Edición Especial)`,fechaIni:'2026-04-01',fechaFin:'2026-04-03'},
    {id:`${i}z`,titulo:`Otro proyecto ${root} 2026`,fechaIni:'2026-06-01',fechaFin:'2026-06-03'}
  ]};
  const h=histEvent(b);
  const r1=T.v325ResolveRelativeYearSibling(st,'¿Y las del año anterior?',h);
  check(`matriz ${i+1}: año relativo`,r1===a,r1);
  const r2=T.v310RecentEventFocus(st,`¿Qué persona fue responsable de más compras en Encuentro ${root} 2026?`,histEvent(a));
  check(`matriz ${i+1}: evento incrustado gana al heredado`,r2?.event===`Encuentro ${root} 2026 (Edición Especial)`&&r2?.explicit===true,JSON.stringify(r2));
  const cp=T.v325CurrentComparisonFocus(st,`Compara ${a} con ${b}.`,[]);
  check(`matriz ${i+1}: comparación A/B`,cp?.eventNames?.length===2&&cp.eventNames.includes(a)&&cp.eventNames.includes(b),JSON.stringify(cp));
  const ca=T.v310ApplyEventFocusToArgs({toolName:'compare_events',args:{events:[a]},focus:cp,userPrompt:'Compara ambos',state:st,flowTrace:[]});
  check(`matriz ${i+1}: compare args conserva A/B`,ca.events?.length===2,JSON.stringify(ca));
}

for(let i=1;i<=10;i++){
  const event=`Evento Sintético ${i} - 2026`,rows=[
    {label:`Producto ${i}-A`,units:i+1,amount:10+i},
    {label:`Producto ${i}-B`,units:i+3,amount:30+i},
    {label:`Producto ${i}-C`,units:i+2,amount:20+i}
  ];
  const totalAmount=rows.reduce((a,r)=>a+r.amount,0),totalUnits=rows.reduce((a,r)=>a+r.units,0);
  const h=[{resultContext:{domain:'purchases',event,evidence:{kind:'product_set',complete:true,rows,totalAmount,totalUnits,distinctCount:3}}}];
  const args={conversationHistory:h,eventFocus:{event},flowTrace:[],previousInteractionId:''};
  check(`resultset ${i}: suma`,new RegExp(String(totalAmount)).test(T.v311DerivedFollowUp({userPrompt:'¿Cuánto suman todos?',...args})?.answer||''));
  check(`resultset ${i}: unidades`,new RegExp(String(totalUnits).replace('.',',' )).test((T.v311DerivedFollowUp({userPrompt:'¿Cuántas unidades se compraron en total?',...args})?.answer||'').replace('.',',')));
  check(`resultset ${i}: count`,/3 productos distintos/.test(T.v311DerivedFollowUp({userPrompt:'¿Cuántos productos distintos se compraron?',...args})?.answer||''));
  check(`resultset ${i}: max`,new RegExp(`Producto ${i}-B`).test(T.v311DerivedFollowUp({userPrompt:'¿Cuál fue el producto de mayor importe?',...args})?.answer||''));
  check(`resultset ${i}: min`,new RegExp(`Producto ${i}-A`).test(T.v311DerivedFollowUp({userPrompt:'¿Y el de menor importe?',...args})?.answer||''));
  check(`resultset ${i}: sort`,new RegExp(`Producto ${i}-B`).test(T.v311DerivedFollowUp({userPrompt:'Ordénamelos de mayor a menor importe.',...args})?.answer||''));
  check(`resultset ${i}: list`,new RegExp(`Producto ${i}-A`).test(T.v311DerivedFollowUp({userPrompt:'¿Qué productos fueron?',...args})?.answer||''));
}

for(let i=1;i<=8;i++){
  const who=`Persona Sintética ${i}`,pd={id:`pd${i}`,name:'person_dossier',ok:true,facts:{person:who,event_count:3,income_linked_total:100*i,purchase_responsibility_total:25*i,purchase_responsibility_records:i,purchase_responsibility_ticket_count:Math.max(1,Math.ceil(i/2)),donations_value:5*i,donation_lines:1,hitos_count:i%2,lg_count:i%3},tables:[
    {key:'summary_by_event',rows:[{Evento:`E${i}A`},{Evento:`E${i}B`},{Evento:`E${i}C`}]},
    {key:'income_by_event',rows:[{Evento:`E${i}A`,Importe:100*i}]},
    {key:'purchase_by_event',rows:[{Evento:`E${i}B`,Importe:25*i}]},
    {key:'donations_by_event',rows:[{Evento:`E${i}C`,Importe:5*i}]},
    {key:'management_by_event',rows:[]}
  ]};
  const g={subject:who,result:pd,explicitSubject:false};
  const pi=T.v325PersonGroundingDirect({userPrompt:'¿Qué ingresos tiene vinculados?',grounding:g,conversationHistory:[],flowTrace:[],previousInteractionId:''});
  check(`persona ${i}: ingresos frescos`,new RegExp(String(100*i)).test(pi?.answer||''),pi?.answer||'');
  const pp=T.v325PersonGroundingDirect({userPrompt:'¿Qué compras tuvo?',grounding:g,conversationHistory:[],flowTrace:[],previousInteractionId:''});
  check(`persona ${i}: compras frescas`,new RegExp(String(25*i)).test(pp?.answer||''),pp?.answer||'');
  const pe=T.v325PersonGroundingDirect({userPrompt:'¿En qué eventos concretamente?',grounding:g,conversationHistory:[{resultContext:{domain:'person',subject:who,focus:'donations'}}],flowTrace:[],previousInteractionId:''});
  check(`persona ${i}: dimensión donaciones`,new RegExp(`E${i}C`).test(pe?.answer||'')&&!new RegExp(`E${i}B`).test(pe?.answer||''),pe?.answer||'');
}

for(const phrase of ['¿Quién gastó más dinero personalmente?','¿Quién pagó más de su bolsillo?','¿Quién bebió más?','¿Quién comió más?']){
  const guard=T.v314UnsupportedConsumptionAttribution(phrase,{event:'Evento Sintético'},[], '');
  check(`guardia epistemológica: ${phrase}`,guard?.title==='Dato no deducible',guard?.answer||'');
}

console.log(`\nResultado: ${ok} OK / ${fail} KO`);
if(fail)process.exit(1);
