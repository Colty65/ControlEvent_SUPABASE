const fs=require('fs'),vm=require('vm');
const svc=fs.readFileSync('services/event-ai.service.js','utf8');
let pass=0,fail=0;function t(name,ok){if(ok){console.log('OK · '+name);pass++;}else{console.error('KO · '+name);fail++;}}
const trim=v=>String(v==null?'':v).trim(),arr=v=>Array.isArray(v)?v:[],norm=v=>trim(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),round=(v,d=2)=>Number(Number(v||0).toFixed(d));
const maybe=v=>{if(typeof v==='number'&&Number.isFinite(v))return v;let x=trim(v).replace(/\s/g,'').replace(/€/g,'');if(!/[0-9]/.test(x))return null;if(x.includes(',')&&x.includes('.'))x=x.lastIndexOf(',')>x.lastIndexOf('.')?x.replace(/\./g,'').replace(',','.'):x.replace(/,/g,'');else if(x.includes(','))x=x.replace(',','.');const n=Number(x);return Number.isFinite(n)?n:null;};

// Alias físicos emitidos realmente por Zuzu en el PDF RAW14D.
const nm=svc.match(/function v73NormalizeOperations\(raw=\[\]\)\{[\s\S]*?\n\}/);let normOps=null;if(nm){const box={arr,trim};vm.createContext(box);vm.runInContext(nm[0]+'\nthis.fn=v73NormalizeOperations;',box);normOps=box.fn;}
const f=normOps?normOps([{type:'filter',filter_field:'Responsable',filter_value:'Esther',filter_match_mode:'exact'}])[0]:{};
t('filter_field se conserva como field',f.field==='Responsable');
t('filter_value se conserva como value',f.value==='Esther');
t('filter_match_mode se conserva',f.match_mode==='exact');
const so=normOps?normOps([{type:'sort',field:'Suma Importe',order:'descending'}])[0]:{};
t('sort order=descending se normaliza a desc',so.field==='Suma Importe'&&so.direction==='desc');

// Una VIEW agrupada por responsable debe contar líneas de compra antes de agrupar.
const start=svc.indexOf('function v73RowsBeforeGrouping');const end=svc.indexOf('function v73RawFinalDataset',start);let factsFn=null;if(start>=0&&end>start){const code=svc.slice(start,end);const box={arr,trim,norm,round,v40MaybeNumber:maybe,v70MeaningfulFilter:()=>false,v70ApplyViewFilters:(rows)=>rows,v70FieldKey:(rs,q)=>{const nq=norm(q);return Object.keys(rs[0]||{}).find(k=>norm(k)===nq)||'';},v26Money:v=>round(v,2),isRealizedPurchaseTicket:v=>/^TK\d+$/i.test(trim(v))||/^GASTOS CORRIENTES$/i.test(trim(v)),isPendingTicket:v=>!trim(v)||/Pte\.Compra|PENDIENTE/i.test(trim(v))};vm.createContext(box);vm.runInContext(code+'\nthis.fn=v73FinalViewFacts;',box);factsFn=box.fn;}
const raw=[];for(let i=0;i<126;i++)raw.push({Responsable:i%7?'Colty':'Esther',Producto:'X',Importe:i<3?10:2,'Ticket u otros gastos':i<3?`TK0${i+1}`:'Pte.Compra',Tipo:i<3?'Realizada':'Pendiente'});
const grouped=[{Responsable:'Cito','Suma Importe':119.12},{Responsable:'Colty','Suma Importe':3210.72},{Responsable:'Esther','Suma Importe':433.68},{Responsable:'Emiliano','Suma Importe':328.4},{Responsable:'Gonzalo','Suma Importe':1051.45},{Responsable:'Juan Carlos García','Suma Importe':730},{Responsable:'María José Diaz','Suma Importe':7}];
const ff=factsFn?factsFn({domain:'purchases',rows:raw,facts:{event:'FUNCION 2026'},provenance:{source_args:{frame:{filters:{}}}}},{groupBy:['Responsable'],rowFilters:[]},grouped):{};
t('agrupación conserva 126 líneas físicas de compra',ff.purchase_line_count===126);
t('7 filas agrupadas se identifican como 7 grupos, no compras',ff.view_group_count===7&&/GRUPOS/.test(ff.view_row_semantics||''));
t('estado de compra se calcula antes de agrupar',ff.realized_purchase_count===3&&ff.pending_purchase_count===123);

// Contrato narrativo y persona en evento En curso.
t('event dossier expone Descripción como contexto',/event_description:trim\(ev\?\.descripcion\)/.test(svc));
t('event dossier expone textos de Documentos',/document_context:documentContext/.test(svc));
t('event dossier expone contexto TKxx',/purchase_ticket_context:purchaseTicketContext/.test(svc));
t('event dossier expone justificantes de ingreso',/income_receipt_context:incomeReceiptContext/.test(svc));
t('event dossier expone compras destacadas para explicar en qué se gasta',/purchase_highlights:purchaseHighlights/.test(svc));
t('prompt final obliga a mezclar contexto humano y KPI en resumen general',/CONTEXTO DE EVENTO/.test(svc)&&/no te limites a KPI/.test(svc));
t('historia-poesía-crónica conserva forma creativa sin inventar',/HISTORIA\/RELATO\/POESÍA\/CRÓNICA/.test(svc)&&/jamás inventar/.test(svc));
t('prohibido fabricar importes asociados',/PROHIBIDO FABRICAR «importe asociado»/.test(svc));
t('primera persona se liga al usuario logado',/REGLA DE SUJETO PERSONAL/.test(svc));
t('valoración de respuesta anterior sin petición factual es conversation',/REGLA DE EVALUACIÓN/.test(svc));
t('local no confunde Descripción documental con Descripción del evento',/ce_local solo transforma el SIGNIFICADO YA MATERIALIZADO/.test(svc));
t('person dossier incluye compras pendientes asignadas',/purchase_responsibility_pending_total/.test(svc)&&/TODAS las compras asignadas/.test(svc));
t('traza activa identifica RAW14E',/CANDIDATOS TIPADOS RAW14E/.test(svc));
console.log(`\nRAW14E · ${pass}/${pass+fail} comprobaciones OK`);process.exit(fail?1:0);
