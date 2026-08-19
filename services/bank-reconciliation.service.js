import crypto from 'crypto';
import { getSupabaseAdmin } from '../lib/supabase.js';

const MOVEMENTS_TABLE = 'ce_bank_movements';
const LINKS_TABLE = 'ce_bank_ticket_links';
const BATCHES_TABLE = 'ce_bank_import_batches';
const EVENT_SETTINGS_TABLE = 'ce_bank_event_settings';
const EVENT_MOVEMENT_STATE_TABLE = 'ce_bank_event_movement_state';
const INCOME_LINKS_TABLE = 'ce_bank_income_links';

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
function normalizeWords(value){
  return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
function isPenaElArrastre(value){
  const normalized=normalizeWords(value);
  return normalized==='PENA EL ARRASTRE'||normalized.startsWith('PENA EL ARRASTRE ');
}
function meaningfulTokens(value){
  const stop=new Set(['ABONO','TRANS','TRANSFERENCIA','INMEDIATA','INGRESO','CUOTA','PAGO','BANCO','BIZUM','SYSA','EVENTO','PEÑA','PENA','DE','DEL','LA','LAS','EL','LOS','Y']);
  return normalizeWords(value).split(' ').filter(token=>token.length>=3&&!stop.has(token));
}
function normalizeTicket(value){
  const match = text(value).toUpperCase().match(/\bTK\s*0*(\d+)[A-Z0-9_-]*\b/);
  return match ? `TK${String(Number(match[1])).padStart(2, '0')}` : '';
}
function ticketNumber(code){ return Number(String(code || '').replace(/\D/g, '')) || 0; }
function friendlyDbError(error){
  const msg = text(error?.message || error);
  if(/ce_bank_movements|ce_bank_ticket_links|ce_bank_import_batches|ce_bank_event_settings|ce_bank_event_movement_state|ce_bank_income_links|relation .* does not exist|schema cache|pgrst205|42p01/i.test(msg)){
    const err = new Error('El módulo Cuadre Banco todavía no está creado en Supabase. Ejecuta ControlEvent_SQL_V27_PROD_1_1_CUADRE_BANCO.sql en el SQL Editor y vuelve a abrir la ventana.');
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

async function ticketCatalog(eventId='', eventTitle='', suppliedLinks=null){
  const selectedEvent=text(eventId);
  const [purchases, events, stores, persons, links] = await Promise.all([
    selectPaged('ce_compras', {order:'created_at',apply:query=>selectedEvent?query.eq('event_id',selectedEvent):query}),
    selectedEvent ? Promise.resolve([{id:selectedEvent,titulo:eventTitle}]) : selectPaged('ce_eventos', {order:'fecha_ini'}),
    selectPaged('ce_tiendas', {order:'nombre'}),
    selectPaged('ce_personas', {order:'nombre'}),
    Array.isArray(suppliedLinks) ? Promise.resolve(suppliedLinks) : selectPaged(LINKS_TABLE, {order:'created_at',apply:query=>selectedEvent?query.eq('event_id',selectedEvent):query})
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
    const purchaseEventId = text(row.event_id);
    if(selectedEvent && purchaseEventId!==selectedEvent) continue;
    const key = `${purchaseEventId}|${ticketCode}`;
    if(!map.has(key)) map.set(key, {eventId:purchaseEventId,ticketCode,amount:0,lineCount:0,storeIds:new Set(),responsibleIds:new Set()});
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
      eventTitle:text(eventById.get(item.eventId)?.titulo) || eventTitle || item.eventId,
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
function incomeLinkFromDb(row){
  return {
    id:text(row.id),
    movementId:text(row.movement_id),
    eventId:text(row.event_id),
    incomeId:text(row.income_id),
    incomeAmountSnapshot:cents(row.income_amount_snapshot),
    createdBy:text(row.created_by),
    createdAt:text(row.created_at),
    automatic:/^AUTO_INGRESO(?::|$)/i.test(text(row.created_by))
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
    price:cents(row.precio),
    startDate:dateOnly(row.fecha_ini || row.fecha_inicio || row.fechaIni),
    endDate:dateOnly(row.fecha_fin || row.fecha_final || row.fechaFin),
    status:text(row.situacion || row.estado || 'En curso'),
    finalized:/FINALIZADO/i.test(text(row.situacion || row.estado))
  };
}
function bankLifecycle(event,rowCount=0,{ticketsComplete=false,incomesComplete=false}={}){
  const hasRows=Number(rowCount)>0;
  const complete=hasRows&&ticketsComplete===true&&incomesComplete===true;
  if(event?.finalized){
    if(!hasRows) return {
      code:'FINALIZADO_CUADRE_SIN_REALIZAR',
      message:'CUADRE BANCARIO SIN REALIZAR',
      complete:false
    };
    if(complete) return {
      code:'FINALIZADO_CUADRE_REALIZADO',
      message:'CUADRE BANCARIO REALIZADO',
      complete:true
    };
    return {
      code:'FINALIZADO_CUADRE_NO_TOTAL',
      message:'CUADRE BANCARIO NO TOTALMENTE REALIZADO',
      complete:false
    };
  }
  if(!hasRows) return {
    code:'EN_CURSO_CUADRE_SIN_INICIAR',
    message:'CUADRE BANCARIO SIN INICIAR',
    complete:false
  };
  if(complete) return {
    code:'EN_CURSO_CUADRE_COMPLETO',
    message:'CUADRE BANCARIO COMPLETO PERO EVENTO TODAVIA EN CURSO',
    complete:true
  };
  return {
    code:'EN_CURSO_CUADRE_EN_CURSO',
    message:'CUADRE BANCARIO EN CURSO',
    complete:false
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

export async function assertBankEventReadable(eventId,actor={}){
  try{
    const event=await loadEvent(eventId);
    const role=text(actor?.nivel||actor?.Nivel).toUpperCase();
    if(['GD','RW'].includes(role)) return event;
    if(role==='RO'&&event.finalized) return event;
    if(role==='RO') fail('Los usuarios RO solo pueden consultar Cuadre Banco cuando el evento está Finalizado.',403,'BANK_RO_EVENT_IN_PROGRESS');
    fail('Cuadre Banco no está disponible para este usuario.',403,'BANK_ROLE_FORBIDDEN');
  }catch(error){ throw friendlyDbError(error); }
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
function eventTicketSummary(catalog,eventId,movements=[]){
  const tickets=catalog.filter(item=>item.eventId===eventId);
  const linked=tickets.filter(item=>item.linked).length;
  const total=tickets.length;
  const negativeIncluded=arr(movements).filter(row=>num(row.amount)<0&&row.included);
  const movementJustified=negativeIncluded.filter(row=>['CUADRADO','CUADRADO_FORZADO'].includes(text(row.justificationStatus))).length;
  const allCatalogLinked=total===0||linked===total;
  const allMovementsJustified=negativeIncluded.length===0||movementJustified===negativeIncluded.length;
  const allJustified=allCatalogLinked&&allMovementsJustified;
  const ratio=total ? linked / total : (allMovementsJustified?1:0);
  const traffic=allJustified?'GREEN':(ratio>=.5?'ORANGE':'RED');
  return {
    total,linked,pending:Math.max(0,total-linked),ratio,percentage:Math.round(ratio*100),allJustified,traffic,
    movementTotal:negativeIncluded.length,movementJustified,movementPending:Math.max(0,negativeIncluded.length-movementJustified),
    allCatalogLinked,allMovementsJustified
  };
}
function confirmedBankIncome(value){
  const state=normalizeWords(value);
  return state==='BANCO'||state==='BIZUM'||state==='PAGADO BANCO'||state==='INGRESADO BANCO';
}
function confirmedCashIncome(value){
  const state=normalizeWords(value);
  return state==='EFECTIVO'||state==='PAGADO EFECTIVO'||state==='INGRESADO EFECTIVO';
}
function collaboratorIncomeAmount(event,row,person={},snapshot={}){
  const historicalRange=text(snapshot.rango_snapshot||snapshot.rangoSnapshot||row.persona_rango_snapshot||row.personaRangoSnapshot||'');
  const isMember=normalizeWords(historicalRange||person.rango)==='SOCIO';
  const mandatory=isMember?cents(num(row.numero)*num(event.price)):0;
  return cents(mandatory+num(row.importe));
}
function cashIncomeTotal(event,collaborators,persons,snapshots=[]){
  const people=new Map(arr(persons).map(row=>[text(row.id),row]));
  const history=new Map(arr(snapshots).map(row=>[`${text(row.event_id)}|${text(row.persona_id)}`,row]));
  return cents(arr(collaborators)
    .filter(row=>text(row.event_id)===event.id&&confirmedCashIncome(row.situacion))
    .reduce((sum,row)=>sum+collaboratorIncomeAmount(event,row,people.get(text(row.persona_id))||{},history.get(`${event.id}|${text(row.persona_id)}`)||{}),0));
}
function incomeImageUrl(images,eventId,incomeId){
  const expected=[`${eventId}|INGRESO:${incomeId}`,`${eventId}|INGRESO|${incomeId}`,`INGRESO:${eventId}|${incomeId}`,`INGRESO:${incomeId}`].map(normalizeWords);
  let best={score:-1,url:''};
  for(const row of arr(images)){
    const normalizedKeys=[row.image_key,row.label].map(normalizeWords).filter(Boolean);
    let score=-1;
    for(const normalized of normalizedKeys){
      expected.forEach((key,index)=>{ if(normalized===key) score=Math.max(score,1000-index); });
      if(score<0 && normalized.includes(normalizeWords(`INGRESO ${incomeId}`))) score=700;
    }
    const url=text(row.public_url||row.pathname||row.storage_path);
    if(url&&score>best.score) best={score,url};
  }
  return best.url;
}
function buildIncomeCatalog(event,collaborators,persons,images,snapshots=[]){
  const people=new Map(arr(persons).map(row=>[text(row.id),row]));
  const history=new Map(arr(snapshots).map(row=>[`${text(row.event_id)}|${text(row.persona_id)}`,row]));
  return arr(collaborators).filter(row=>text(row.event_id)===event.id&&confirmedBankIncome(row.situacion)).map(row=>{
    const person=people.get(text(row.persona_id))||{};
    const snapshot=history.get(`${event.id}|${text(row.persona_id)}`)||{};
    const amount=collaboratorIncomeAmount(event,row,person,snapshot);
    const personName=text(snapshot.nombre_snapshot||snapshot.nombreSnapshot||person.nombre)||text(row.persona_id)||'Ingreso';
    return {
      id:text(row.id),eventId:event.id,personId:text(row.persona_id),personName,
      paymentMethod:text(row.situacion),amount,imageUrl:incomeImageUrl(images,event.id,text(row.id)),createdAt:text(row.created_at),updatedAt:text(row.updated_at),
      // v3_0_exp · La aportación interna de Peña El Arrastre puede no corresponder a un
      // abono bancario justificable. Se conserva visible, pero NO condiciona el estado
      // completo/incompleto del Cuadre Banco ni su porcentaje de ingresos conciliados.
      ignoredForReconciliation:isPenaElArrastre(personName)
    };
  }).filter(row=>row.id&&row.amount>0).sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt))||a.personName.localeCompare(b.personName,'es')||a.id.localeCompare(b.id));
}
function incomeNameScore(description,income,executedAt=''){
  const descriptionNorm=normalizeWords(description);
  const personNorm=normalizeWords(income.personName);
  // Preferimos siempre ingresos ordinarios frente a la aportación interna de Peña El
  // Arrastre cuando varios importes coinciden. Si solo existe esa aportación, sigue siendo
  // una candidata válida para mostrar trazabilidad, aunque no compute en el semáforo.
  let score=income?.ignoredForReconciliation===true?-1000:0;
  if(personNorm&&descriptionNorm.includes(personNorm)) score+=220;
  for(const token of meaningfulTokens(income.personName)) if(descriptionNorm.includes(token)) score+=35;
  const movementTime=Date.parse(text(executedAt));
  const incomeTime=Date.parse(text(income.updatedAt||income.createdAt));
  if(Number.isFinite(movementTime)&&Number.isFinite(incomeTime)){
    const days=Math.abs(movementTime-incomeTime)/86400000;
    score+=Math.max(0,30-Math.min(30,days));
  }
  if(income.imageUrl) score+=1;
  return score;
}
function findIncomeCombination(candidates,target,description,executedAt=''){
  const rows=candidates.filter(row=>row.amount<=target+.01).slice(0,18);
  let best=null;
  function visit(index,chosen,total,score){
    if(Math.abs(total-target)<=.01){
      const candidate={chosen:[...chosen],score:score+chosen.length};
      if(!best||candidate.score>best.score) best=candidate;
      return;
    }
    if(total>target+.01||chosen.length>=5) return;
    for(let i=index;i<rows.length;i+=1){
      const row=rows[i];
      visit(i+1,[...chosen,row],cents(total+row.amount),score+incomeNameScore(description,row,executedAt));
    }
  }
  visit(0,[],0,0);
  return best?.chosen||[];
}
function attachIncomeTraceability(rows,incomeCatalog,manualLinkRows=[]){
  const catalogById=new Map(arr(incomeCatalog).map(item=>[text(item.id),item]));
  const manualByMovement=new Map();
  const manuallyUsed=new Set();
  for(const raw of arr(manualLinkRows)){
    const link=raw?.incomeId!==undefined?raw:incomeLinkFromDb(raw);
    if(!link.movementId||!link.incomeId) continue;
    if(!manualByMovement.has(link.movementId)) manualByMovement.set(link.movementId,[]);
    manualByMovement.get(link.movementId).push(link);
    manuallyUsed.add(link.incomeId);
  }
  const used=new Set(manuallyUsed);
  const prioritized=[...arr(rows)].sort((a,b)=>Number(b.included)-Number(a.included)||String(a.executedAt).localeCompare(String(b.executedAt))||String(a.id).localeCompare(String(b.id)));
  const traced=new Map();
  for(const row of prioritized){
    if(num(row.amount)<=0){ traced.set(row.id,row); continue; }
    const target=cents(Math.max(0,num(row.amount)));
    const explicit=arr(manualByMovement.get(text(row.id)));
    let matches=[];
    let associationMode='AUTO';
    if(explicit.length){
      associationMode=explicit.every(link=>link.automatic===true)?'AUTO_GUARDADA':'MANUAL';
      matches=explicit.map(link=>{
        const current=catalogById.get(link.incomeId);
        return current
          ? {...current,manual:link.automatic!==true,persistedAuto:link.automatic===true,linkId:link.id}
          : {id:link.incomeId,eventId:link.eventId,personId:'',personName:'Ingreso '+link.incomeId,paymentMethod:'',amount:cents(link.incomeAmountSnapshot),imageUrl:'',createdAt:link.createdAt,updatedAt:'',manual:link.automatic!==true,persistedAuto:link.automatic===true,linkId:link.id,missing:true};
      });
    }else if(row.included&&!row.linkedToOtherEvent){
      const available=incomeCatalog.filter(item=>!used.has(item.id));
      const exact=available.filter(item=>Math.abs(item.amount-target)<=.01).sort((a,b)=>incomeNameScore(row.description,b,row.executedAt)-incomeNameScore(row.description,a,row.executedAt)||String(a.createdAt).localeCompare(String(b.createdAt))||a.id.localeCompare(b.id));
      if(exact.length) matches=[exact[0]];
      else matches=findIncomeCombination(available,target,row.description,row.executedAt);
      matches.forEach(item=>used.add(item.id));
    }
    const justified=cents(matches.reduce((sum,item)=>sum+item.amount,0));
    const difference=cents(target-justified);
    const status=!row.included?'FUERA_SALDO':(!matches.length?'SIN_JUSTIFICAR':(Math.abs(difference)<=.01?'CUADRADO':(difference>0?'PENDIENTE':'EXCESO')));
    traced.set(row.id,{...row,incomeLinks:matches,incomeTargetAmount:target,incomeJustifiedAmount:justified,incomeDifference:difference,incomeJustificationStatus:status,incomeAssociationMode:associationMode,manualIncomeLinkCount:explicit.length});
  }
  const enriched=arr(rows).map(row=>traced.get(row.id)||row);
  const positive=enriched.filter(row=>num(row.amount)>0&&row.included);
  const ignoredCatalog=arr(incomeCatalog).filter(item=>item?.ignoredForReconciliation===true);
  const countableCatalog=arr(incomeCatalog).filter(item=>item?.ignoredForReconciliation!==true);
  const countableIds=new Set(countableCatalog.map(item=>text(item.id)).filter(Boolean));
  const matchedIds=new Set();
  for(const row of positive) for(const link of arr(row.incomeLinks)) if(text(link?.id)&&countableIds.has(text(link.id))) matchedIds.add(text(link.id));
  const movementIgnored=row=>isPenaElArrastre(row?.description)||(
    arr(row?.incomeLinks).length>0&&arr(row.incomeLinks).every(link=>link?.ignoredForReconciliation===true)
  );
  const positiveRequired=positive.filter(row=>!movementIgnored(row));
  const total=countableCatalog.length;
  const reconciled=[...matchedIds].length;
  const movementReconciled=positiveRequired.filter(row=>row.incomeJustificationStatus==='CUADRADO').length;
  const allCatalogLinked=total===0||reconciled===total;
  const allMovementsReconciled=positiveRequired.length===0||movementReconciled===positiveRequired.length;
  // v3_0_exp · Si el evento no tiene NINGÚN ingreso computable, no existe nada que
  // conciliar en este bloque. Ese 0/0 es funcionalmente un requisito cumplido, no un
  // pendiente. Las aportaciones internas de Peña El Arrastre ya están fuera del catálogo
  // computable y tampoco deben impedir el cierre del Cuadre.
  const allReconciled=total===0?true:(allCatalogLinked&&allMovementsReconciled);
  const percentage=total?Math.round(reconciled/total*100):100;
  const traffic=allReconciled?'GREEN':(percentage>50?'ORANGE':'RED');
  return {movements:enriched,summary:{
    total,reconciled,pending:Math.max(0,total-reconciled),percentage,ratio:total?reconciled/total:(allMovementsReconciled?1:0),traffic,allReconciled,
    movementTotal:positiveRequired.length,movementReconciled,movementPending:Math.max(0,positiveRequired.length-movementReconciled),
    ignoredTotal:ignoredCatalog.length,ignoredMovementTotal:Math.max(0,positive.length-positiveRequired.length),ignoredReason:ignoredCatalog.length?'Peña El Arrastre no computa para completar el Cuadre Banco':'',
    allCatalogLinked,allMovementsReconciled
  }};
}

export async function listBankReconciliation({accountId='',eventId=''} = {}){
  try{
    const event=await loadEvent(eventId);
    const [movementRows, allRawLinkRows, stateRows, eventRows, collaboratorRows, personRows, incomeImageRows, manualIncomeLinkRows, eventPersonSnapshotRows] = await Promise.all([
      selectPaged(MOVEMENTS_TABLE, {
        columns:'id,account_id,account_label,executed_at,value_date,description,amount,bank_balance,included,source_filename,source_hash,import_batch_id,created_by,created_at,updated_at',
        order:'executed_at', ascending:false
      }),
      // Se leen todos los vínculos bancarios para que un movimiento que aparezca por
      // coincidencia de fechas muestre el TKxx y el evento al que ya pertenece.
      selectPaged(LINKS_TABLE, {order:'created_at', ascending:true}),
      selectPaged(EVENT_MOVEMENT_STATE_TABLE,{order:'updated_at',ascending:true,apply:query=>query.eq('event_id',event.id)}),
      selectPaged('ce_eventos',{columns:'id,titulo,precio,fecha_ini,fecha_fin,situacion',order:'fecha_ini',ascending:true}),
      selectPaged('ce_colaboradores',{columns:'id,event_id,persona_id,numero,situacion,importe,created_at,updated_at',order:'created_at',ascending:true,apply:query=>query.eq('event_id',event.id)}),
      selectPaged('ce_personas',{columns:'id,nombre,rango,created_at',order:'nombre',ascending:true}),
      selectPaged('ce_ticket_images',{columns:'image_key,event_id,label,public_url,pathname,storage_path,created_at',order:'created_at',ascending:true,apply:query=>query.eq('event_id',event.id)}),
      selectPaged(INCOME_LINKS_TABLE,{columns:'*',order:'created_at',ascending:true,apply:query=>query.eq('event_id',event.id)}),
      selectPaged('ce_event_person_snapshots',{columns:'event_id,persona_id,nombre_snapshot,rango_snapshot,captured_at,updated_at',order:'persona_id',ascending:true,apply:query=>query.eq('event_id',event.id)}).catch(()=>[])
    ]);
    const activeRawLinkRows=allRawLinkRows.filter(row=>text(row.event_id)===event.id);
    // El catálogo completo de compras solo se construye para el evento activo. Para los
    // otros eventos basta el importe snapshot del vínculo y el título de ce_eventos.
    const catalog=await ticketCatalog(event.id,event.title,activeRawLinkRows);
    const allLinks=allRawLinkRows.map(linkFromDb);
    const all=movementRows.map(movementFromDb);
    const accounts=[...new Map(all.map(row=>[row.accountId,{id:row.accountId,label:row.accountLabel||row.accountId,lastAt:row.executedAt}])).values()]
      .sort((a,b)=>String(b.lastAt).localeCompare(String(a.lastAt)));
    const requestedAccount=text(accountId);
    const selectedAccount=requestedAccount||accounts[0]?.id||'TODOS';
    const accountMovements=selectedAccount&&selectedAccount!=='TODOS'?all.filter(row=>row.accountId===selectedAccount):all;
    const globalSummary=summaryFor(accountMovements);
    const catalogMap=new Map(catalog.map(item=>[`${item.eventId}|${item.ticketCode}`,item]));
    const eventTitleById=new Map(eventRows.map(row=>[text(row.id),text(row.titulo)||text(row.id)]));
    eventTitleById.set(event.id,event.title);
    const displayLinksByMovement=new Map();
    for(const row of allLinks){
      if(!displayLinksByMovement.has(row.movementId)) displayLinksByMovement.set(row.movementId,[]);
      const isActiveEvent=row.eventId===event.id;
      const current=isActiveEvent?catalogMap.get(`${row.eventId}|${row.ticketCode}`):null;
      displayLinksByMovement.get(row.movementId).push({...row,
        isActiveEvent,
        eventTitle:current?.eventTitle||eventTitleById.get(row.eventId)||row.eventId,
        ticketAmount:cents(current?.amount??row.ticketAmountSnapshot),
        stores:current?.stores||[],
        responsibles:current?.responsibles||[]
      });
    }
    const eventLinkedMovements=all.filter(row=>arr(displayLinksByMovement.get(row.id)).some(link=>link.isActiveEvent));
    const period=await ensureEventPeriod(event,eventLinkedMovements,accountMovements,!event.finalized);
    // v3_0_exp FIX10 · Estado REAL del Cuadre Banco.
    // Una fecha/periodo guardado NO significa que el cuadre haya empezado. Para considerar
    // iniciado el mantenimiento tiene que existir al menos un movimiento con una fila/evidencia
    // persistida para ESTE evento: estado En saldo/excluido, vínculo TKxx o vínculo manual de ingreso.
    const periodUpdater=text(period?.updatedBy);
    const periodExplicit=period?.saved===true && periodUpdater.toUpperCase()!=='INICIALIZACION_AUTOMATICA';
    const stateMovementIds=new Set(arr(stateRows).map(row=>text(row.movement_id)).filter(Boolean));
    const ticketMovementIds=new Set(arr(activeRawLinkRows).map(row=>text(row.movement_id)).filter(Boolean));
    const incomeMovementIds=new Set(arr(manualIncomeLinkRows).map(row=>text(row.movement_id)).filter(Boolean));
    const storedMovementIds=new Set([...stateMovementIds,...ticketMovementIds,...incomeMovementIds]);
    const reconciliationRowCount=storedMovementIds.size;
    const reconciliationEvidence={
      manualPeriod:periodExplicit,
      movementStates:arr(stateRows).length,
      ticketLinks:activeRawLinkRows.length,
      incomeLinks:arr(manualIncomeLinkRows).length,
      storedMovements:reconciliationRowCount
    };
    const hasExplicitReconciliation=reconciliationRowCount>0;
    const stateByMovement=new Map(arr(stateRows).map(row=>[text(row.movement_id),row.included!==false]));
    // EVENTO FINALIZADO = foto cerrada: jamás se reconstruye desde el histórico general ni
    // por caer dentro del periodo. Solo se cargan las filas realmente persistidas del evento.
    // EVENTO EN CURSO = se mantienen los candidatos del periodo para poder continuar el cuadre.
    const sourceMovements=event.finalized
      ? accountMovements.filter(row=>storedMovementIds.has(text(row.id)))
      : accountMovements.filter(row=>inPeriod(row,period));
    const scopedAll=sourceMovements
      .map(row=>{
        const displayLinks=arr(displayLinksByMovement.get(row.id));
        const currentLinks=displayLinks.filter(link=>link.isActiveEvent);
        const foreignLinks=displayLinks.filter(link=>!link.isActiveEvent);
        const linkedToOtherEvent=foreignLinks.length>0&&currentLinks.length===0;
        // Un movimiento que ya está conciliado en otro evento no puede entrar por defecto
        // en el saldo del evento actual, aunque el indicador global histórico sea true.
        const eventInclusionExplicit=stateByMovement.has(row.id);
        const eventStored=storedMovementIds.has(text(row.id));
        let included;
        if(event.finalized){
          // En un evento cerrado no heredamos nunca ce_bank_movements.included (indicador global).
          // Si existe estado específico, manda ese estado. Si solo hay vínculo propio persistido,
          // el movimiento pertenece al cuadre y se considera incluido.
          included=eventInclusionExplicit?stateByMovement.get(row.id):(currentLinks.length>0||incomeMovementIds.has(text(row.id)));
        }else{
          included=eventInclusionExplicit?stateByMovement.get(row.id):row.included;
        }
        if(linkedToOtherEvent) included=false;
        const reconciled=reconcileMovement({...row,included,eventInclusionExplicit,eventStored},currentLinks);
        const foreignTarget=row.amount<0?Math.abs(row.amount):0;
        const foreignJustified=cents(foreignLinks.reduce((sum,link)=>sum+num(link.ticketAmount),0));
        const foreignDifference=cents(foreignTarget-foreignJustified);
        const foreignForced=foreignLinks.some(link=>link.forcedSquare===true);
        const foreignEvents=[...new Set(foreignLinks.map(link=>link.eventTitle).filter(Boolean))];
        const foreignStatus=linkedToOtherEvent
          ? (foreignForced?'CUADRADO_FORZADO':(Math.abs(foreignDifference)<=.01?'CUADRADO':(foreignDifference>0?'PENDIENTE':'EXCESO')))
          : '';
        return {...reconciled,
          displayLinks,
          eventInclusionExplicit,
          foreignLinks,
          linkedToOtherEvent,
          inclusionLocked:linkedToOtherEvent,
          foreignEvents,
          foreignJustifiedAmount:foreignJustified,
          foreignDifference,
          foreignForcedSquare:foreignForced,
          foreignJustificationStatus:foreignStatus,
          justificationStatus:linkedToOtherEvent?'OTRO_EVENTO':reconciled.justificationStatus
        };
      });
    // En Finalizado se muestran TODAS las filas persistidas (incluidas y excluidas), porque son
    // la fotografía definitiva de cómo quedó el mantenimiento al cerrar el evento.
    const incomeCatalog=buildIncomeCatalog(event,collaboratorRows,personRows,incomeImageRows,eventPersonSnapshotRows);
    const incomeTrace=attachIncomeTraceability(scopedAll,incomeCatalog,manualIncomeLinkRows.map(incomeLinkFromDb));
    const tracedById=new Map(incomeTrace.movements.map(row=>[row.id,row]));
    const tracedScoped=scopedAll.map(row=>tracedById.get(row.id)||row);
    const visibleScoped=tracedScoped;
    const ledger=buildEventLedger(tracedScoped);
    const movementById=new Map(ledger.movements.map(row=>[row.id,row]));
    const movements=visibleScoped.map(row=>({...row,...(movementById.get(row.id)||{})}));
    const linkedOutsidePeriod=eventLinkedMovements.filter(row=>!inPeriod(row,period));
    const ticketSummary=eventTicketSummary(catalog,event.id,tracedScoped);
    const noCountableIncomes=num(incomeTrace.summary?.total)===0;
    // En eventos sin ingresos computables, la finalización contable se decide por la
    // cobertura del gasto: todos los TKxx deben estar asociados. Las diferencias de
    // efectivo que el gestor haya aceptado mediante Cuadre forzado no rebajan el estado
    // a incompleto. Para eventos con ingresos se mantiene la exigencia estricta habitual.
    const ticketsCompleteForLifecycle=ticketSummary.allJustified===true||(
      noCountableIncomes&&num(ticketSummary.total)>0&&ticketSummary.allCatalogLinked===true
    );
    const incomesCompleteForLifecycle=noCountableIncomes?true:incomeTrace.summary.allReconciled===true;
    const lifecycle=bankLifecycle(event,reconciliationRowCount,{
      ticketsComplete:ticketsCompleteForLifecycle,
      incomesComplete:incomesCompleteForLifecycle
    });
    const cashIncome=cashIncomeTotal(event,collaboratorRows,personRows,eventPersonSnapshotRows);
    const eventIncome=cents(ledger.summary.income+cashIncome);
    const economicVariation=cents(eventIncome-ledger.summary.expense);
    return {
      ok:true,
      event:{...event,reconciliationStart:period.dateFrom,reconciliationEnd:period.dateTo},
      period:{dateFrom:period.dateFrom,dateTo:period.dateTo,linkedOutsidePeriodCount:linkedOutsidePeriod.length},
      reconciliation:{
        hasExplicitReconciliation,
        hasStoredRows:hasExplicitReconciliation,
        rowCount:reconciliationRowCount,
        status:lifecycle.code,
        message:lifecycle.message,
        eventFinalized:event.finalized,
        complete:lifecycle.complete===true,
        ticketsComplete:ticketsCompleteForLifecycle,
        incomesComplete:incomesCompleteForLifecycle,
        evidence:reconciliationEvidence,
        periodSource:periodExplicit?'MANUAL':(period?.saved===true?'INICIALIZACION_AUTOMATICA':'CALCULADO_NO_GUARDADO')
      },
      readOnly:event.finalized,
      ticketSummary,
      incomeSummary:incomeTrace.summary,
      accounts,
      selectedAccount,
      // Cronología bancaria histórica completa de la cuenta seleccionada: siempre
      // desde el movimiento más antiguo hasta el más reciente, sin limitarla por las
      // fechas del evento. La interfaz destaca sobre esta línea únicamente los
      // movimientos que pertenecen a la vista actual del evento.
      balanceTimeline:[...accountMovements].sort((a,b)=>String(a.executedAt).localeCompare(String(b.executedAt))||String(a.id).localeCompare(String(b.id))).map(row=>({
        id:row.id,
        accountId:row.accountId,
        accountLabel:row.accountLabel,
        executedAt:row.executedAt,
        valueDate:row.valueDate,
        description:row.description,
        amount:row.amount,
        bankBalance:row.bankBalance
      })),
      movements,
      summary:{...ledger.summary,cashIncome,eventIncome,economicVariation,latestBankBalance:globalSummary.latestBankBalance,latestAt:globalSummary.latestAt,globalMovementCount:globalSummary.movementCount}
    };
  }catch(error){ throw friendlyDbError(error); }
}

async function persistAppliedPeriodMovementSnapshot(eventId,accountId='',actor={}){
  const selectedEvent=text(eventId);
  if(!selectedEvent) return {removed:0,created:0,keptExplicit:0};
  const actorName=text(actor.identificacion||actor.nombre)||'SISTEMA';
  const snapshotTag=`PERIODO_APLICADO:${actorName}`;

  // v3_0_exp FIX2 · Aplicar fechas debe congelar también la selección En saldo/excluido
  // del periodo. En curso la UI puede reconstruir candidatos desde el histórico, pero al
  // Finalizar solo se permite leer la foto persistida. Sin esta instantánea desaparecían
  // precisamente los cargos todavía sin TKxx, aunque el usuario los hubiera dejado En saldo.
  const existingRows=await selectPaged(EVENT_MOVEMENT_STATE_TABLE,{
    columns:'event_id,movement_id,included,updated_by,updated_at',
    order:'updated_at',ascending:true,apply:q=>q.eq('event_id',selectedEvent)
  });
  const generatedRows=arr(existingRows).filter(row=>/^PERIODO_APLICADO(?::|$)/i.test(text(row.updated_by)));
  if(generatedRows.length){
    const ids=[...new Set(generatedRows.map(row=>text(row.movement_id)).filter(Boolean))];
    for(let i=0;i<ids.length;i+=200){
      const {error}=await db().from(EVENT_MOVEMENT_STATE_TABLE).delete().eq('event_id',selectedEvent).in('movement_id',ids.slice(i,i+200));
      if(error) throw error;
    }
  }

  // Recalcula la misma vista que ve el usuario DESPUÉS de aplicar el periodo y de persistir
  // los ingresos automáticos. Los estados manuales/AUTO_INGRESO existentes mandan y no se pisan.
  const current=await listBankReconciliation({eventId:selectedEvent,accountId:text(accountId)});
  const remainingRows=await selectPaged(EVENT_MOVEMENT_STATE_TABLE,{
    columns:'event_id,movement_id,included,updated_by,updated_at',
    order:'updated_at',ascending:true,apply:q=>q.eq('event_id',selectedEvent)
  });
  const explicitIds=new Set(arr(remainingRows).map(row=>text(row.movement_id)).filter(Boolean));
  const rows=arr(current.movements)
    .filter(row=>text(row.id)&&!explicitIds.has(text(row.id)))
    .map(row=>({
      event_id:selectedEvent,
      movement_id:text(row.id),
      included:row.included===true,
      updated_by:snapshotTag
    }));
  for(let i=0;i<rows.length;i+=200){
    const {error}=await db().from(EVENT_MOVEMENT_STATE_TABLE).upsert(rows.slice(i,i+200),{onConflict:'event_id,movement_id'});
    if(error) throw error;
  }
  return {removed:generatedRows.length,created:rows.length,keptExplicit:explicitIds.size};
}

async function persistAutomaticIncomeReconciliation(eventId,accountId='',actor={}){
  const selectedEvent=text(eventId);
  if(!selectedEvent) return {removedLinks:0,removedStates:0,createdLinks:0,createdStates:0};
  const actorName=text(actor.identificacion||actor.nombre)||'SISTEMA';
  const autoTag=`AUTO_INGRESO:${actorName}`;

  // Las asociaciones automáticas pertenecen al periodo actualmente aplicado. Al cambiar
  // fechas se regeneran desde cero, pero SOLO se eliminan filas creadas por el motor AUTO.
  // Cualquier asociación o estado corregido manualmente por el usuario se conserva.
  const [existingIncomeRows,existingStateRows]=await Promise.all([
    selectPaged(INCOME_LINKS_TABLE,{columns:'id,movement_id,event_id,income_id,income_amount_snapshot,created_by,created_at',order:'created_at',ascending:true,apply:q=>q.eq('event_id',selectedEvent)}),
    selectPaged(EVENT_MOVEMENT_STATE_TABLE,{columns:'event_id,movement_id,included,updated_by,updated_at',order:'updated_at',ascending:true,apply:q=>q.eq('event_id',selectedEvent)})
  ]);
  const autoIncomeRows=arr(existingIncomeRows).filter(row=>/^AUTO_INGRESO(?::|$)/i.test(text(row.created_by)));
  const autoStateRows=arr(existingStateRows).filter(row=>/^AUTO_INGRESO(?::|$)/i.test(text(row.updated_by)));
  if(autoIncomeRows.length){
    const ids=autoIncomeRows.map(row=>text(row.id)).filter(Boolean);
    for(let i=0;i<ids.length;i+=200){
      const {error}=await db().from(INCOME_LINKS_TABLE).delete().in('id',ids.slice(i,i+200));
      if(error) throw error;
    }
  }
  if(autoStateRows.length){
    const movementIds=[...new Set(autoStateRows.map(row=>text(row.movement_id)).filter(Boolean))];
    for(let i=0;i<movementIds.length;i+=200){
      const {error}=await db().from(EVENT_MOVEMENT_STATE_TABLE).delete().eq('event_id',selectedEvent).in('movement_id',movementIds.slice(i,i+200));
      if(error) throw error;
    }
  }

  // Se usa exactamente el mismo oráculo de asociación que ve la ventana. Solo se persisten
  // abonos incluidos que quedan CUADRADOS al céntimo; una sugerencia PENDIENTE/EXCESO nunca
  // se convierte en dato definitivo automáticamente.
  const snapshot=await listBankReconciliation({eventId:selectedEvent,accountId:text(accountId)});
  const candidates=arr(snapshot.movements).filter(row=>
    num(row.amount)>0 &&
    row.included===true &&
    row.linkedToOtherEvent!==true &&
    text(row.incomeAssociationMode).toUpperCase()==='AUTO' &&
    text(row.incomeJustificationStatus).toUpperCase()==='CUADRADO' &&
    arr(row.incomeLinks).length>0
  );
  const linkRows=[];
  const stateRows=[];
  for(const movement of candidates){
    for(const income of arr(movement.incomeLinks)){
      const incomeId=text(income?.id);
      if(!incomeId) continue;
      linkRows.push({
        movement_id:text(movement.id),
        event_id:selectedEvent,
        income_id:incomeId,
        income_amount_snapshot:cents(income.amount),
        created_by:autoTag
      });
    }
    stateRows.push({event_id:selectedEvent,movement_id:text(movement.id),included:true,updated_by:autoTag});
  }
  for(let i=0;i<linkRows.length;i+=200){
    const {error}=await db().from(INCOME_LINKS_TABLE).insert(linkRows.slice(i,i+200));
    if(error) throw error;
  }
  for(let i=0;i<stateRows.length;i+=200){
    const {error}=await db().from(EVENT_MOVEMENT_STATE_TABLE).upsert(stateRows.slice(i,i+200),{onConflict:'event_id,movement_id'});
    if(error) throw error;
  }
  return {
    removedLinks:autoIncomeRows.length,
    removedStates:autoStateRows.length,
    createdLinks:linkRows.length,
    createdStates:stateRows.length,
    movementIds:stateRows.map(row=>row.movement_id)
  };
}

export async function setBankEventPeriod(eventId,dateFrom,dateTo,actor={},accountId=''){
  const selectedEvent=text(eventId);
  if(!selectedEvent) fail('Falta el evento activo.',409,'BANK_EVENT_REQUIRED');
  const period=normalizePeriod(dateFrom,dateTo);
  try{
    const row={event_id:selectedEvent,date_from:period.dateFrom,date_to:period.dateTo,updated_by:text(actor.identificacion||actor.nombre)};
    const {data,error}=await db().from(EVENT_SETTINGS_TABLE).upsert(row,{onConflict:'event_id'}).select('*').single();
    if(error) throw error;
    const automaticIncomePersistence=await persistAutomaticIncomeReconciliation(selectedEvent,accountId,actor);
    const periodMovementSnapshot=await persistAppliedPeriodMovementSnapshot(selectedEvent,accountId,actor);
    return {ok:true,period:eventSettingFromDb(data),automaticIncomePersistence,periodMovementSnapshot};
  }catch(error){ throw friendlyDbError(error); }
}

export async function importBankCsv(payload = {}, actor = {}){
  const parsed = parseBankCsv(payload.csvText, payload.filename);
  const batchId = crypto.randomUUID();
  let batchCreated = false;
  try{
    const uniqueByHash=new Map();
    for(const row of parsed.movements){ if(!uniqueByHash.has(row.sourceHash)) uniqueByHash.set(row.sourceHash,row); }
    const uniqueMovements=[...uniqueByHash.values()];
    const hashes = uniqueMovements.map(row => row.sourceHash);
    const existing = new Set();
    for(let i=0;i<hashes.length;i+=200){
      const {data,error}=await db().from(MOVEMENTS_TABLE).select('source_hash').in('source_hash',hashes.slice(i,i+200));
      if(error) throw error;
      (data||[]).forEach(row=>existing.add(text(row.source_hash)));
    }
    const fresh = uniqueMovements.filter(row => !existing.has(row.sourceHash));
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
    return {ok:true,batchId,accountId:parsed.accountId,accountLabel:parsed.accountLabel,dateFrom:parsed.dateFrom,dateTo:parsed.dateTo,parsed:parsed.movements.length,inserted:fresh.length,duplicates:parsed.movements.length-fresh.length,warnings:parsed.warnings};
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
    if(included!==false){
      const {data:movementLinks,error:linksError}=await db().from(LINKS_TABLE).select('event_id').eq('movement_id',movementId);
      if(linksError) throw linksError;
      const foreign=arr(movementLinks).filter(link=>text(link.event_id)!==selectedEvent);
      const own=arr(movementLinks).filter(link=>text(link.event_id)===selectedEvent);
      if(foreign.length&&!own.length) fail('Este movimiento ya está conciliado en otro evento y debe permanecer inactivo en el evento actual.',409,'BANK_MOVEMENT_OTHER_EVENT');
    }
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


export async function getBankTicketDetail({eventId='',ticketCode=''} = {}){
  const selectedEvent=text(eventId);
  const code=normalizeTicket(ticketCode);
  if(!selectedEvent) fail('Falta el evento del ticket.',409,'BANK_EVENT_REQUIRED');
  if(!code) fail('El código TKxx no es válido.',409,'BANK_TICKET_REQUIRED');
  try{
    const event=await loadEvent(selectedEvent);
    const [purchaseRows,storeRows,personRows,productRows]=await Promise.all([
      selectPaged('ce_compras',{order:'created_at',ascending:true,apply:query=>query.eq('event_id',selectedEvent)}),
      selectPaged('ce_tiendas',{order:'nombre',ascending:true}),
      selectPaged('ce_personas',{order:'nombre',ascending:true}),
      selectPaged('ce_productos',{order:'nombre',ascending:true})
    ]);
    const stores=new Map(storeRows.map(row=>[text(row.id),text(row.nombre||row.descripcion)||text(row.id)]));
    const persons=new Map(personRows.map(row=>[text(row.id),text(row.nombre||row.descripcion)||text(row.id)]));
    const products=new Map(productRows.map(row=>[text(row.id),text(row.nombre||row.descripcion)||text(row.id)]));
    const rows=purchaseRows.filter(row=>normalizeTicket(row.ticket_donacion)===code);
    const lines=rows.map((row,index)=>{
      const productId=text(row.producto_id||row.productoId||row.product_id||row.productId);
      const storeId=text(row.tienda_id||row.tiendaId||row.store_id||row.storeId);
      const responsibleId=text(row.responsable_id||row.responsableId||row.persona_id||row.personaId);
      const units=num(row.unidades||row.cantidad||row.units);
      const unitPrice=cents(row.precio||row.precio_unitario||row.unit_price||row.unitPrice);
      const amount=cents(units*unitPrice);
      return {
        id:text(row.id)||`${code}-${index+1}`,
        productId,
        product:text(row.producto_nombre||row.productoNombre||row.nombre_producto||row.nombreProducto)||products.get(productId)||productId||'Producto',
        units,
        unitPrice,
        amount,
        storeId,
        store:stores.get(storeId)||storeId||'',
        responsibleId,
        responsible:persons.get(responsibleId)||responsibleId||'',
        createdAt:text(row.created_at||row.fecha||row.fecha_compra)
      };
    });
    const uniqueStores=[...new Set(lines.map(row=>row.store).filter(Boolean))];
    const uniqueResponsibles=[...new Set(lines.map(row=>row.responsible).filter(Boolean))];
    return {
      ok:true,
      event:{id:event.id,title:event.title,status:event.status,finalized:event.finalized},
      ticketCode:code,
      total:cents(lines.reduce((sum,row)=>sum+row.amount,0)),
      lineCount:lines.length,
      stores:uniqueStores,
      responsibles:uniqueResponsibles,
      lines
    };
  }catch(error){ throw friendlyDbError(error); }
}

export async function listPaidTickets({movementId='',eventId='',q=''} = {}){
  try{
    const selectedEvent=text(eventId);
    if(!selectedEvent) fail('Falta el evento activo.',409,'BANK_EVENT_REQUIRED');
    const event=await loadEvent(selectedEvent);
    const catalog=await ticketCatalog(event.id,event.title);
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

export async function listBankIncomes({movementId='',eventId='',q=''} = {}){
  try{
    const selectedEvent=text(eventId);
    const selectedMovement=text(movementId);
    if(!selectedEvent) fail('Falta el evento activo.',409,'BANK_EVENT_REQUIRED');
    const event=await loadEvent(selectedEvent);
    const [collaboratorRows,personRows,imageRows,linkRows,eventPersonSnapshotRows]=await Promise.all([
      selectPaged('ce_colaboradores',{columns:'id,event_id,persona_id,numero,situacion,importe,created_at,updated_at',order:'created_at',ascending:true,apply:query=>query.eq('event_id',event.id)}),
      selectPaged('ce_personas',{columns:'id,nombre,rango,created_at',order:'nombre',ascending:true}),
      selectPaged('ce_ticket_images',{columns:'image_key,event_id,label,public_url,pathname,storage_path,created_at',order:'created_at',ascending:true,apply:query=>query.eq('event_id',event.id)}),
      selectPaged(INCOME_LINKS_TABLE,{columns:'*',order:'created_at',ascending:true,apply:query=>query.eq('event_id',event.id)}),
      selectPaged('ce_event_person_snapshots',{columns:'event_id,persona_id,nombre_snapshot,rango_snapshot,captured_at,updated_at',order:'persona_id',ascending:true,apply:query=>query.eq('event_id',event.id)}).catch(()=>[])
    ]);
    const catalog=buildIncomeCatalog(event,collaboratorRows,personRows,imageRows,eventPersonSnapshotRows);
    const linkedByIncome=new Map(linkRows.map(raw=>{const link=incomeLinkFromDb(raw);return [link.incomeId,link];}));
    const query=normalizeWords(q);
    const items=catalog.filter(item=>{
      if(!query) return true;
      return normalizeWords([item.personName,item.paymentMethod,item.amount].join(' ')).includes(query);
    }).map(item=>{
      const link=linkedByIncome.get(item.id)||null;
      return {...item,linked:!!link,linkedMovementId:link?.movementId||'',linkedId:link?.id||'',selected:!!link&&link.movementId===selectedMovement,available:!link||link.movementId===selectedMovement};
    });
    return {ok:true,eventId:selectedEvent,movementId:selectedMovement,items};
  }catch(error){ throw friendlyDbError(error); }
}

export async function setIncomeLinks(movementId,payload={},actor={}){
  const id=text(movementId);
  const eventId=text(payload.eventId);
  const requested=[...new Set(arr(payload.incomeIds).map(text).filter(Boolean))];
  if(!id||!eventId) fail('Movimiento y evento son obligatorios.');
  try{
    const {data:movement,error:movementError}=await db().from(MOVEMENTS_TABLE).select('id,amount').eq('id',id).maybeSingle();
    if(movementError) throw movementError;
    if(!movement) fail('Movimiento bancario no encontrado.',404,'BANK_MOVEMENT_NOT_FOUND');
    if(num(movement.amount)<=0) fail('Solo los abonos se pueden justificar con ingresos del evento.',409,'BANK_NEGATIVE_INCOME_LINK');
    const event=await loadEvent(eventId);
    const [collaboratorRows,personRows,imageRows,existingRows,eventPersonSnapshotRows]=await Promise.all([
      selectPaged('ce_colaboradores',{columns:'id,event_id,persona_id,numero,situacion,importe,created_at,updated_at',order:'created_at',ascending:true,apply:query=>query.eq('event_id',event.id)}),
      selectPaged('ce_personas',{columns:'id,nombre,rango,created_at',order:'nombre',ascending:true}),
      selectPaged('ce_ticket_images',{columns:'image_key,event_id,label,public_url,pathname,storage_path,created_at',order:'created_at',ascending:true,apply:query=>query.eq('event_id',event.id)}),
      selectPaged(INCOME_LINKS_TABLE,{columns:'*',order:'created_at',ascending:true,apply:query=>query.eq('event_id',event.id)}),
      selectPaged('ce_event_person_snapshots',{columns:'event_id,persona_id,nombre_snapshot,rango_snapshot,captured_at,updated_at',order:'persona_id',ascending:true,apply:query=>query.eq('event_id',event.id)}).catch(()=>[])
    ]);
    const catalog=buildIncomeCatalog(event,collaboratorRows,personRows,imageRows,eventPersonSnapshotRows);
    const byId=new Map(catalog.map(item=>[item.id,item]));
    for(const incomeId of requested){ if(!byId.has(incomeId)) fail('Uno de los ingresos seleccionados no pertenece al evento activo o no figura como ingreso bancario.',409,'BANK_INCOME_NOT_AVAILABLE'); }
    const conflicts=existingRows.map(incomeLinkFromDb).filter(link=>requested.includes(link.incomeId)&&link.movementId!==id);
    if(conflicts.length) fail('Uno de los ingresos seleccionados ya justifica otro movimiento bancario.',409,'BANK_INCOME_ALREADY_LINKED');
    const {error:deleteError}=await db().from(INCOME_LINKS_TABLE).delete().eq('movement_id',id).eq('event_id',eventId);
    if(deleteError) throw deleteError;
    if(requested.length){
      const rows=requested.map(incomeId=>({movement_id:id,event_id:eventId,income_id:incomeId,income_amount_snapshot:byId.get(incomeId).amount,created_by:text(actor.identificacion||actor.nombre)}));
      const {error:insertError}=await db().from(INCOME_LINKS_TABLE).insert(rows);
      if(insertError) throw insertError;
    }
    return {ok:true,movementId:id,eventId,incomeIds:requested};
  }catch(error){
    if(String(error?.code||'')==='23505') fail('Uno de los ingresos seleccionados ya está vinculado a otro movimiento bancario.',409,'BANK_INCOME_ALREADY_LINKED');
    throw friendlyDbError(error);
  }
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
    const event=await loadEvent(eventId);
    const {data:existingMovementLinks,error:existingLinksError}=await db().from(LINKS_TABLE).select('event_id').eq('movement_id',id);
    if(existingLinksError) throw existingLinksError;
    const foreignEventIds=[...new Set(arr(existingMovementLinks).map(link=>text(link.event_id)).filter(linkEvent=>linkEvent&&linkEvent!==eventId))];
    if(foreignEventIds.length) fail('Este movimiento bancario ya está conciliado en otro evento. Déjalo inactivo en el evento actual.',409,'BANK_MOVEMENT_OTHER_EVENT');
    const catalog = await ticketCatalog(event.id,event.title);
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
  try{
    const selectedEvent=text(eventId);
    // INFOEVENTO necesita exactamente la foto de conciliación del evento: estado
    // «En saldo» por evento, cuadre normal/forzado y abonos conciliados. El exportador
    // antiguo devolvía el indicador global del movimiento y no calculaba el estado,
    // por eso aparecían registros ajenos y cargos exactos en rojo.
    if(selectedEvent){
      const reconciliation=await listBankReconciliation({accountId:text(accountId)||'TODOS',eventId:selectedEvent});
      const movements=arr(reconciliation.movements).filter(row=>row.included===true).map(row=>({
        ...row,
        links:arr(row.links).slice().sort((a,b)=>ticketNumber(a.ticketCode)-ticketNumber(b.ticketCode)||String(a.ticketCode||'').localeCompare(String(b.ticketCode||''),'es'))
      }));
      const links=movements.flatMap(row=>arr(row.links));
      return {
        ok:true,event:reconciliation.event,period:reconciliation.period,reconciliation:reconciliation.reconciliation||null,summary:reconciliation.summary,ticketSummary:reconciliation.ticketSummary,incomeSummary:reconciliation.incomeSummary,
        movements,links,batches:[],balanceTimeline:arr(reconciliation.balanceTimeline),
        eventSettings:[{eventId:selectedEvent,dateFrom:reconciliation.period?.dateFrom||'',dateTo:reconciliation.period?.dateTo||''}],
        incomeLinks:movements.flatMap(row=>arr(row.incomeLinks).filter(link=>link.manual&&link.linkId).map(link=>({id:link.linkId,movementId:row.id,eventId:selectedEvent,incomeId:link.id,incomeAmountSnapshot:link.amount}))),
        movementStates:movements.map(row=>({eventId:selectedEvent,movementId:row.id,included:true}))
      };
    }
    const [movementRows,linkRows,batchRows,settingRows,stateRows,incomeLinkRows]=await Promise.all([
      selectPaged(MOVEMENTS_TABLE,{columns:'*',order:'executed_at',ascending:true}),
      selectPaged(LINKS_TABLE,{columns:'*',order:'created_at',ascending:true}),
      selectPaged(BATCHES_TABLE,{columns:'*',order:'imported_at',ascending:true}),
      selectPaged(EVENT_SETTINGS_TABLE,{columns:'*',order:'updated_at',ascending:true}),
      selectPaged(EVENT_MOVEMENT_STATE_TABLE,{columns:'*',order:'updated_at',ascending:true}),
      selectPaged(INCOME_LINKS_TABLE,{columns:'*',order:'created_at',ascending:true})
    ]);
    const requestedAccount=text(accountId);
    let movements=movementRows.map(movementFromDb);
    if(requestedAccount && requestedAccount!=='TODOS') movements=movements.filter(row=>row.accountId===requestedAccount);
    const movementIds=new Set(movements.map(row=>text(row.id)));
    let links=linkRows.map(linkFromDb).filter(row=>movementIds.has(text(row.movementId)));
    let eventSettings=settingRows.map(eventSettingFromDb);
    let incomeLinks=incomeLinkRows.map(incomeLinkFromDb).filter(row=>movementIds.has(row.movementId));
    let movementStates=stateRows.map(row=>({
      eventId:text(row.event_id), movementId:text(row.movement_id), included:row.included!==false,
      updatedBy:text(row.updated_by), updatedAt:text(row.updated_at), createdAt:text(row.created_at)
    })).filter(row=>movementIds.has(row.movementId));
    if(selectedEvent){
      links=links.filter(row=>row.eventId===selectedEvent);
      eventSettings=eventSettings.filter(row=>row.eventId===selectedEvent);
      movementStates=movementStates.filter(row=>row.eventId===selectedEvent);
      incomeLinks=incomeLinks.filter(row=>row.eventId===selectedEvent);
      const linkedIds=new Set(links.map(row=>row.movementId));
      const stateIds=new Set(movementStates.map(row=>row.movementId));
      const period=eventSettings[0]||null;
      movements=movements.filter(row=>linkedIds.has(row.id)||stateIds.has(row.id)||(period&&inPeriod(row,period)));
    }
    const linksByMovement=new Map();
    links.forEach(link=>{ if(!linksByMovement.has(link.movementId)) linksByMovement.set(link.movementId,[]); linksByMovement.get(link.movementId).push(link); });
    return {
      ok:true,
      movements:movements.map(row=>({...row,links:linksByMovement.get(row.id)||[]})),
      links,
      batches:batchRows.map(batchFromDb),
      eventSettings,
      movementStates,
      incomeLinks
    };
  }catch(error){ throw friendlyDbError(error); }
}

