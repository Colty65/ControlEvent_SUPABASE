import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '../lib/supabase.js';

const SETTLEMENTS_TABLE = 'ce_purchase_settlements';
const MOVEMENTS_TABLE = 'ce_purchase_cash_movements';
const TICKETS_TABLE = 'ce_purchase_settlement_tickets';
const PURCHASES_TABLE = 'ce_compras';
const PEOPLE_TABLE = 'ce_personas';
const EVENTS_TABLE = 'ce_eventos';
const PRODUCTS_TABLE = 'ce_productos';
const STORES_TABLE = 'ce_tiendas';
const BANK_LINKS_TABLE = 'ce_bank_ticket_links';

const text = value => value == null ? '' : String(value).trim();
const upper = value => text(value).toUpperCase();
const round2 = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const amount = value => {
  if(typeof value === 'number') return Number.isFinite(value) ? round2(value) : 0;
  let raw = text(value).replace(/[^0-9,.-]/g, '');
  if(raw.includes(',') && raw.includes('.')) raw = raw.replace(/\./g, '').replace(',', '.');
  else raw = raw.replace(',', '.');
  const n = Number(raw);
  return Number.isFinite(n) ? round2(n) : 0;
};
const nowIso = () => new Date().toISOString();
const arr = value => Array.isArray(value) ? value : [];

