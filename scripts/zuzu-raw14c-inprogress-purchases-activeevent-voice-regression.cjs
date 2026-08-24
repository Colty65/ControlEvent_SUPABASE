const fs=require('fs'),vm=require('vm');
const svc=fs.readFileSync('services/event-ai.service.js','utf8');
const voice=fs.readFileSync('public/app/features/v22-voz3-zuzu.js','utf8');
let pass=0,fail=0;function t(name,ok){if(ok){console.log('OK · '+name);pass++;}else{console.error('KO · '+name);fail++;}}

// Clasificación física: extraemos exactamente las funciones activas.
const helper=svc.match(/function ticketText\(row\)[\s\S]*?function valueOfLine\(row\)/);
const cls=svc.match(/function v274PurchaseClass\(row\)\{[\s\S]*?\n\}/);
let classify=null;if(helper&&cls){const code=helper[0].replace(/function valueOfLine\(row\)[\s\S]*$/,'')+'\n'+cls[0]+'\nthis.fn=v274PurchaseClass;';const box={trim:v=>String(v==null?'':v).trim(),firstNonEmpty:(...v)=>v.map(x=>String(x==null?'':x).trim()).find(Boolean)||''};vm.createContext(box);vm.runInContext(code,box);classify=box.fn;}
t('TKxx = realizada',classify&&classify({ticket:'TK01'})==='REALIZADA');
t('GASTOS CORRIENTES = realizada',classify&&classify({ticket:'GASTOS CORRIENTES'})==='REALIZADA');
t('ticket vacío = pendiente',classify&&classify({ticket:''})==='PENDIENTE');
t('texto no canónico no se da falsamente por realizado',classify&&classify({ticket:'SIN JUSTIFICAR'})==='PENDIENTE');
t('DONADO SOCIO queda fuera de compras',classify&&classify({ticket:'DONADO SOCIO'})==='DONACION');

t('status all excluye donaciones',/return kind!==['"]DONACION['"]/.test(svc));
t('evento En curso sin status fuerza all',/status=explicitStatus\|\|\(inProgress\?'all':'realized'\)/.test(svc));
t('facts informan realizadas y pendientes',/realized_purchase_count/.test(svc)&&/pending_purchase_count/.test(svc)&&/purchase_notice/.test(svc));
t('purchase_statuses llega al ejecutor',/const purchaseStatuses=\[\.\.\.new Set\(arr\(f\.purchase_statuses\)/.test(svc)&&/purchaseStatuses\.includes\('all'\)/.test(svc));

t('prompt define evento activo como selección de pantalla',/EVENTO ACTIVO de ControlEvent/.test(svc)&&/scope_kind="screen_event"/.test(svc));
t('continuación conserva CURRENT sobre pantalla',/CURRENT_CONTEXT\.scope manda sobre la pantalla/.test(svc));
t('prompt define realizadas y pendientes',/REALIZADA = compra no donada/.test(svc)&&/PENDIENTE\/PREVISTA/.test(svc)&&/Nunca ocultes pendientes por defecto/.test(svc));

t('aviso En curso es obligatorio y mecánico',/function v73InProgressEventNotice/.test(svc)&&/function v73EnsureInProgressNotice/.test(svc)&&/mandatory_event_notice/.test(svc));
t('local usa VIEW como autoridad factual',/view_is_authoritative:localAction/.test(svc)&&/source_facts_trimmed_for_local/.test(svc));
t('event_summary multievento ya es ejecutable',/EVENT_SUMMARY MULTIEVENTO/.test(svc)&&/name:'compare_events'/.test(svc));

t('voz corta no gasta tercera llamada IA',/fallback oral, sin nueva llamada IA/.test(svc)&&!/Zuzu completa la voz/.test(svc));
t('voz detecta más compresión',/ratio<0\.42/.test(svc));

// Bug real «40 líneas» -> «40 litrosíneas»: el patrón nuevo NO debe capturar la l de líneas.
const unitRx=/\b(\d+(?:[.,]\d+)?)\s*(ml|cl|lt|l|kg|gr|g|cm|mm)(?![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/gi;
t('40 líneas no se interpreta como 40 litros',!unitRx.test('40 líneas'));
unitRx.lastIndex=0;t('40 l sigue detectándose como litros',unitRx.test('40 l'));
t('código de voz contiene protección letras acentuadas',/\(\?!\[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\]\)/.test(voice));

t('traza activa identifica RAW14C',/CANDIDATOS TIPADOS RAW14C/.test(svc));
console.log(`\nRAW14C · ${pass}/${pass+fail} comprobaciones OK`);process.exit(fail?1:0);
