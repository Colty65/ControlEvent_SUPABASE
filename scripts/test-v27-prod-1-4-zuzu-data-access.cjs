#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sourcePath = path.join(__dirname, '..', 'services', 'event-ai.service.js');
const source = fs.readFileSync(sourcePath, 'utf8');

function extractFunction(name) {
  const marker = `function ${name}(`;
  const asyncMarker = `async function ${name}(`;
  let start = source.indexOf(marker);
  if (start < 0) start = source.indexOf(asyncMarker);
  if (start < 0) throw new Error(`No encuentro ${name}`);
  const parenStart = source.indexOf('(', start);
  let parenDepth = 0, headerQuote = '', headerEscaped = false, bodyStart = -1;
  for (let i = parenStart; i < source.length; i += 1) {
    const ch = source[i];
    if (headerQuote) {
      if (headerEscaped) { headerEscaped = false; continue; }
      if (ch === '\\') { headerEscaped = true; continue; }
      if (ch === headerQuote) headerQuote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { headerQuote = ch; continue; }
    if (ch === '(') parenDepth += 1;
    else if (ch === ')') { parenDepth -= 1; if (parenDepth === 0) { bodyStart = source.indexOf('{', i); break; } }
  }
  if (bodyStart < 0) throw new Error(`No encuentro cuerpo de ${name}`);
  let depth = 0, quote = '', escaped = false, lineComment = false, blockComment = false;
  for (let i = bodyStart; i < source.length; i += 1) {
    const ch = source[i], next = source[i + 1] || '';
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && next === '/') { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '/' && next === '/') { lineComment = true; i += 1; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i += 1; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Cuerpo incompleto de ${name}`);
}

const sandbox = {console, Date, Number, String, Set, Map, Math};
sandbox.text = v => String(v ?? '');
sandbox.trim = v => String(v ?? '').trim();
sandbox.arr = v => Array.isArray(v) ? v : [];
sandbox.num = v => { const n=Number(v); return Number.isFinite(n)?n:0; };
sandbox.round = (v,d=2) => Number((Number(v)||0).toFixed(d));
sandbox.norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/gi,' ').replace(/\s+/g,' ').trim();
sandbox.byId = rows => new Map((rows||[]).map(r=>[String(r.id||''),r]));
sandbox.ticketText = row => String(row.ticketDonacion || row.ticket_donacion || row.ticket || row.ticketOtrosGastos || '').trim();
sandbox.isDonationTicket = v => /^DONADO/i.test(String(v||''));
sandbox.isPendingTicket = v => /Pte\.?\s*Compra|PENDIENTE/i.test(String(v||''));
sandbox.valueOfLine = row => Number(row.importe ?? ((Number(row.unidades)||0)*(Number(row.precio)||0))) || 0;
sandbox.v26Money = n => Number((Number(n)||0).toFixed(2));
sandbox.v26FormatEuro = n => `${Number(n||0).toFixed(2).replace('.',',')} €`;
sandbox.v26TextSchema = label => ({type:'text',label});
sandbox.v26MoneySchema = label => ({type:'money',label,numeric:true,unit:'€'});
sandbox.v26DateSchema = label => ({type:'date',label});
sandbox.v26StatusSchema = label => ({type:'status',label});
sandbox.v26CountSchema = (unit,label) => ({type:'count',unit,label,numeric:true});
sandbox.v26SchemaField = (type,unit,label) => ({type,unit,label,numeric:['number','quantity','money','count'].includes(type)});
sandbox.v26Table = (key,title,rows,schema) => ({key,title,rows,schema});
sandbox.semanticResolveEntity = (state,type,value) => {
  const rows = type==='store'?state.tiendas:[];
  const q=sandbox.norm(value); const matches=rows.filter(r=>sandbox.norm(r.nombre)===q || sandbox.norm(r.nombre).includes(q));
  return matches.length===1?{ok:true,id:matches[0].id,nombre:matches[0].nombre}:{ok:false,ambiguous:matches.length>1,candidates:matches};
};
sandbox.v26ResolveEvent = (state,selected,event,scope) => {
  let row=null;
  if(scope==='active_event') row=(state.eventos||[]).find(e=>e.id===selected);
  else if(event) { const q=sandbox.norm(event); row=(state.eventos||[]).find(e=>sandbox.norm(e.titulo)===q || sandbox.norm(e.titulo).includes(q)); }
  if(!row && selected) row=(state.eventos||[]).find(e=>e.id===selected);
  return row?{ok:true,id:row.id,nombre:row.titulo,row}:{ok:false,error:'Evento no encontrado'};
};
vm.createContext(sandbox);

[
  'v274CatalogEntity','v274CatalogQueryMatch','v274CatalogSchema','v274PurchaseClass',
  'v274ResolveOptionalStore','v274PurchaseRowsForEvent','v274ToolMasterCatalog',
  'v274ToolEventPurchaseLines','v274DataAccessRequirement'
].forEach(name => vm.runInContext(`${extractFunction(name)}\nthis.${name}=${name};`, sandbox));

const tests=[];
function test(name,fn){tests.push([name,fn]);}
function assert(cond,msg){if(!cond)throw new Error(msg||'assertion failed');}
function eq(a,b,msg){if(a!==b)throw new Error(`${msg||'valor inesperado'}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);}

const state={
  eventos:[{id:'e1',titulo:'Evento de prueba',precio:25,fechaIni:'01/08/2026',fechaFin:'02/08/2026',situacion:'Finalizado',descripcion:'Prueba'}],
  tiendas:[{id:'s1',nombre:'Tienda Uno'},{id:'s2',nombre:'Tienda Dos'}],
  personas:[{id:'p1',nombre:'Persona Uno',rango:'SOCIO'},{id:'p2',nombre:'Persona Dos',rango:'NO SOCIO'}],
  productos:[
    {id:'pr1',nombre:'Producto A',segmento:'S1',destino:'D1',defaultPrecio:10,defaultTiendaId:'s1'},
    {id:'pr2',nombre:'Producto B',segmento:'S2',destino:'D2',defaultPrecio:5,defaultTiendaId:'s1'},
    {id:'pr3',nombre:'Producto C',segmento:'S3',destino:'D3',defaultPrecio:8,defaultTiendaId:'s2'}
  ],
  compras:[
    {id:'c1',eventId:'e1',productoId:'pr1',unidades:2,precio:10,ticketDonacion:'TK01',tiendaId:'s1',responsableId:'p1'},
    {id:'c2',eventId:'e1',productoId:'pr1',unidades:1,precio:12,ticketDonacion:'TK02',tiendaId:'s2',responsableId:'p2'},
    {id:'c3',eventId:'e1',productoId:'pr2',unidades:3,precio:5,ticketDonacion:'TK03',tiendaId:'s1',responsableId:'p1'},
    {id:'c4',eventId:'e1',productoId:'pr3',unidades:4,precio:8,ticketDonacion:'Pte. Compra',tiendaId:'s2',responsableId:'p1'},
    {id:'c5',eventId:'e1',productoId:'pr3',unidades:2,precio:8,ticketDonacion:'DONADO SOCIO',tiendaId:'s2',responsableId:'p2'}
  ]
};

test('D1: lista general de productos se enruta al catálogo maestro',()=>{
  const r=sandbox.v274DataAccessRequirement('Dame solo una lista general de productos con su precio',[]);
  eq(r.catalogEntity,'products'); assert(!r.purchaseDetail);
});
test('todos los productos comprados se enruta a detalle, no al catálogo maestro por accidente',()=>{
  const r=sandbox.v274DataAccessRequirement('Dame todos los productos comprados en este evento con unidades, precio e importe',[]);
  eq(r.catalogEntity,''); assert(r.purchaseDetail);
});
test('D2: catálogo completo más métricas de compra exige ambas fuentes',()=>{
  const r=sandbox.v274DataAccessRequirement('Quiero una lista general de todo el almacén y al lado, si procede, las unidades, el precio y el importe de la compra en el evento',[]);
  eq(r.catalogEntity,'products'); assert(r.purchaseDetail); assert(r.catalogWithEvent);
});
test('catálogos de tiendas, personas y eventos son detectables',()=>{
  eq(sandbox.v274DataAccessRequirement('Lista general de tiendas',[]).catalogEntity,'stores');
  eq(sandbox.v274DataAccessRequirement('Tabla general de personas',[]).catalogEntity,'people');
  eq(sandbox.v274DataAccessRequirement('Catálogo de eventos',[]).catalogEntity,'events');
});
test('acceso/credenciales queda marcado como restringido',()=>{
  const r=sandbox.v274DataAccessRequirement('Dame las credenciales de acceso de los usuarios',[]);
  assert(r.accessRestricted); eq(r.catalogEntity,'');
});
test('catálogo de productos devuelve todos los productos maestros',async()=>{
  const r=await sandbox.v274ToolMasterCatalog({id:'m1',name:'master_catalog',entity:'products'},state,'e1');
  const t=r.tables.find(x=>x.key==='catalog'); eq(t.rows.length,3); eq(r.facts.record_count,3);
});
test('catálogo + evento conserva productos no comprados y superpone lo comprado',async()=>{
  const r=await sandbox.v274ToolMasterCatalog({id:'m2',name:'master_catalog',entity:'products',scope:'active_event',purchase_status:'realized'},state,'e1');
  const t=r.tables.find(x=>x.key==='catalog_with_event_purchases'); eq(t.rows.length,3);
  const a=t.rows.find(x=>x.Producto==='Producto A'); eq(a['Unidades compra evento'],3); eq(a['Importe compra evento'],32); assert(a['Precio(s) compra evento'].includes('10,00 €')&&a['Precio(s) compra evento'].includes('12,00 €'));
  const c=t.rows.find(x=>x.Producto==='Producto C'); eq(c['Unidades compra evento'],0); eq(c['Importe compra evento'],0);
});
test('detalle de compras realizadas conserva cada línea y sus campos',async()=>{
  const r=await sandbox.v274ToolEventPurchaseLines({id:'p1',name:'event_purchase_lines',scope:'active_event',status:'realized'},state,'e1');
  const t=r.tables.find(x=>x.key==='purchase_lines'); eq(t.rows.length,3); eq(r.facts.product_count,2); eq(r.facts.total_amount,47);
  const row=t.rows[0]; ['Producto','Segmento','Destino','Unidades','Precio','Importe','Ticket u otros gastos','Tienda','Responsable','Tipo'].forEach(k=>assert(Object.prototype.hasOwnProperty.call(row,k),`falta ${k}`));
});
test('detalle por tienda filtra líneas, no solo total agregado',async()=>{
  const r=await sandbox.v274ToolEventPurchaseLines({id:'p2',name:'event_purchase_lines',scope:'active_event',status:'realized',store:'Tienda Uno'},state,'e1');
  const t=r.tables.find(x=>x.key==='purchase_lines'); eq(t.rows.length,2); assert(t.rows.every(x=>x.Tienda==='Tienda Uno'));
});
test('la herramienta master_catalog no expone entity users/access',()=>{
  const block=source.slice(source.indexOf('function v261AgentTools'),source.indexOf('function v261SystemInstruction'));
  assert(block.includes("enum:['products','stores','people','events']"),'enum catálogo inesperado');
  assert(!/enum:\[[^\]]*users/.test(block),'users no debe formar parte del catálogo');
});
test('la presentación exhaustiva no recorta catálogos/detalle a 160 filas',()=>{
  const fn=extractFunction('v26BuildPresentation');
  assert(fn.includes("['master_catalog','event_purchase_lines']"),'falta excepción exhaustiva');
  assert(fn.includes('exhaustiveTool?arr(t.rows):arr(t.rows).slice(0,160)'),'los catálogos/detalle deben materializar todas las filas, sin límite fijo');
});
test('el agente exige las fuentes obligatorias antes de finalizar',()=>{
  const fn=extractFunction('runZuzuV261InteractionsAgent');
  assert(fn.includes('haveRequiredMaster'),'falta garantía catálogo');
  assert(fn.includes('haveRequiredPurchase'),'falta garantía detalle compras');
  assert(fn.includes('V27.1.4 · Garantía de cobertura'),'falta reintento de cobertura');
});
test('la producción nueva no hardcodea casos concretos de prueba',()=>{
  const start=source.indexOf('// v27_prod_1.4 · Acceso de solo lectura a catálogos generales');
  const end=source.indexOf('function v261AgentTools',start);
  const block=source.slice(start,end);
  ['FUNCION 2025','SySA 2026','Pocholo','Carmelo'].forEach(v=>assert(!block.includes(v),`hardcode detectado: ${v}`));
});

(async()=>{
  let passed=0;
  for(const [name,fn] of tests){
    try{await fn();passed+=1;}
    catch(error){console.error(`KO · ${name}: ${error.message}`);process.exitCode=1;}
  }
  if(!process.exitCode)console.log(`OK ${passed} pruebas v27_prod_1.4: ${tests.map(x=>x[0]).join(' · ')}`);
})();