function db(){ return getSupabaseAdmin(); }
function fail(message, status = 400, code = 'PURCHASE_SETTLEMENT_VALIDATION'){
  const error = new Error(message);
  error.status = status;
  error.code = code;
  throw error;
}
function normalizeActor(actor = {}){
  const raw = actor && typeof actor === 'object' ? actor : {};
  return {
    nivel: upper(raw.nivel || raw.Nivel),
    identificacion: text(raw.identificacion || raw.Identificacion),
    nombre: text(raw.nombre || raw.Nombre)
  };
}
function requireActor(actor){
  const clean = normalizeActor(actor);
  if(!['GD','RW','RO'].includes(clean.nivel)) fail('No se ha podido identificar el nivel del usuario para Liquidaciones.', 403, 'PURCHASE_SETTLEMENT_ACTOR_REQUIRED');
  return clean;
}
function requireWriter(actor){
  const clean = requireActor(actor);
  if(!['GD','RW'].includes(clean.nivel)) fail('Los usuarios RO solo pueden consultar Liquidaciones; no pueden añadir, modificar, reabrir ni cerrar registros.', 403, 'PURCHASE_SETTLEMENT_READ_ONLY');
  return clean;
}
function actorLabel(actor){
  const clean = normalizeActor(actor);
  return clean.identificacion || clean.nombre || clean.nivel || 'ControlEvent';
}
function friendlyDbError(error){
  const message = text(error?.message || error);
  if(/ce_purchase_settlements|ce_purchase_cash_movements|ce_purchase_settlement_tickets|relation .* does not exist|schema cache|pgrst205|42p01/i.test(message)){
    const out = new Error('El módulo Liquidaciones todavía no está creado en Supabase. Ejecuta sql/ControlEvent_SQL_V4_1_EXP_LIQUIDACIONES_COMPRAS.sql en el SQL Editor y vuelve a abrir la ventana.');
    out.status = 503;
    out.code = 'PURCHASE_SETTLEMENT_SCHEMA_MISSING';
    return out;
  }
  return error;
}
function normalizeTicket(value){
  const match = upper(value).match(/\bTK\s*0*(\d+)[A-Z0-9_-]*\b/);
  return match ? `TK${String(Number(match[1])).padStart(2, '0')}` : '';
}
function isDonationTicket(value){ return /^DONADO\s+(TIENDA|SOCIO|OTROS)$/i.test(text(value)); }
function validBusinessDate(value){
  const raw = text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
}
function normalizeDirection(value){
  const dir = upper(value);
  if(!['DEBE','HABER'].includes(dir)) fail('Debe/Haber debe ser DEBE o HABER.', 400, 'PURCHASE_SETTLEMENT_DIRECTION');
  return dir;
}
function normalizeStatus(value){ return upper(value) === 'CERRADA' ? 'CERRADA' : 'ABIERTA'; }
function normalizeSettlementCode(value){ return upper(value).replace(/[^A-Z0-9_-]/g, ''); }
function createSettlementCode(){
  const d = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(d);
  const map = Object.fromEntries(parts.map(p => [p.type,p.value]));
  return `LQ-${map.year}${map.month}${map.day}-${map.hour}${map.minute}-${randomUUID().slice(0,4).toUpperCase()}`;
}
function resultFor({debe = 0, haber = 0, tickets = 0} = {}){
  const balance = round2(amount(debe) - amount(haber) - amount(tickets));
  if(Math.abs(balance) < 0.005) return {balance:0,kind:'CUADRADA',amount:0,label:'Liquidación cuadrada'};
  if(balance > 0) return {balance,kind:'PERSONA_DEBE_PENA',amount:balance,label:'La persona debe devolver dinero a la Peña'};
  return {balance,kind:'PENA_DEBE_PERSONA',amount:Math.abs(balance),label:'La Peña debe abonar dinero a la persona'};
}
export function computePurchaseSettlementTotals(movements = [], tickets = []){
  const debe = round2(arr(movements).filter(row => upper(row.direction || row.direccion) === 'DEBE').reduce((sum,row)=>sum+amount(row.amount ?? row.importe),0));
  const haber = round2(arr(movements).filter(row => upper(row.direction || row.direccion) === 'HABER').reduce((sum,row)=>sum+amount(row.amount ?? row.importe),0));
  const ticketTotal = round2(arr(tickets).reduce((sum,row)=>sum+amount(row.amount ?? row.ticketAmount ?? row.ticket_amount_snapshot),0));
  return {debe,haber,tickets:ticketTotal,...resultFor({debe,haber,tickets:ticketTotal})};
}
async function selectAll(makeQuery, pageSize = 1000){
  const out = [];
  for(let from = 0; ; from += pageSize){
    const {data,error} = await makeQuery().range(from, from + pageSize - 1);
    if(error) throw error;
    const rows = arr(data);
    out.push(...rows);
    if(rows.length < pageSize) break;
    if(from > 200000) fail('Demasiados registros al leer Liquidaciones.', 500, 'PURCHASE_SETTLEMENT_TOO_MANY_ROWS');
  }
  return out;
}
async function eventExists(eventId){
  const id = text(eventId);
  if(!id) fail('Selecciona un evento antes de abrir Liquidaciones.');
  const {data,error} = await db().from(EVENTS_TABLE).select('id,titulo,descripcion').eq('id',id).maybeSingle();
  if(error) throw error;
  if(!data) fail('No se encuentra el evento seleccionado.',404,'PURCHASE_SETTLEMENT_EVENT_NOT_FOUND');
  return data;
}
async function peopleMap(){
  const rows = await selectAll(()=>db().from(PEOPLE_TABLE).select('id,nombre,rango,nombre_amigo').order('nombre'));
  return new Map(rows.map(row=>[text(row.id),{id:text(row.id),name:text(row.nombre)||text(row.nombre_amigo)||text(row.id),range:upper(row.rango||'SOCIO')} ]));
}
async function purchaseRows(eventId){
  return selectAll(()=>db().from(PURCHASES_TABLE)
    .select('id,event_id,producto_id,unidades,precio,ticket_donacion,tienda_id,responsable_id,created_at,updated_at')
    .eq('event_id',text(eventId)).order('created_at',{ascending:true}));
}
async function namedCatalogMap(table){
  const rows=await selectAll(()=>db().from(table).select('id,nombre').order('nombre'));
  return new Map(rows.map(row=>[text(row.id),text(row.nombre)||text(row.id)]));
}
function purchaseResponsibleIds(rows){
  return new Set(arr(rows).filter(row=>!isDonationTicket(row.ticket_donacion)).map(row=>text(row.responsable_id)).filter(Boolean));
}
async function validatePeople(eventId, cashPersonId, counterpartyPersonId, cached = null){
  const persons = cached?.persons || await peopleMap();
  const purchases = cached?.purchases || await purchaseRows(eventId);
  const cash = persons.get(text(cashPersonId));
  if(!cash) fail('La persona responsable de la caja no existe.',400,'PURCHASE_SETTLEMENT_CASH_PERSON');
  if(cash.range !== 'SOCIO') fail('La persona que entrega/recibe dinero de la Peña debe ser SOCIO.',400,'PURCHASE_SETTLEMENT_CASH_PERSON_NOT_SOCIO');
  const counterparty = persons.get(text(counterpartyPersonId));
  if(!counterparty) fail('La persona destino no existe.',400,'PURCHASE_SETTLEMENT_COUNTERPARTY');
  const responsibleIds = purchaseResponsibleIds(purchases);
  if(!responsibleIds.has(counterparty.id)) fail('La persona destino no figura como responsable de ninguna compra del evento. Reasigna primero alguna compra a esa persona.',400,'PURCHASE_SETTLEMENT_COUNTERPARTY_NOT_PURCHASE_RESPONSIBLE');
  return {cash,counterparty,persons,purchases,responsibleIds};
}
function movementFromDb(row, persons = new Map()){
  const cash = persons.get(text(row.cash_person_id));
  const counterparty = persons.get(text(row.counterparty_person_id));
  return {
    id:text(row.id), eventId:text(row.event_id), settlementId:text(row.settlement_id),
    cashPersonId:text(row.cash_person_id), cashPersonName:text(cash?.name || row.cash_person_name_snapshot || ''),
    counterpartyPersonId:text(row.counterparty_person_id), counterpartyPersonName:text(counterparty?.name || row.counterparty_person_name_snapshot || ''),
    date:text(row.movement_date), description:text(row.description), direction:upper(row.direction), amount:amount(row.amount), observations:text(row.observations),
    status:normalizeStatus(row.status), createdBy:text(row.created_by), updatedBy:text(row.updated_by), createdAt:text(row.created_at), updatedAt:text(row.updated_at)
  };
}
function ticketFromDb(row, persons = new Map()){
  const p = persons.get(text(row.responsible_person_id));
  return {
    id:text(row.id), settlementId:text(row.settlement_id), eventId:text(row.event_id), ticketCode:normalizeTicket(row.ticket_code) || text(row.ticket_code),
    amount:amount(row.ticket_amount_snapshot), responsiblePersonId:text(row.responsible_person_id),
    responsiblePersonName:text(row.responsible_person_name_snapshot || p?.name || ''), purchaseIds:arr(row.purchase_ids), createdAt:text(row.created_at)
  };
}
function settlementFromDb(row, persons = new Map()){
  const cash = persons.get(text(row.cash_person_id));
  const counterparty = persons.get(text(row.counterparty_person_id));
  return {
    id:text(row.id), code:text(row.settlement_code), eventId:text(row.event_id),
    cashPersonId:text(row.cash_person_id), cashPersonName:text(row.cash_person_name_snapshot || cash?.name || ''),
    counterpartyPersonId:text(row.counterparty_person_id), counterpartyPersonName:text(row.counterparty_person_name_snapshot || counterparty?.name || ''),
    description:text(row.description), status:normalizeStatus(row.status),
    totalDebe:amount(row.total_debe), totalHaber:amount(row.total_haber), totalTickets:amount(row.total_tickets), resultBalance:amount(row.result_balance),
    closedAt:text(row.closed_at), closedBy:text(row.closed_by), reopenedAt:text(row.reopened_at), reopenedBy:text(row.reopened_by),
    createdAt:text(row.created_at), updatedAt:text(row.updated_at)
  };
}
async function bankLinkedTicketSet(eventId){
  try{
    const links = await selectAll(()=>db().from(BANK_LINKS_TABLE).select('event_id,ticket_code').eq('event_id',text(eventId)).order('ticket_code'));
    return {available:true,set:new Set(links.map(row=>normalizeTicket(row.ticket_code)).filter(Boolean))};
  }catch(error){
    const msg = text(error?.message || error);
    if(/ce_bank_ticket_links|relation .* does not exist|schema cache|pgrst205|42p01/i.test(msg)) return {available:false,set:new Set()};
    throw error;
  }
}
function aggregateTickets(purchases, persons, products=new Map(), stores=new Map()){
  const map = new Map();
  for(const row of arr(purchases)){
    if(isDonationTicket(row.ticket_donacion)) continue;
    const code = normalizeTicket(row.ticket_donacion);
    if(!code) continue;
    if(!map.has(code)) map.set(code,{ticketCode:code,amount:0,responsibleIds:new Set(),purchaseIds:[],productIds:new Set(),productTotals:new Map(),storeIds:new Set(),lineCount:0});
    const target = map.get(code);
    target.amount = round2(target.amount + amount(row.unidades) * amount(row.precio));
    const responsibleId = text(row.responsable_id);
    if(responsibleId) target.responsibleIds.add(responsibleId);
    const productId=text(row.producto_id),storeId=text(row.tienda_id);
    if(productId){ target.productIds.add(productId); target.productTotals.set(productId,round2((target.productTotals.get(productId)||0)+amount(row.unidades)*amount(row.precio))); }
    if(storeId) target.storeIds.add(storeId);
    if(text(row.id)) target.purchaseIds.push(text(row.id));
    target.lineCount += 1;
  }
  return [...map.values()].map(item=>{
    const responsibleIds=[...item.responsibleIds];
    const mixedResponsible=responsibleIds.length>1;
    const responsibleId=responsibleIds.length===1?responsibleIds[0]:'';
    const productHighlights=[...item.productTotals.entries()].map(([id,total])=>({productId:id,name:products.get(id)||id,amount:round2(total)})).filter(x=>text(x.name)).sort((a,b)=>b.amount-a.amount||text(a.name).localeCompare(text(b.name),'es',{sensitivity:'base'}));
    const productNames=productHighlights.map(x=>x.name);
    const storeNames=[...item.storeIds].map(id=>stores.get(id)||'').filter(Boolean);
    return {
      ticketCode:item.ticketCode,amount:round2(item.amount),responsibleId,
      responsibleName:responsibleId?(persons.get(responsibleId)?.name||''):'',
      responsibleNames:responsibleIds.map(id=>persons.get(id)?.name||id),
      mixedResponsible,purchaseIds:item.purchaseIds,lineCount:item.lineCount,
      productNames:[...new Set(productNames)],productHighlights,storeNames:[...new Set(storeNames)]
    };
  }).sort((a,b)=>Number(a.ticketCode.replace(/\D/g,''))-Number(b.ticketCode.replace(/\D/g,'')));
}
async function rawSettlementData(eventId){
  const id = text(eventId);
  const persons = await peopleMap();
  const purchases = await purchaseRows(id);
  const [settlementsRaw,movementsRaw,ticketsRaw,bank,products,stores] = await Promise.all([
    selectAll(()=>db().from(SETTLEMENTS_TABLE).select('*').eq('event_id',id).order('created_at',{ascending:false})),
    selectAll(()=>db().from(MOVEMENTS_TABLE).select('*').eq('event_id',id).order('movement_date',{ascending:true}).order('created_at',{ascending:true})),
    selectAll(()=>db().from(TICKETS_TABLE).select('*').eq('event_id',id).order('ticket_code',{ascending:true})),
    bankLinkedTicketSet(id),
    namedCatalogMap(PRODUCTS_TABLE),
    namedCatalogMap(STORES_TABLE)
  ]);
  const settlements=settlementsRaw.map(row=>settlementFromDb(row,persons));
  const movements=movementsRaw.map(row=>movementFromDb(row,persons));
  const aggregated=aggregateTickets(purchases,persons,products,stores);
  const aggregatedByCode=new Map(aggregated.map(ticket=>[ticket.ticketCode,ticket]));
  const tickets=ticketsRaw.map(row=>{const ticket=ticketFromDb(row,persons),live=aggregatedByCode.get(ticket.ticketCode);return live?{...ticket,storeNames:live.storeNames||[],productNames:live.productNames||[],productHighlights:live.productHighlights||[]}:ticket;});
  const ticketsBySettlement=new Map();
  tickets.forEach(ticket=>{if(!ticketsBySettlement.has(ticket.settlementId))ticketsBySettlement.set(ticket.settlementId,[]);ticketsBySettlement.get(ticket.settlementId).push(ticket);});
  const movementsBySettlement=new Map();
  movements.forEach(movement=>{if(!movement.settlementId)return;if(!movementsBySettlement.has(movement.settlementId))movementsBySettlement.set(movement.settlementId,[]);movementsBySettlement.get(movement.settlementId).push(movement);});
  settlements.forEach(row=>{
    row.movements=movementsBySettlement.get(row.id)||[];
    row.tickets=ticketsBySettlement.get(row.id)||[];
    row.calculated=computePurchaseSettlementTotals(row.movements,row.tickets);
  });
  const settlementLinkByTicket=new Map(tickets.map(ticket=>[ticket.ticketCode,ticket.settlementId]));
  const eligibleTickets=aggregated.filter(ticket=>!ticket.mixedResponsible&&!bank.set.has(ticket.ticketCode)&&!settlementLinkByTicket.has(ticket.ticketCode));
  const responsibleIds=purchaseResponsibleIds(purchases);
  const cashPeople=[...persons.values()].filter(p=>p.range==='SOCIO').sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'}));
  const purchasePeople=[...responsibleIds].map(id=>persons.get(id)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'}));
  return {persons,products,stores,purchases,settlements,movements,tickets,aggregatedTickets:aggregated,eligibleTickets,cashPeople,purchasePeople,bankLinkCheckAvailable:bank.available,bankLinkedTickets:[...bank.set],settlementLinkByTicket};
}
function buildPairSummaries(data){
  const byPair=new Map();
  const ticketsBySettlement=new Map(data.settlements.map(s=>[s.id,s.tickets||[]]));
  for(const movement of data.movements){
    const key=`${movement.cashPersonId}|${movement.counterpartyPersonId}`;
    if(!byPair.has(key)) byPair.set(key,{key,cashPersonId:movement.cashPersonId,cashPersonName:movement.cashPersonName,counterpartyPersonId:movement.counterpartyPersonId,counterpartyPersonName:movement.counterpartyPersonName,openCount:0,closedCount:0,debe:0,haber:0,tickets:0,closedSettlements:0});
    const row=byPair.get(key);
    if(movement.status==='CERRADA')row.closedCount++;else row.openCount++;
    if(movement.direction==='DEBE')row.debe=round2(row.debe+movement.amount);else row.haber=round2(row.haber+movement.amount);
  }
  for(const settlement of data.settlements){
    const key=`${settlement.cashPersonId}|${settlement.counterpartyPersonId}`;
    if(!byPair.has(key)) byPair.set(key,{key,cashPersonId:settlement.cashPersonId,cashPersonName:settlement.cashPersonName,counterpartyPersonId:settlement.counterpartyPersonId,counterpartyPersonName:settlement.counterpartyPersonName,openCount:0,closedCount:0,debe:0,haber:0,tickets:0,closedSettlements:0});
    const row=byPair.get(key);
    if(settlement.status==='CERRADA') row.closedSettlements++;
    row.tickets=round2(row.tickets+arr(ticketsBySettlement.get(settlement.id)).reduce((s,t)=>s+t.amount,0));
  }
  return [...byPair.values()].map(row=>({...row,...resultFor({debe:row.debe,haber:row.haber,tickets:row.tickets})})).sort((a,b)=>a.counterpartyPersonName.localeCompare(b.counterpartyPersonName,'es',{sensitivity:'base'})||a.cashPersonName.localeCompare(b.cashPersonName,'es',{sensitivity:'base'}));
}
export async function getPurchaseSettlementReadModel(eventId, options = {}){
  try{
    const event=await eventExists(eventId);
    const data=await rawSettlementData(eventId);
    const personId=text(options.personId||options.person_id);
    const wantedStatus=upper(options.settlementStatus||options.settlement_status||'ALL');
    const detail=upper(options.detail||'STANDARD')==='FULL'?'FULL':'STANDARD';
    const statusOk=value=>wantedStatus==='ALL'||(wantedStatus==='OPEN'&&normalizeStatus(value)==='ABIERTA')||(wantedStatus==='CLOSED'&&normalizeStatus(value)==='CERRADA')||(wantedStatus==='ABIERTA'&&normalizeStatus(value)==='ABIERTA')||(wantedStatus==='CERRADA'&&normalizeStatus(value)==='CERRADA');
    const personOk=row=>!personId||text(row.cashPersonId||row.cash_person_id)===personId||text(row.counterpartyPersonId||row.counterparty_person_id)===personId||text(row.responsiblePersonId||row.responsible_person_id)===personId;
    const settlements=data.settlements.filter(row=>personOk(row)&&statusOk(row.status));
    const settlementIds=new Set(settlements.map(row=>text(row.id)).filter(Boolean));
    const movements=data.movements.filter(row=>personOk(row)&&statusOk(row.status)&&(!text(row.settlementId)||settlementIds.has(text(row.settlementId))));
    const tickets=data.tickets.filter(row=>settlementIds.has(text(row.settlementId))&&personOk(row));
    const openMovements=movements.filter(row=>normalizeStatus(row.status)==='ABIERTA');
    const openSettlementIds=new Set(settlements.filter(row=>normalizeStatus(row.status)==='ABIERTA').map(row=>text(row.id)).filter(Boolean));
    const openTickets=tickets.filter(row=>openSettlementIds.has(text(row.settlementId)));
    const openTotals=computePurchaseSettlementTotals(openMovements,openTickets);
    const closed=settlements.filter(row=>normalizeStatus(row.status)==='CERRADA');
    const closedDebe=round2(closed.reduce((sum,row)=>sum+amount(row.totalDebe),0));
    const closedHaber=round2(closed.reduce((sum,row)=>sum+amount(row.totalHaber),0));
    const closedTickets=round2(closed.reduce((sum,row)=>sum+amount(row.totalTickets),0));
    const codeById=new Map(settlements.map(row=>[text(row.id),text(row.code)]));
    const settlementRows=settlements.map(row=>({
      Código:row.code,Estado:row.status,'Responsable caja':row.cashPersonName,'Responsable compras':row.counterpartyPersonName,
      Descripción:row.description,DEBE:row.totalDebe,HABER:row.totalHaber,'Ticket/s':row.totalTickets,Saldo:row.resultBalance,
      'Cerrada el':row.closedAt||'', 'Reabierta el':row.reopenedAt||''
    }));
    const movementRows=movements.map(row=>({
      Fecha:row.date,'Responsable caja':row.cashPersonName,'Responsable compras':row.counterpartyPersonName,Descripción:row.description,
      'Debe/Haber':row.direction,Importe:row.amount,Observaciones:row.observations||'',Estado:row.status,Liquidación:codeById.get(text(row.settlementId))||'ABIERTA SIN CERRAR'
    }));
    const ticketRows=tickets.map(row=>({
      Liquidación:codeById.get(text(row.settlementId))||'',Ticket:row.ticketCode,Tienda:arr(row.storeNames).join(' · '),
      Productos:arr(row.productHighlights).slice(0,2).map(x=>text(x?.name)).filter(Boolean).join(', ')+(arr(row.productHighlights).length>2?', y más........':''),
      Responsable:row.responsiblePersonName,Importe:row.amount
    }));
    const ticketCodes=new Set(tickets.map(row=>normalizeTicket(row.ticketCode)).filter(Boolean));
    const fullProductRows=detail==='FULL'?data.purchases.filter(row=>ticketCodes.has(normalizeTicket(row.ticket_donacion))).map(row=>{
      const ticketCode=normalizeTicket(row.ticket_donacion),productId=text(row.producto_id),storeId=text(row.tienda_id),responsibleId=text(row.responsable_id),units=amount(row.unidades),price=amount(row.precio);
      return {Ticket:ticketCode,Producto:text(data.products?.get(productId)||productId),Unidades:units,Precio:price,Importe:round2(units*price),Tienda:text(data.stores?.get(storeId)||storeId),Responsable:text(data.persons?.get(responsibleId)?.name||responsibleId)};
    }).sort((a,b)=>a.Ticket.localeCompare(b.Ticket,'es',{numeric:true})||b.Importe-a.Importe||a.Producto.localeCompare(b.Producto,'es',{sensitivity:'base'})):[];
    return {
      ok:true,event:{id:text(event.id),title:text(event.titulo||event.descripcion||event.id)},personId,settlementStatus:wantedStatus,detail,
      facts:{
        settlement_count:settlements.length,open_settlement_count:settlements.filter(row=>normalizeStatus(row.status)==='ABIERTA').length,
        closed_settlement_count:closed.length,open_movement_count:openMovements.length,ticket_count:tickets.length,
        open_debe:openTotals.debe,open_haber:openTotals.haber,open_tickets:openTotals.tickets,open_balance:openTotals.balance,open_result_kind:openTotals.kind,
        closed_debe:closedDebe,closed_haber:closedHaber,closed_tickets:closedTickets,detail_level:detail.toLowerCase(),full_product_line_count:fullProductRows.length,
        debe_semantics:'DEBE = sale dinero de la caja de la Peña hacia la persona responsable de compras.',
        haber_semantics:'HABER = entra dinero en la caja de la Peña desde la persona responsable de compras.'
      },
      settlements,movements,tickets,pairSummaries:buildPairSummaries(data).filter(personOk),
      tables:{settlements:settlementRows,movements:movementRows,tickets:ticketRows,products:fullProductRows}
    };
  }catch(error){throw friendlyDbError(error);}
}

export async function listPurchaseSettlements(eventId, actor = {}){
  try{
    requireActor(actor);
    const event=await eventExists(eventId);
    const data=await rawSettlementData(eventId);
    return {
      ok:true,event:{id:text(event.id),title:text(event.titulo||event.descripcion||event.id)},
      permissions:{canWrite:['GD','RW'].includes(normalizeActor(actor).nivel),role:normalizeActor(actor).nivel},
      cashPeople:data.cashPeople,purchasePeople:data.purchasePeople,
      movements:data.movements,settlements:data.settlements,eligibleTickets:data.eligibleTickets,
      allTickets:data.aggregatedTickets.map(ticket=>({...ticket,bankReconciled:data.bankLinkedTickets.includes(ticket.ticketCode),settlementId:data.settlementLinkByTicket.get(ticket.ticketCode)||''})),
      pairSummaries:buildPairSummaries(data),bankLinkCheckAvailable:data.bankLinkCheckAvailable,
      warnings:[
        ...(!data.bankLinkCheckAvailable?['No se ha podido comprobar ce_bank_ticket_links; el módulo de Cuadre Banco no parece instalado.']:[]),
        ...data.aggregatedTickets.filter(t=>t.mixedResponsible).map(t=>`${t.ticketCode} tiene líneas con responsables distintos (${t.responsibleNames.join(', ')}); no se ofrece para liquidar hasta corregir el responsable de sus compras.`)
      ]
    };
  }catch(error){ throw friendlyDbError(error); }
}
function movementPayload(input, people){
  const row={
    event_id:text(input.eventId||input.event_id),
    cash_person_id:text(input.cashPersonId||input.cash_person_id),
    counterparty_person_id:text(input.counterpartyPersonId||input.counterparty_person_id),
    movement_date:validBusinessDate(input.date||input.movementDate||input.movement_date),
    description:text(input.description||input.descripcion),
    direction:normalizeDirection(input.direction||input.debeHaber||input.debe_haber),
    amount:amount(input.amount||input.importe),
    observations:text(input.observations||input.observaciones)||null
  };
  if(!row.event_id) fail('Selecciona un evento.');
  if(!row.movement_date) fail('Indica una fecha válida.');
  if(!row.description) fail('Indica una descripción para el movimiento.');
  if(row.amount<=0) fail('El importe debe ser mayor que cero.');
  row.cash_person_name_snapshot=people?.cash?.name||null;
  row.counterparty_person_name_snapshot=people?.counterparty?.name||null;
  return row;
}
export async function createPurchaseCashMovement(input = {}, actor = {}){
  try{
    const user=requireWriter(actor);
    const event=await eventExists(input.eventId||input.event_id);
    const people=await validatePeople(event.id,input.cashPersonId||input.cash_person_id,input.counterpartyPersonId||input.counterparty_person_id);
    const row={id:randomUUID(),...movementPayload({...input,eventId:event.id},{cash:people.cash,counterparty:people.counterparty}),settlement_id:null,status:'ABIERTA',created_by:actorLabel(user),updated_by:actorLabel(user),created_at:nowIso(),updated_at:nowIso()};
    const {data,error}=await db().from(MOVEMENTS_TABLE).insert(row).select('*').single();
    if(error)throw error;
    return {ok:true,movement:movementFromDb(data,people.persons)};
  }catch(error){throw friendlyDbError(error);}
}
async function movementRow(id){
  const {data,error}=await db().from(MOVEMENTS_TABLE).select('*').eq('id',text(id)).maybeSingle();
  if(error)throw error;
  if(!data)fail('No se encuentra el movimiento de liquidación.',404,'PURCHASE_SETTLEMENT_MOVEMENT_NOT_FOUND');
  return data;
}
async function settlementRow(id){
  const {data,error}=await db().from(SETTLEMENTS_TABLE).select('*').eq('id',text(id)).maybeSingle();
  if(error)throw error;
  if(!data)fail('No se encuentra la liquidación.',404,'PURCHASE_SETTLEMENT_NOT_FOUND');
  return data;
}
async function assertMovementOpen(row){
  if(normalizeStatus(row.status)!=='ABIERTA') fail('El movimiento pertenece a una liquidación cerrada. Reabre primero la liquidación para modificarlo.',409,'PURCHASE_SETTLEMENT_MOVEMENT_CLOSED');
  if(text(row.settlement_id)){
    const settlement=await settlementRow(row.settlement_id);
    if(normalizeStatus(settlement.status)!=='ABIERTA') fail('La liquidación está cerrada. Reábrela antes de modificar sus movimientos.',409,'PURCHASE_SETTLEMENT_CLOSED');
  }
}
export async function updatePurchaseCashMovement(id,input={},actor={}){
  try{
    const user=requireWriter(actor);
    const old=await movementRow(id);
    await assertMovementOpen(old);
    const eventId=text(old.event_id);
    if(text(input.eventId||input.event_id) && text(input.eventId||input.event_id)!==eventId) fail('No se puede mover un registro de liquidación a otro evento.');
    const people=await validatePeople(eventId,input.cashPersonId||input.cash_person_id||old.cash_person_id,input.counterpartyPersonId||input.counterparty_person_id||old.counterparty_person_id);
    const next=movementPayload({
      eventId,
      cashPersonId:input.cashPersonId||input.cash_person_id||old.cash_person_id,
      counterpartyPersonId:input.counterpartyPersonId||input.counterparty_person_id||old.counterparty_person_id,
      date:input.date||input.movementDate||input.movement_date||old.movement_date,
      description:input.description??input.descripcion??old.description,
      direction:input.direction||input.debeHaber||input.debe_haber||old.direction,
      amount:input.amount??input.importe??old.amount,
      observations:input.observations??input.observaciones??old.observations
    },{cash:people.cash,counterparty:people.counterparty});
    const patch={...next,updated_by:actorLabel(user),updated_at:nowIso()};
    const {data,error}=await db().from(MOVEMENTS_TABLE).update(patch).eq('id',text(id)).select('*').single();
    if(error)throw error;
    return {ok:true,movement:movementFromDb(data,people.persons)};
  }catch(error){throw friendlyDbError(error);}
}
export async function deletePurchaseCashMovement(id,eventId,actor={}){
  try{
    requireWriter(actor);
    const row=await movementRow(id);
    if(eventId && text(row.event_id)!==text(eventId)) fail('El movimiento no pertenece al evento seleccionado.',409,'PURCHASE_SETTLEMENT_WRONG_EVENT');
    await assertMovementOpen(row);
    if(text(row.settlement_id)) fail('Un movimiento de una liquidación reabierta no se elimina de forma aislada. Modifícalo y vuelve a cerrar la liquidación.',409,'PURCHASE_SETTLEMENT_REOPENED_DELETE');
    const {error}=await db().from(MOVEMENTS_TABLE).delete().eq('id',text(id));
    if(error)throw error;
    return {ok:true,deletedId:text(id)};
  }catch(error){throw friendlyDbError(error);}
}
async function ticketsForEvent(eventId, persons, purchases, settlementId=''){
  const [bank,existingLinks] = await Promise.all([
    bankLinkedTicketSet(eventId),
    selectAll(()=>db().from(TICKETS_TABLE).select('*').eq('event_id',text(eventId)).order('ticket_code'))
  ]);
  const existingByCode=new Map(existingLinks.map(row=>[normalizeTicket(row.ticket_code),row]));
  const [products,stores]=await Promise.all([namedCatalogMap(PRODUCTS_TABLE),namedCatalogMap(STORES_TABLE)]);
  return {bank,existingLinks,existingByCode,aggregated:aggregateTickets(purchases,persons,products,stores),settlementId:text(settlementId)};
}
function validateSelectedTickets(ticketCodes, ticketData, counterpartyId){
  const wanted=[...new Set(arr(ticketCodes).map(normalizeTicket).filter(Boolean))];
  const aggregatedByCode=new Map(ticketData.aggregated.map(t=>[t.ticketCode,t]));
  const selected=[];
  for(const code of wanted){
    const ticket=aggregatedByCode.get(code);
    if(!ticket) fail(`${code} no existe como TKxx realizado en este evento.`,400,'PURCHASE_SETTLEMENT_TICKET_NOT_FOUND');
    if(ticket.mixedResponsible) fail(`${code} tiene líneas asignadas a responsables distintos. Corrige las compras antes de liquidarlo.`,409,'PURCHASE_SETTLEMENT_TICKET_MIXED_RESPONSIBLE');
    if(ticket.responsibleId!==text(counterpartyId)) fail(`${code} no está asignado a la persona destino de esta liquidación.`,409,'PURCHASE_SETTLEMENT_TICKET_WRONG_PERSON');
    if(ticketData.bank.set.has(code)) fail(`${code} ya está apareado/justificado en Cuadre Banco y no se ofrece para esta liquidación.`,409,'PURCHASE_SETTLEMENT_TICKET_BANK_RECONCILED');
    const previous=ticketData.existingByCode.get(code);
    if(previous && text(previous.settlement_id)!==ticketData.settlementId) fail(`${code} ya forma parte de otra liquidación.`,409,'PURCHASE_SETTLEMENT_TICKET_ALREADY_USED');
    selected.push(ticket);
  }
  return selected;
}
async function fullSettlement(id){
  const row=await settlementRow(id);
  const persons=await peopleMap();
  const [movementsRaw,ticketsRaw,purchases,products,stores]=await Promise.all([
    selectAll(()=>db().from(MOVEMENTS_TABLE).select('*').eq('settlement_id',text(id)).order('movement_date').order('created_at')),
    selectAll(()=>db().from(TICKETS_TABLE).select('*').eq('settlement_id',text(id)).order('ticket_code')),
    purchaseRows(row.event_id),
    namedCatalogMap(PRODUCTS_TABLE),
    namedCatalogMap(STORES_TABLE)
  ]);
  const aggregatedByCode=new Map(aggregateTickets(purchases,persons,products,stores).map(ticket=>[ticket.ticketCode,ticket]));
  const settlement=settlementFromDb(row,persons);
  settlement.movements=movementsRaw.map(r=>movementFromDb(r,persons));
  settlement.tickets=ticketsRaw.map(r=>{const ticket=ticketFromDb(r,persons),live=aggregatedByCode.get(ticket.ticketCode);return live?{...ticket,storeNames:live.storeNames||[],productNames:live.productNames||[],productHighlights:live.productHighlights||[]}:ticket;});
  settlement.calculated=computePurchaseSettlementTotals(settlement.movements,settlement.tickets);
  return settlement;
}
export async function closePurchaseSettlement(input={},actor={}){
  try{
    const user=requireWriter(actor);
    const event=await eventExists(input.eventId||input.event_id);
    const movementIds=[...new Set(arr(input.movementIds||input.movement_ids).map(text).filter(Boolean))];
    if(!movementIds.length) fail('Selecciona al menos una transacción abierta para liquidar.');
    const {data:movementRows,error:movementError}=await db().from(MOVEMENTS_TABLE).select('*').in('id',movementIds);
    if(movementError)throw movementError;
    if(arr(movementRows).length!==movementIds.length)fail('Alguna transacción seleccionada ya no existe.',409,'PURCHASE_SETTLEMENT_MOVEMENT_MISSING');
    if(arr(movementRows).some(row=>text(row.event_id)!==text(event.id)))fail('Todas las transacciones deben pertenecer al evento seleccionado.',409,'PURCHASE_SETTLEMENT_MIXED_EVENT');
    for(const row of movementRows) await assertMovementOpen(row);
    const pairKeys=new Set(movementRows.map(row=>`${text(row.cash_person_id)}|${text(row.counterparty_person_id)}`));
    if(pairKeys.size!==1)fail('Una liquidación solo puede contener movimientos de la misma pareja responsable de caja ↔ persona destino.',409,'PURCHASE_SETTLEMENT_MIXED_PAIR');
    const settlementIds=[...new Set(movementRows.map(row=>text(row.settlement_id)).filter(Boolean))];
    if(settlementIds.length>1)fail('No se pueden mezclar movimientos de liquidaciones reabiertas distintas.',409,'PURCHASE_SETTLEMENT_MIXED_SETTLEMENT');
    if(settlementIds.length===1 && movementRows.some(row=>!text(row.settlement_id)))fail('No se pueden mezclar movimientos nuevos con una liquidación reabierta. Cierra cada bloque por separado.',409,'PURCHASE_SETTLEMENT_REOPENED_WITH_NEW');
    let existingSettlementId=settlementIds[0]||'';
    if(existingSettlementId){
      const allReopened=await selectAll(()=>db().from(MOVEMENTS_TABLE).select('id,status').eq('settlement_id',existingSettlementId));
      const allIds=new Set(allReopened.map(row=>text(row.id)));
      if(allIds.size!==movementIds.length || movementIds.some(id=>!allIds.has(id)))fail('Para volver a cerrar una liquidación reabierta debes incluir todos sus movimientos.',409,'PURCHASE_SETTLEMENT_REOPENED_PARTIAL');
    }
    const cashPersonId=text(movementRows[0].cash_person_id),counterpartyId=text(movementRows[0].counterparty_person_id);
    const people=await validatePeople(event.id,cashPersonId,counterpartyId);
    const ticketData=await ticketsForEvent(event.id,people.persons,people.purchases,existingSettlementId);
    const selectedTickets=validateSelectedTickets(input.ticketCodes||input.ticket_codes||[],ticketData,counterpartyId);
    const movementModels=movementRows.map(row=>movementFromDb(row,people.persons));
    const now=nowIso();
    let settlementId=existingSettlementId;
    let settlementCode='';
    const description=text(input.description||input.descripcion)||[...new Set(movementRows.map(row=>text(row.description)).filter(Boolean))].join(' · ').slice(0,600)||`Liquidación ${people.counterparty.name}`;
    let createdNew=false;
    if(existingSettlementId){
      const current=await settlementRow(existingSettlementId);
      if(normalizeStatus(current.status)!=='ABIERTA')fail('La liquidación ya está cerrada.',409,'PURCHASE_SETTLEMENT_ALREADY_CLOSED');
      settlementCode=text(current.settlement_code)||createSettlementCode();
    }else{
      settlementId=randomUUID();settlementCode=createSettlementCode();createdNew=true;
      const {error}=await db().from(SETTLEMENTS_TABLE).insert({
        id:settlementId,settlement_code:settlementCode,event_id:event.id,cash_person_id:cashPersonId,counterparty_person_id:counterpartyId,
        cash_person_name_snapshot:people.cash.name,counterparty_person_name_snapshot:people.counterparty.name,description,status:'ABIERTA',
        total_debe:0,total_haber:0,total_tickets:0,result_balance:0,
        closed_at:null,closed_by:null,created_at:now,updated_at:now
      });
      if(error)throw error;
    }
    // Inserta primero nuevos TKxx. La restricción UNIQUE(event_id,ticket_code) evita doble liquidación incluso con dos sesiones simultáneas.
    const currentLinks=ticketData.existingLinks.filter(row=>text(row.settlement_id)===settlementId);
    const currentCodes=new Set(currentLinks.map(row=>normalizeTicket(row.ticket_code)).filter(Boolean));
    const selectedCodes=new Set(selectedTickets.map(row=>row.ticketCode));
    const newTicketRows=selectedTickets.filter(row=>!currentCodes.has(row.ticketCode)).map(ticket=>({
      id:randomUUID(),settlement_id:settlementId,event_id:event.id,ticket_code:ticket.ticketCode,ticket_amount_snapshot:ticket.amount,
      responsible_person_id:counterpartyId,responsible_person_name_snapshot:people.counterparty.name,purchase_ids:ticket.purchaseIds,created_at:now
    }));
    const removed=currentLinks.filter(row=>!selectedCodes.has(normalizeTicket(row.ticket_code))).map(row=>text(row.id)).filter(Boolean);
    try{
      if(newTicketRows.length){const {error}=await db().from(TICKETS_TABLE).insert(newTicketRows);if(error)throw error;}
      if(removed.length){const {error}=await db().from(TICKETS_TABLE).delete().in('id',removed);if(error)throw error;}
      const {error:movementUpdateError}=await db().from(MOVEMENTS_TABLE).update({settlement_id:settlementId,status:'CERRADA',updated_by:actorLabel(user),updated_at:now}).in('id',movementIds);
      if(movementUpdateError)throw movementUpdateError;
      const finalTickets=selectedTickets.map(ticket=>({amount:ticket.amount}));
      const finalTotals=computePurchaseSettlementTotals(movementModels,finalTickets);
      const {error:finalHeaderError}=await db().from(SETTLEMENTS_TABLE).update({
        settlement_code:settlementCode,cash_person_id:cashPersonId,counterparty_person_id:counterpartyId,
        cash_person_name_snapshot:people.cash.name,counterparty_person_name_snapshot:people.counterparty.name,description,
        total_debe:finalTotals.debe,total_haber:finalTotals.haber,total_tickets:finalTotals.tickets,result_balance:finalTotals.balance,
        status:'CERRADA',closed_at:now,closed_by:actorLabel(user),updated_at:now
      }).eq('id',settlementId);
      if(finalHeaderError)throw finalHeaderError;
    }catch(persistError){
      // Rollback compensatorio: deja el bloque como estaba ABIERTO si alguna escritura intermedia falla.
      try{await db().from(MOVEMENTS_TABLE).update({settlement_id:createdNew?null:settlementId,status:'ABIERTA',updated_by:actorLabel(user),updated_at:nowIso()}).in('id',movementIds);}catch(_){}
      try{await db().from(TICKETS_TABLE).delete().eq('settlement_id',settlementId);}catch(_){}
      if(createdNew){
        try{await db().from(SETTLEMENTS_TABLE).delete().eq('id',settlementId);}catch(_){}
      }else{
        try{
          if(currentLinks.length){
            const restore=currentLinks.map(row=>({
              id:row.id,settlement_id:row.settlement_id,event_id:row.event_id,ticket_code:row.ticket_code,
              ticket_amount_snapshot:row.ticket_amount_snapshot,responsible_person_id:row.responsible_person_id,
              responsible_person_name_snapshot:row.responsible_person_name_snapshot,purchase_ids:row.purchase_ids,created_at:row.created_at
            }));
            await db().from(TICKETS_TABLE).insert(restore);
          }
        }catch(_){}
        try{await db().from(SETTLEMENTS_TABLE).update({status:'ABIERTA',updated_at:nowIso()}).eq('id',settlementId);}catch(_){}
      }
      throw persistError;
    }
    return {ok:true,settlement:await fullSettlement(settlementId)};
  }catch(error){throw friendlyDbError(error);}
}
export async function reopenPurchaseSettlement(id,eventId,actor={}){
  try{
    const user=requireWriter(actor);
    const settlement=await settlementRow(id);
    if(eventId && text(settlement.event_id)!==text(eventId))fail('La liquidación no pertenece al evento seleccionado.',409,'PURCHASE_SETTLEMENT_WRONG_EVENT');
    if(normalizeStatus(settlement.status)!=='CERRADA')fail('La liquidación ya está abierta.',409,'PURCHASE_SETTLEMENT_ALREADY_OPEN');
    const now=nowIso();
    const {error:headerError}=await db().from(SETTLEMENTS_TABLE).update({status:'ABIERTA',reopened_at:now,reopened_by:actorLabel(user),updated_at:now}).eq('id',text(id));
    if(headerError)throw headerError;
    const {error:movError}=await db().from(MOVEMENTS_TABLE).update({status:'ABIERTA',updated_by:actorLabel(user),updated_at:now}).eq('settlement_id',text(id));
    if(movError)throw movError;
    return {ok:true,settlement:await fullSettlement(id)};
  }catch(error){throw friendlyDbError(error);}
}
