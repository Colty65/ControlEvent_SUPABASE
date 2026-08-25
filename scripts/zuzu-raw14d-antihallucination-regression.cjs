const fs=require('fs'),vm=require('vm');
const svc=fs.readFileSync('services/event-ai.service.js','utf8');
let pass=0,fail=0;function t(name,ok){if(ok){console.log('OK · '+name);pass++;}else{console.error('KO · '+name);fail++;}}
const trim=v=>String(v==null?'':v).trim(),arr=v=>Array.isArray(v)?v:[],norm=v=>trim(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),round=(v,d=2)=>Number(Number(v||0).toFixed(d));
const maybe=v=>{if(typeof v==='number'&&Number.isFinite(v))return v;let x=trim(v).replace(/\s/g,'').replace(/€/g,'');if(!/[0-9]/.test(x))return null;if(x.includes(',')&&x.includes('.'))x=x.lastIndexOf(',')>x.lastIndexOf('.')?x.replace(/\./g,'').replace(',','.'):x.replace(/,/g,'');else if(x.includes(','))x=x.replace(',','.');const n=Number(x);return Number.isFinite(n)?n:null;};

// Stats over FULL view: first 18 rows intentionally contain only Cito/Colty.
const sm=svc.match(/function v73FinalColumnStats\(rows=\[\],columns=\[\]\)\{[\s\S]*?\n\}/);let stats=null;if(sm){const box={arr,trim,norm,round,v40MaybeNumber:maybe};vm.createContext(box);vm.runInContext(sm[0]+'\nthis.fn=v73FinalColumnStats;',box);stats=box.fn;}
const names=['Cito','Colty','Esther','Emiliano','Gonzalo','Juan Carlos García','María José Diaz'];const rows=[];for(let i=0;i<126;i++)rows.push({Responsable:i<9?'Cito':i<18?'Colty':names[2+((i-18)%5)]});const st=stats?stats(rows,['Responsable']):{};
t('column_stats se calcula sobre las 126 filas, no sobre las primeras 18',st?.Responsable?.count===126);
t('column_stats entrega todos los responsables aunque no estén en la muestra inicial',names.every(n=>st?.Responsable?.distinct_values?.includes(n)));
t('distinct_values se marca completo',st?.Responsable?.values_complete===true&&st?.Responsable?.distinct_count===7);

// Full-view facts override stale source totals after semantic filters.
const fm=svc.match(/function v73FinalViewFacts\(dataset=null,view=null,rows=\[\]\)\{[\s\S]*?\n\}/);let factsFn=null;if(fm){const box={arr,trim,norm,round,v40MaybeNumber:maybe,v70MeaningfulFilter:()=>true,v70FieldKey:(rs,q)=>{const ks=Object.keys(rs[0]||{});const nq=norm(q);return ks.find(k=>norm(k)===nq)||'';},v26Money:v=>round(v,2),isRealizedPurchaseTicket:v=>/^TK\d+$/i.test(trim(v))||/^GASTOS CORRIENTES$/i.test(trim(v)),isPendingTicket:v=>!trim(v)||/Pte\.Compra|PENDIENTE/i.test(trim(v))};vm.createContext(box);vm.runInContext(fm[0]+'\nthis.fn=v73FinalViewFacts;',box);factsFn=box.fn;}
const ds={domain:'purchases',facts:{event:'FUNCION 2026',purchase_line_count:126,realized_purchase_count:3,pending_purchase_count:123,total_amount:5880.37},provenance:{source_args:{frame:{filters:{people:['Colty']}}}}};const vr=[{Producto:'A',Importe:10,'Ticket u otros gastos':'TK01',Tipo:'REALIZADA'},{Producto:'B',Importe:20,'Ticket u otros gastos':'Pte.Compra',Tipo:'PENDIENTE'},{Producto:'C',Importe:30,'Ticket u otros gastos':'',Tipo:'PENDIENTE'}];const ff=factsFn?factsFn(ds,{},vr):{};
t('facts de la VIEW no heredan 126 filas del evento al filtrar una persona',ff.purchase_line_count===3&&ff.view_row_count===3);
t('realizadas/pendientes se recalculan sobre la VIEW actual',ff.realized_purchase_count===1&&ff.pending_purchase_count===2);
t('importe de la VIEW se recalcula, no usa el total global',ff.total_amount===60&&ff.realized_purchase_amount===10&&ff.pending_purchase_amount===50);

// Local purchase status survives normalization.
const nm=svc.match(/function v73NormalizeOperations\(raw=\[\]\)\{[\s\S]*?\n\}/);let normOps=null;if(nm){const box={arr,trim};vm.createContext(box);vm.runInContext(nm[0]+'\nthis.fn=v73NormalizeOperations;',box);normOps=box.fn;}
const no=normOps?normOps([{type:'filter',purchase_statuses:['realized']}]):[];
t('purchase_statuses de un filtro LOCAL ya no se pierde',JSON.stringify(no).includes('realized'));

// Prompt/packet anti-hallucination contract.
t('Gemini1 no debe usar fields para «por Responsable» o «una por una»',/fields significa EXCLUSIVAMENTE/.test(svc)&&/una por una por X/i.test(svc));
t('sort/group fuera de scope',/NUNCA metas order\/sort\/group dentro de scope/.test(svc));
t('pregunta abierta de personas usa dossier person',/DOSSIER DE PERSONAS/.test(svc)&&/domain="person"/.test(svc));
t('quiénes exige conjunto completo y group',/LISTAS DE QUIÉNES/.test(svc)&&/conjunto COMPLETO/.test(svc));
t('Gemini2 sabe que rows_sample no es universo completo',/rows_sample puede ser SOLO una muestra/.test(svc)&&/NUNCA deduzcas de rows_sample/.test(svc));
t('Gemini2 recibe column_stats completos',/column_stats:v73CompactFinalValue\(columnStats\)/.test(svc));
t('Gemini2 recibe payload autoritativo calculado por CE',/authoritative_ce_payload|authoritative_payload/.test(svc)&&/authoritativePayload:answerPayload/.test(svc));
t('contrato prohíbe contradicción texto/tabla',/COHERENCIA TEXTO\/TABLA/.test(svc)&&/está prohibido afirmar/.test(svc));
t('contrato prohíbe inventar campos ausentes',/Está prohibido mencionar productos, importes, personas, tiendas, tickets/.test(svc));
t('traza activa identifica RAW14D o evolución posterior',/CANDIDATOS TIPADOS RAW14(?:D|E)/.test(svc));
console.log(`\nRAW14D · ${pass}/${pass+fail} comprobaciones OK`);process.exit(fail?1:0);
