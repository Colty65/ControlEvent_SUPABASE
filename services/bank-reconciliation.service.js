import crypto from 'crypto';
import { getSupabaseAdmin } from '../lib/supabase.js';

const MOVEMENTS_TABLE = 'ce_bank_movements';
const LINKS_TABLE = 'ce_bank_ticket_links';
const BATCHES_TABLE = 'ce_bank_import_batches';
const EVENT_SETTINGS_TABLE = 'ce_bank_event_settings';
const EVENT_MOVEMENT_STATE_TABLE = 'ce_bank_event_movement_state';

function db(){ return getSupabaseAdmin(); }
function text(value){ return value == null ? '' : String(value).trim(); }
function arr(value){ return Array.isArray(value) ? value : []; }
function num(value){
  if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
  let s = String(value ?? '').replace(/[\u0080€\s]/g, '').replace(/[^0-9,.-]/g, '');
  if(s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if(s.includes(',')) s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function cents(value){ return Math.round((num(value) + Number.EPSILON) * 100) / 100; }
function normalizeSpace(value){ return text(value).replace(/\s+/g, ' '); }
function normalizeTicket(value){
  const match = text(value).toUpperCase().match(/\bTK\s*0*(\d+)[A-Z0-9_-]*\b/);
  return match ? `TK${String(Number(match[1])).padStart(2, '0')}` : '';
}
function ticketNumber(code){ return Number(String(code || '').replace(/\D/g, '')) || 0; }
function friendlyDbError(error){
  const msg = text(error?.message || error);
  if(/ce_bank_movements|ce_bank_ticket_links|ce_bank_import_batches|ce_bank_event_settings|ce_bank_event_movement_state|relation .* does not exist|schema cache|pgrst205|42p01/i.test(msg)){
    const err = new Error('El módulo Cuadre Banco todavía no está creado en Supabase. Ejecuta ControlEvent_SQL_V24_PROD_CUADRE_BANCO.sql en el SQL Editor y vuelve a abrir la ventana.');
    err.status = 503;
    err.code = 'BANK_SCHEMA_MISSING';
    return err;
  }
  return error;
}
function fail(message, status = 400, code = 'BANK_VALIDATION'){
  const err = new Error(message);
  err.status = status;
  err.code = code;
  throw err;
}

function splitSemicolon(line){
  const out = [];
  let value = '';
  let quoted = false;
  const src = String(line || '');
  for(let i = 0; i < src.length; i += 1){
    const ch = src[i];
    if(ch === '"'){
      if(quoted && src[i + 1] === '"'){ value += '"'; i += 1; }
      else quoted = !quoted;
    }else if(ch === ';' && !quoted){ out.push(value); value = ''; }
    else value += ch;
  }
  out.push(value);
  return out;
}
function parseDate(value, withTime = false){
  const raw = text(value);
  const match = raw.match(/^(\d{1,2})[-\/]([0-1]?\d)[-\/](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if(!match) return '';
  const [, dd, mm, yyyy, hh = '00', min = '00'] = match;
  const date = `${yyyy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
  return withTime ? `${date}T${String(hh).padStart(2,'0')}:${String(min).padStart(2,'0')}:00` : date;
}
function hashMovement(row){
  const raw = [row.accountId,row.executedAt,row.valueDate,row.description,row.amount,row.bankBalance].join('|');
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}
function headerKey(value){
  return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ');
}

export function parseBankCsv(csvText, filename = ''){
  const raw = String(csvText ?? '').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/);
  if(!lines.length) fail('El CSV está vacío.');
  let accountId = '';
  let accountLabel = '';
  let dateFrom = '';
  let dateTo = '';
  let headerIndex = -1;
  for(let i = 0; i < lines.length; i += 1){
    const cols = splitSemicolon(lines[i]);
    const key = headerKey(cols[0]);
    if(key === 'CUENTA'){
      const full = normalizeSpace(cols[1]);
      const iban = full.match(/\b[A-Z]{2}\d{2}(?:\s?\d{4}){5}\b/i);
      accountId = iban ? iban[0].replace(/\s+/g,'').toUpperCase() : full || 'SIN_CUENTA';
      accountLabel = full || accountId;
    }else if(key === 'FECHA DESDE') dateFrom = parseDate(cols[1]);
    else if(key === 'FECHA HASTA') dateTo = parseDate(cols[1]);
    if(key.includes('FECHA DE EJECUCION') && headerKey(cols[1]).includes('FECHA VALOR')){ headerIndex = i; break; }
  }
  if(headerIndex < 0) fail('No se ha encontrado la cabecera «Fecha de ejecución; Fecha valor; Descripción; Importe; Saldo».');
  if(!accountId) accountId = 'SIN_CUENTA';
  if(!accountLabel) accountLabel = accountId;
  const headers = splitSemicolon(lines[headerIndex]).map(headerKey);
  const indexes = {
    executedAt: headers.findIndex(v => v.includes('FECHA DE EJECUCION')),
    valueDate: headers.findIndex(v => v === 'FECHA VALOR'),
    description: headers.findIndex(v => v === 'DESCRIPCION'),
    amount: headers.findIndex(v => v === 'IMPORTE'),
    bankBalance: headers.findIndex(v => v === 'SALDO')
  };
  if(Object.values(indexes).some(v => v < 0)) fail('El CSV no contiene todas las columnas necesarias.');
  const movements = [];
  const warnings = [];
  for(let i = headerIndex + 1; i < lines.length; i += 1){
    if(!text(lines[i])) continue;
    const cols = splitSemicolon(lines[i]);
    const executedAt = parseDate(cols[indexes.executedAt], true);
    const valueDate = parseDate(cols[indexes.valueDate]);
    const description = normalizeSpace(cols[indexes.description]);
    const amountRaw = cols[indexes.amount];
    const balanceRaw = cols[indexes.bankBalance];
    if(!executedAt || !description){ warnings.push(`Línea ${i + 1}: fecha o descripción no válida.`); continue; }
    const row = {
      accountId,
      accountLabel,
      executedAt,
      valueDate: valueDate || executedAt.slice(0,10),
      description,
      amount: cents(amountRaw),
      bankBalance: cents(balanceRaw),
      sourceFilename: text(filename)
    };
    row.sourceHash = hashMovement(row);
    movements.push(row);
  }
  if(!movements.length) fail('El CSV no contiene movimientos bancarios válidos.');
  return { accountId, accountLabel, dateFrom, dateTo, movements, warnings };
}

async function selectPaged(table, {columns='*', order='created_at', ascending=true, apply=null} = {}){
  const out = [];
  const pageSize = 1000;
  for(let from = 0;; from += pageSize){
    let query = db().from(table).select(columns).order(order, {ascending});
    if(typeof apply === 'function') query = apply(query);
    const {data, error} = await query.range(from, from + pageSize - 1);
    if(error) throw friendlyDbError(error);
    const rows = data || [];
    out.push(...rows);
    if(rows.length < pageSize) break;
  }
  return out;
}

async function tableRows(table, columns='*'){
  return selectPaged(table, {columns, order:'created_at', ascending:true});
}

async function ticketCatalog(){
  const [purchases, events, stores, persons, links] = await Promise.all([
    selectPaged('ce_compras', {order:'created_at'}),
    selectPaged('ce_eventos', {order:'fecha_ini'}),
    selectPaged('ce_tiendas', {order:'nombre'}),
    selectPaged('ce_personas', {order:'nombre'}),
    selectPaged(LINKS_TABLE, {order:'created_at'})
  ]);
  const eventById = new Map(events.map(row => [text(row.id), row]));
  const storeById = new Map(stores.map(row => [text(row.id), row]));
  const personById = new Map(persons.map(row => [text(row.id), row]));
  const linkByTicket = new Map(links.map(row => [`${text(row.event_id)}|${normalizeTicket(row.ticket_code)}`, row]));
  const map = new Map();
  for(const row of purchases){
    const ticketCode = normalizeTicket(row.ticket_donacion);
    if(!ticketCode) continue;
    const raw = text(row.ticket_donacion).toUpperCase();
    if(/DONADO|PTE\.?\s*COMPRA|PENDIENTE/.test(raw)) continue;
    const eventId = text(row.event_id);
    const key = `${eventId}|${ticketCode}`;
    if(!map.has(key)) map.set(key, {eventId,ticketCode,amount:0,lineCount:0,storeIds:new Set(),responsibleIds:new Set()});
    const item = map.get(key);
    item.amount = cents(item.amount + num(row.unidades) * num(row.precio));
    item.lineCount += 1;
    if(row.tienda_id) item.storeIds.add(text(row.tienda_id));
    if(row.responsable_id) item.responsibleIds.add(text(row.responsable_id));
  }
  return [...map.values()].map(item => {
    const link = linkByTicket.get(`${item.eventId}|${item.ticketCode}`);
    return {
      eventId:item.eventId,
      eventTitle:text(eventById.get(item.eventId)?.titulo) || item.eventId,
      eventDate:text(eventById.get(item.eventId)?.fecha_ini),
      ticketCode:item.ticketCode,
      amount:cents(item.amount),
      lineCount:item.lineCount,
      stores:[...item.storeIds].map(id => text(storeById.get(id)?.nombre) || id).filter(Boolean),
      responsibles:[...item.responsibleIds].map(id => text(personById.get(id)?.nombre) || id).filter(Boolean),
      linked:!!link,
      linkedMovementId:text(link?.movement_id),
      linkedId:text(link?.id)
    };
  }).sort((a,b) => String(b.eventDate).localeCompare(String(a.eventDate)) || a.eventTitle.localeCompare(b.eventTitle,'es') || ticketNumber(a.ticketCode)-ticketNumber(b.ticketCode));
}

function movementFromDb(row){
  return {
    id:row.id,
    accountId:row.account_id || '',
    accountLabel:row.account_label || '',
    executedAt:row.executed_at || '',
    valueDate:row.value_date || '',
    description:row.description || '',
    amount:cents(row.amount),
    bankBalance:cents(row.bank_balance),
    included:row.included !== false,
    sourceFilename:row.source_filename || '',
    sourceHash:row.source_hash || '',
    importBatchId:row.import_batch_id || '',
    createdBy:row.created_by || '',
    createdAt:row.created_at || '',
    updatedAt:row.updated_at || ''
  };
}
function linkFromDb(row){
  return {
    id:row.id,
    movementId:row.movement_id,
    eventId:row.event_id,
    ticketCode:normalizeTicket(row.ticket_code),
    ticketAmountSnapshot:cents(row.ticket_amount_snapshot),
    createdBy:row.created_by || '',
    createdAt:row.created_at || '',
    forcedSquare:row.forced_square === true
  };
}
function batchFromDb(row){
  return {
    id:row.id,
    sourceFilename:row.source_filename || '',
    accountId:row.account_id || '',
    accountLabel:row.account_label || '',
    dateFrom:row.date_from || '',
    dateTo:row.date_to || '',
    parsedCount:Number(row.parsed_count || 0),
    insertedCount:Number(row.inserted_count || 0),
    duplicateCount:Number(row.duplicate_count || 0),
    warningCount:Number(row.warning_count || 0),
    importedBy:row.imported_by || '',
    importedAt:row.imported_at || ''
  };
}

function summaryFor(movements){
  const sorted = [...movements].sort((a,b) => String(a.executedAt).localeCompare(String(b.executedAt)) || String(a.id).localeCompare(String(b.id)));
  const earliest = sorted[0] || null;
  const latest = sorted[sorted.length - 1] || null;
  const openingBalance = earliest ? cents(earliest.bankBalance - earliest.amount) : 0;
  const includedNet = cents(sorted.filter(row => row.included).reduce((sum,row) => sum + row.amount, 0));
  return {
    openingBalance,
    includedNet,
    calculatedBalance:cents(openingBalance + includedNet),
    latestBankBalance:latest ? cents(latest.bankBalance) : 0,
    latestAt:latest?.executedAt || '',
    movementCount:sorted.length,
    includedCount:sorted.filter(row => row.included).length,
    excludedCount:sorted.filter(row => !row.included).length,
    income:cents(sorted.filter(row => row.included && row.amount > 0).reduce((sum,row) => sum + row.amount,0)),
    expense:cents(sorted.filter(row => row.included && row.amount < 0).reduce((sum,row) => sum + Math.abs(row.amount),0))
  };
}

function dateOnly(value){ return text(value).slice(0,10); }
function validIsoDate(value){
  const raw=dateOnly(value);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
  const date=new Date(`${raw}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===raw ? raw : '';
}
function minDate(values){ return arr(values).map(validIsoDate).filter(Boolean).sort()[0] || ''; }
function maxDate(values){ const rows=arr(values).map(validIsoDate).filter(Boolean).sort(); return rows[rows.length-1] || ''; }
function normalizePeriod(dateFrom,dateTo){
  const start=validIsoDate(dateFrom);
  const end=validIsoDate(dateTo);
  if(!start||!end) fail('Indica una fecha de inicio y una fecha final válidas.',409,'BANK_PERIOD_INVALID');
  if(start>end) fail('La fecha de inicio bancaria no puede ser posterior a la fecha final.',409,'BANK_PERIOD_REVERSED');
  return {dateFrom:start,dateTo:end};
}
function defaultPeriod(event,linkedMovements,allMovements){
  const linkedDays=arr(linkedMovements).map(row=>dateOnly(row.executedAt)).filter(Boolean);
  const allDays=arr(allMovements).map(row=>dateOnly(row.executedAt)).filter(Boolean);
  let dateFrom=minDate([event.startDate,...linkedDays]);
  let dateTo=maxDate([event.endDate,...linkedDays]);
  if(!dateFrom) dateFrom=minDate(allDays);
  if(!dateTo) dateTo=maxDate(allDays);
  if(!dateFrom&&dateTo) dateFrom=dateTo;
  if(!dateTo&&dateFrom) dateTo=dateFrom;
  if(!dateFrom||!dateTo){
    const today=new Date().toISOString().slice(0,10);
    dateFrom=dateFrom||today;
    dateTo=dateTo||dateFrom;
  }
  if(dateFrom>dateTo) [dateFrom,dateTo]=[dateTo,dateFrom];
  return {dateFrom,dateTo};
}
function eventSettingFromDb(row={}){
  return {eventId:text(row.event_id),dateFrom:dateOnly(row.date_from),dateTo:dateOnly(row.date_to),updatedBy:text(row.updated_by),updatedAt:text(row.updated_at)};
}
async function ensureEventPeriod(event,linkedMovements,allMovements,persist=true){
  const {data,error}=await db().from(EVENT_SETTINGS_TABLE).select('*').eq('event_id',event.id).maybeSingle();
  if(error) throw error;
  if(data) return {...eventSettingFromDb(data),saved:true};
  const initial=defaultPeriod(event,linkedMovements,allMovements);
  if(!persist) return {...initial,eventId:event.id,saved:false,initialized:true};
  const row={event_id:event.id,date_from:initial.dateFrom,date_to:initial.dateTo,updated_by:'INICIALIZACION_AUTOMATICA'};
  const {data:created,error:createError}=await db().from(EVENT_SETTINGS_TABLE).upsert(row,{onConflict:'event_id'}).select('*').single();
  if(createError) throw createError;
  return {...eventSettingFromDb(created),saved:true,initialized:true};
}
function inPeriod(movement,period){
  const day=dateOnly(movement.executedAt);
  return !!day && day>=period.dateFrom && day<=period.dateTo;
}
function buildEventLedger(movements){
  const sorted=[...arr(movements)].sort((a,b)=>String(a.executedAt).localeCompare(String(b.executedAt))||String(a.id).localeCompare(String(b.id)));
  const grouped=new Map();
  for(const row of sorted){
    const key=text(row.accountId)||'SIN_CUENTA';
    if(!grouped.has(key)) grouped.set(key,[]);
    grouped.get(key).push(row);
  }
  let openingBalance=0;
  let actualClosingBalance=0;
  for(const rows of grouped.values()){
    const first=rows[0];
    const last=rows[rows.length-1];
    openingBalance=cents(openingBalance + (first ? cents(first.bankBalance-first.amount) : 0));
    actualClosingBalance=cents(actualClosingBalance + (last ? cents(last.bankBalance) : 0));
  }
  let running=openingBalance;
  const enriched=[];
  for(const row of sorted){
    const eventBalanceBefore=running;
    if(row.included) running=cents(running+row.amount);
    enriched.push({...row,eventBalanceBefore,eventBalanceAfter:running});
  }
  const included=enriched.filter(row=>row.included);
  const latest=sorted[sorted.length-1]||null;
  const includedNet=cents(included.reduce((sum,row)=>sum+row.amount,0));
  return {
    movements:enriched,
    summary:{
      openingBalance,
      includedNet,
      calculatedBalance:running,
      eventVariation:cents(running-openingBalance),
      actualClosingBalance:sorted.length?actualClosingBalance:openingBalance,
      actualClosingAt:latest?.executedAt||'',
      movementCount:enriched.length,
      includedCount:included.length,
      excludedCount:enriched.length-included.length,
      income:cents(included.filter(row=>row.amount>0).reduce((sum,row)=>sum+row.amount,0)),
      expense:cents(included.filter(row=>row.amount<0).reduce((sum,row)=>sum+Math.abs(row.amount),0))
    }
  };
}
function eventFromDb(row = {}){
  return {
    id:text(row.id),
    title:text(row.titulo || row.nombre || row.descripcion) || 'Evento',
    description:text(row.descripcion),
    startDate:dateOnly(row.fecha_ini || row.fecha_inicio || row.fechaIni),
    endDate:dateOnly(row.fecha_fin || row.fecha_final || row.fechaFin),
    status:text(row.situacion || row.estado || 'En curso'),
    finalized:/FINALIZADO/i.test(text(row.situacion || row.estado))
  };
}
async function loadEvent(eventId){
  const id=text(eventId);
  if(!id) fail('Selecciona un evento antes de abrir Cuadre Banco.',409,'BANK_EVENT_REQUIRED');
  const {data,error}=await db().from('ce_eventos').select('*').eq('id',id).maybeSingle();
  if(error) throw error;
  if(!data) fail('El evento activo no existe.',404,'BANK_EVENT_NOT_FOUND');
  return eventFromDb(data);
}

export async function assertBankEventWritable(eventId){
  try{
    const event=await loadEvent(eventId);
    if(event.finalized) fail(`El evento «${event.title}» está Finalizado. Cuadre Banco queda disponible únicamente en modo consulta.`,409,'BANK_EVENT_FINALIZED');
    return event;
  }catch(error){ throw friendlyDbError(error); }
}
function reconcileMovement(row,links){
  const target=row.amount < 0 ? Math.abs(row.amount) : 0;
  const justified=cents(links.reduce((sum,link)=>sum + num(link.ticketAmount),0));
  const difference=cents(target - justified);
  const forcedSquare=links.some(link=>link.forcedSquare === true);
  const justificationStatus=row.amount >= 0
    ? 'NO_APLICA'
    : (!links.length ? 'SIN_JUSTIFICAR'
      : (forcedSquare ? 'CUADRADO_FORZADO'
        : (Math.abs(difference) <= 0.01 ? 'CUADRADO' : (difference > 0 ? 'PENDIENTE' : 'EXCESO'))));
  return {...row,links,targetAmount:cents(target),justifiedAmount:justified,difference,forcedSquare,justificationStatus};
}
function eventTicketSummary(catalog,eventId){
  const tickets=catalog.filter(item=>item.eventId===eventId);
  const linked=tickets.filter(item=>item.linked).length;
  const total=tickets.length;
  const ratio=total ? linked / total : 0;
  const traffic=total && linked===total ? 'GREEN' : (ratio >= .5 ? 'ORANGE' : 'RED');
  return {total,linked,pending:Math.max(0,total-linked),ratio,percentage:Math.round(ratio*100),allJustified:total>0&&linked===total,traffic};
}
export async function listBankReconciliation({accountId='',eventId=''} = {}){
  try{
    const event=await loadEvent(eventId);
    const [movementRows, linkRows, catalog, stateRows] = await Promise.all([
      selectPaged(MOVEMENTS_TABLE, {order:'executed_at', ascending:false}),
      selectPaged(LINKS_TABLE, {order:'created_at', ascending:true}),
      ticketCatalog(),
      selectPaged(EVENT_MOVEMENT_STATE_TABLE,{order:'updated_at',ascending:true,apply:query=>query.eq('event_id',event.id)})
    ]);
    const all=movementRows.map(movementFromDb);
    const accounts=[...new Map(all.map(row=>[row.accountId,{id:row.accountId,label:row.accountLabel||row.accountId,lastAt:row.executedAt}])).values()]
      .sort((a,b)=>String(b.lastAt).localeCompare(String(a.lastAt)));
    const requestedAccount=text(accountId);
    const selectedAccount=requestedAccount||accounts[0]?.id||'TODOS';
    const accountMovements=selectedAccount&&selectedAccount!=='TODOS'?all.filter(row=>row.accountId===selectedAccount):all;
    const globalSummary=summaryFor(accountMovements);
    const catalogMap=new Map(catalog.map(item=>[`${item.eventId}|${item.ticketCode}`,item]));
    const eventLinksByMovement=new Map();
    for(const row of linkRows.map(linkFromDb).filter(link=>link.eventId===event.id)){
      if(!eventLinksByMovement.has(row.movementId)) eventLinksByMovement.set(row.movementId,[]);
      const current=catalogMap.get(`${row.eventId}|${row.ticketCode}`);
      eventLinksByMovement.get(row.movementId).push({...row,
        eventTitle:current?.eventTitle||event.title,
        ticketAmount:cents(current?.amount??row.ticketAmountSnapshot),
        stores:current?.stores||[],
        responsibles:current?.responsibles||[]
      });
    }
    const eventLinkedMovements=all.filter(row=>eventLinksByMovement.has(row.id));
    const period=await ensureEventPeriod(event,eventLinkedMovements,accountMovements,!event.finalized);
    const stateByMovement=new Map(arr(stateRows).map(row=>[text(row.movement_id),row.included!==false]));
    const scoped=accountMovements
      .filter(row=>inPeriod(row,period))
      .map(row=>reconcileMovement({...row,included:stateByMovement.has(row.id)?stateByMovement.get(row.id):row.included},eventLinksByMovement.get(row.id)||[]));
    const ledger=buildEventLedger(scoped);
    const movementById=new Map(ledger.movements.map(row=>[row.id,row]));
    const movements=scoped.map(row=>movementById.get(row.id)||row);
    const linkedOutsidePeriod=eventLinkedMovements.filter(row=>!inPeriod(row,period));
    const ticketSummary=eventTicketSummary(catalog,event.id);
    return {
      ok:true,
      event:{...event,reconciliationStart:period.dateFrom,reconciliationEnd:period.dateTo},
      period:{dateFrom:period.dateFrom,dateTo:period.dateTo,linkedOutsidePeriodCount:linkedOutsidePeriod.length},
      readOnly:event.finalized,
      ticketSummary,
      accounts,
      selectedAccount,
      movements,
      summary:{...ledger.summary,latestBankBalance:globalSummary.latestBankBalance,latestAt:globalSummary.latestAt,globalMovementCount:globalSummary.movementCount}
    };
  }catch(error){ throw friendlyDbError(error); }
}

export async function setBankEventPeriod(eventId,dateFrom,dateTo,actor={}){
  const selectedEvent=text(eventId);
  if(!selectedEvent) fail('Falta el evento activo.',409,'BANK_EVENT_REQUIRED');
  const period=normalizePeriod(dateFrom,dateTo);
  try{
    const row={event_id:selectedEvent,date_from:period.dateFrom,date_to:period.dateTo,updated_by:text(actor.identificacion||actor.nombre)};
    const {data,error}=await db().from(EVENT_SETTINGS_TABLE).upsert(row,{onConflict:'event_id'}).select('*').single();
    if(error) throw error;
    return {ok:true,period:eventSettingFromDb(data)};
  }catch(error){ throw friendlyDbError(error); }
}

export async function importBankCsv(payload = {}, actor = {}){
  const parsed = parseBankCsv(payload.csvText, payload.filename);
  const batchId = crypto.randomUUID();
  let batchCreated = false;
  try{
    const hashes = parsed.movements.map(row => row.sourceHash);
    const existing = new Set();
    for(let i=0;i<hashes.length;i+=200){
      const {data,error}=await db().from(MOVEMENTS_TABLE).select('source_hash').in('source_hash',hashes.slice(i,i+200));
      if(error) throw error;
      (data||[]).forEach(row=>existing.add(text(row.source_hash)));
    }
    const fresh = parsed.movements.filter(row => !existing.has(row.sourceHash));
    const batch = {
      id:batchId,
      source_filename:text(payload.filename),
      account_id:parsed.accountId,
      account_label:parsed.accountLabel,
      date_from:parsed.dateFrom || null,
      date_to:parsed.dateTo || null,
      parsed_count:parsed.movements.length,
      inserted_count:fresh.length,
      duplicate_count:parsed.movements.length-fresh.length,
      warning_count:parsed.warnings.length,
      imported_by:text(actor.identificacion || actor.nombre)
    };

    // El lote debe existir antes que sus movimientos por la FK import_batch_id.
    const {error:batchError}=await db().from(BATCHES_TABLE).insert(batch);
    if(batchError) throw batchError;
    batchCreated = true;

    if(fresh.length){
      const rows = fresh.map(row => ({
        account_id:row.accountId,
        account_label:row.accountLabel,
        executed_at:row.executedAt,
        value_date:row.valueDate,
        description:row.description,
        amount:row.amount,
        bank_balance:row.bankBalance,
        included:true,
        source_hash:row.sourceHash,
        import_batch_id:batchId,
        source_filename:row.sourceFilename,
        created_by:text(actor.identificacion || actor.nombre)
      }));
      for(let i=0;i<rows.length;i+=300){
        const {error}=await db().from(MOVEMENTS_TABLE).insert(rows.slice(i,i+300));
        if(error) throw error;
      }
    }
    return {ok:true,batchId,accountId:parsed.accountId,accountLabel:parsed.accountLabel,parsed:parsed.movements.length,inserted:fresh.length,duplicates:parsed.movements.length-fresh.length,warnings:parsed.warnings};
  }catch(error){
    if(batchCreated){
      try{ await db().from(BATCHES_TABLE).delete().eq('id',batchId); }catch(_){ /* limpieza no bloqueante */ }
    }
    throw friendlyDbError(error);
  }
}

export async function setMovementIncluded(id,eventId,included,actor={}){
  const movementId = text(id);
  const selectedEvent=text(eventId);
  if(!movementId) fail('Falta el movimiento bancario.');
  if(!selectedEvent) fail('Falta el evento activo.',409,'BANK_EVENT_REQUIRED');
  try{
    const {data:movement,error:movementError}=await db().from(MOVEMENTS_TABLE).select('id').eq('id',movementId).maybeSingle();
    if(movementError) throw movementError;
    if(!movement) fail('Movimiento bancario no encontrado.',404,'BANK_MOVEMENT_NOT_FOUND');
    const row={event_id:selectedEvent,movement_id:movementId,included:included!==false,updated_by:text(actor.identificacion||actor.nombre)};
    const {data,error}=await db().from(EVENT_MOVEMENT_STATE_TABLE).upsert(row,{onConflict:'event_id,movement_id'}).select('*').single();
    if(error) throw error;
    return {ok:true,state:{eventId:text(data.event_id),movementId:text(data.movement_id),included:data.included!==false}};
  }catch(error){ throw friendlyDbError(error); }
}

export async function setMovementForced(movementId,eventId,forced){
  const id=text(movementId);
  const selectedEvent=text(eventId);
  if(!id||!selectedEvent) fail('Movimiento y evento son obligatorios.');
  try{
    const {data:links,error:linksError}=await db().from(LINKS_TABLE).select('id').eq('movement_id',id).eq('event_id',selectedEvent);
    if(linksError) throw linksError;
    if(!(links||[]).length) fail('Vincula al menos un TKxx antes de marcar el cuadre forzado.',409,'BANK_FORCE_REQUIRES_TICKET');
    const {data,error}=await db().from(LINKS_TABLE).update({forced_square:forced===true}).eq('movement_id',id).eq('event_id',selectedEvent).select('*');
    if(error) throw error;
    return {ok:true,forced:forced===true,links:(data||[]).map(linkFromDb)};
  }catch(error){ throw friendlyDbError(error); }
}

export async function listPaidTickets({movementId='',eventId='',q=''} = {}){
  try{
    const selectedEvent=text(eventId);
    if(!selectedEvent) fail('Falta el evento activo.',409,'BANK_EVENT_REQUIRED');
    const catalog=await ticketCatalog();
    const query=text(q).toLowerCase();
    const items=catalog.filter(item=>{
      if(item.eventId!==selectedEvent) return false;
      if(item.linked&&item.linkedMovementId!==text(movementId)) return false;
      if(!query) return true;
      return [item.ticketCode,item.eventTitle,...item.stores,...item.responsibles].join(' ').toLowerCase().includes(query);
    });
    return {ok:true,eventId:selectedEvent,items};
  }catch(error){ throw friendlyDbError(error); }
}

export async function addTicketLink(movementId, payload = {}, actor = {}){
  const id = text(movementId);
  const eventId = text(payload.eventId);
  const ticketCode = normalizeTicket(payload.ticketCode);
  if(!id || !eventId || !ticketCode) fail('Movimiento, evento y TKxx son obligatorios.');
  try{
    const {data:movement,error:movementError}=await db().from(MOVEMENTS_TABLE).select('*').eq('id',id).maybeSingle();
    if(movementError) throw movementError;
    if(!movement) fail('Movimiento bancario no encontrado.',404,'BANK_MOVEMENT_NOT_FOUND');
    if(num(movement.amount) >= 0) fail('Solo se pueden justificar con TKxx los movimientos bancarios negativos.',409,'BANK_POSITIVE_MOVEMENT');
    const catalog = await ticketCatalog();
    const ticket = catalog.find(item => item.eventId === eventId && item.ticketCode === ticketCode);
    if(!ticket) fail('El TKxx indicado no existe o todavía no figura como pagado.',409,'BANK_TICKET_NOT_PAID');
    if(ticket.linked && ticket.linkedMovementId !== id) fail(`${ticketCode} ya está vinculado a otro movimiento bancario.`,409,'BANK_TICKET_ALREADY_LINKED');
    if(ticket.linked && ticket.linkedMovementId === id) return {ok:true,already:true};
    const row = {
      movement_id:id,
      event_id:eventId,
      ticket_code:ticketCode,
      ticket_amount_snapshot:ticket.amount,
      created_by:text(actor.identificacion || actor.nombre)
    };
    const {data,error}=await db().from(LINKS_TABLE).insert(row).select('*').single();
    if(error) throw error;
    return {ok:true,link:linkFromDb(data)};
  }catch(error){
    if(String(error?.code || '') === '23505') fail(`${ticketCode} ya está utilizado en otro movimiento bancario.`,409,'BANK_TICKET_ALREADY_LINKED');
    throw friendlyDbError(error);
  }
}

export async function deleteTicketLink(linkId,eventId=''){
  const id=text(linkId);
  const selectedEvent=text(eventId);
  if(!id) fail('Falta el vínculo bancario.');
  try{
    const {data:link,error:findError}=await db().from(LINKS_TABLE).select('*').eq('id',id).maybeSingle();
    if(findError) throw findError;
    if(!link) return {ok:true,already:true};
    if(selectedEvent&&text(link.event_id)!==selectedEvent) fail('El TKxx no pertenece al evento activo.',409,'BANK_EVENT_MISMATCH');
    const wasForced=link.forced_square===true;
    const movementId=text(link.movement_id);
    const linkEvent=text(link.event_id);
    const {error}=await db().from(LINKS_TABLE).delete().eq('id',id);
    if(error) throw error;
    if(wasForced){
      const {error:propagateError}=await db().from(LINKS_TABLE).update({forced_square:true}).eq('movement_id',movementId).eq('event_id',linkEvent);
      if(propagateError) throw propagateError;
    }
    return {ok:true};
  }catch(error){ throw friendlyDbError(error); }
}

export async function exportBankData({accountId='',eventId=''} = {}){
  const [data,batchRows]=await Promise.all([
    listBankReconciliation({accountId,eventId}),
    selectPaged(BATCHES_TABLE,{order:'imported_at',ascending:false})
  ]);
  return {...data,batches:batchRows.map(batchFromDb)};
}

