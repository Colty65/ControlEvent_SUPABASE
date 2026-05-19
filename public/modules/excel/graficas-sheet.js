import { registerExcelModule, ensureExcelJS, protectWorkbook } from './_excel-runtime.js';

const GRAFICAS_SHEET_VERSION = 'v28.4';
const AUDIT_STORAGE_KEY = 'controlevent:v28.0:graficasModularAudit';
let installed = false;
let lastSnapshot = null;
let lastWorksheetBuild = null;
let lastInfoEventoAttach = null;

export const meta = {
  name: 'graficas-sheet',
  version: GRAFICAS_SHEET_VERSION,
  mode: 'modular-infoevento-audit-writer',
  description: 'Módulo real para preparar y escribir una hoja GRAFICAS modular. En v28.0 mantiene el modelo modular para auditoría interna; la descarga standalone queda desactivada porque INFOEVENTO es la fuente fiable.'
};

const text = value => String(value ?? '').trim();
const num = value => {
  if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
  let s = String(value ?? '').replace(/[^0-9,.-]/g, '');
  if(s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if(s.includes(',')) s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
const money = value => Number(num(value).toFixed(2));
const arr = (obj, key) => Array.isArray(obj?.[key]) ? obj[key] : [];
const safeName = value => String(value || 'evento').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0,80) || 'evento';

function storageAvailable(){
  try{ return typeof window !== 'undefined' && !!window.localStorage; }
  catch(_){ return false; }
}
function readAuditSetting(){
  if(!storageAvailable()) return false;
  const raw = window.localStorage.getItem(AUDIT_STORAGE_KEY);
  if(raw === null || raw === '') return false;
  return ['1','true','yes','on'].includes(String(raw).toLowerCase());
}
export function setInfoEventoAuditEnabled(enabled = true){
  if(storageAvailable()) window.localStorage.setItem(AUDIT_STORAGE_KEY, enabled ? '1' : '0');
  return getInfoEventoAuditConfig();
}
export function getInfoEventoAuditConfig(){
  return {
    version: GRAFICAS_SHEET_VERSION,
    enabled: readAuditSetting(),
    storageKey: AUDIT_STORAGE_KEY,
    sheetName: 'GRAFICAS_MODULAR',
    lastInfoEventoAttach
  };
}

function app(){
  return window.ControlEventApp || window.__CONTROL_EVENT_APP__ || window;
}
function currentEvent(application = app()){
  const state = application?.state || window.state || {};
  const selectedId = state.selectedEventId || application?.selectedEventId || window.selectedEventId || '';
  const events = arr(state, 'eventos').length ? arr(state, 'eventos') : arr(window, 'eventos');
  return events.find(event => String(event.id) === String(selectedId)) || events[0] || null;
}
function safeCall(label, fn, fallback){
  try{ return fn(); }
  catch(error){ console.warn(`[ControlEventExcel/${GRAFICAS_SHEET_VERSION}] No se pudo calcular ${label}`, error); return fallback; }
}
function budgetSummary(application = app()){
  const candidates = [
    () => application?.calculations?.budgetSummary?.(),
    () => window.budgetSummary?.(),
    () => window.ControlEventDomain?.api?.budgetSummary?.()
  ];
  for(const candidate of candidates){
    const value = safeCall('budgetSummary', candidate, null);
    if(value && typeof value === 'object') return value;
  }
  return {};
}
function normalizeBudget(raw = {}){
  const ingresosDinero = raw.ingresosDinero || {};
  const socios = ingresosDinero.socios || raw.socios || {};
  const donantes = ingresosDinero.noSocios || ingresosDinero.donantes || raw.donantes || {};
  const donacionProducto = raw.donacionProducto || {};
  const operativa = raw.operativa || {};
  const compras = raw.compras || {};
  return {
    socios: {
      personas: num(socios.count ?? socios.personas),
      importe: money(socios.importe),
      ingresado: money(socios.ingresado),
      pendiente: money(socios.pendiente)
    },
    donantes: {
      personas: num(donantes.count ?? donantes.personas),
      importe: money(donantes.importe),
      ingresado: money(donantes.ingresado),
      pendiente: money(donantes.pendiente)
    },
    donacionProducto: {
      lineas: num(donacionProducto.lineas ?? donacionProducto.count),
      valorDonado: money(donacionProducto.valorDonado),
      tiendas: num(donacionProducto.tiendas),
      socios: num(donacionProducto.socios),
      otros: num(donacionProducto.otros)
    },
    operativa: {
      ingresosComprometidos: money(ingresosDinero.totalComprometido ?? operativa.ingresos),
      ingresosRealizados: money(ingresosDinero.totalIngresado ?? operativa.ingresoDinero),
      pendienteIngresos: money(ingresosDinero.pendiente),
      comprado: money(operativa.gastoCompras ?? compras.resueltas),
      gastosOrganizacion: money(operativa.gastosOrganizacion ?? compras.gastosCorrientes),
      pendienteCompra: money(operativa.pendiente ?? compras.pendientes),
      saldoActual: money(operativa.saldoActual ?? compras.saldoReal),
      saldoOperativo: money(operativa.saldoOperativo),
      valorDonado: money(operativa.valorDonado ?? donacionProducto.valorDonado),
      valoracionEvento: money(operativa.valoracionEvento)
    }
  };
}
function callSummary(name, fallback = []){
  const application = app();
  const candidates = [
    () => application?.calculations?.[name]?.(),
    () => window.ControlEventDomain?.api?.[name]?.(),
    () => window[name]?.()
  ];
  for(const candidate of candidates){
    const value = safeCall(name, candidate, null);
    if(Array.isArray(value)) return value;
  }
  return fallback;
}
function normalizeBreakdown(rows = []){
  return rows.map(row => ({
    label: text(row.label ?? row.k ?? row.nombre ?? row.name ?? 'Sin clasificar'),
    comprado: money(row.comprado ?? row.resuelto ?? row.resueltas ?? row.vComprado),
    donado: money(row.donado ?? row.valorDonado ?? row.vDonado),
    pendiente: money(row.pendiente ?? row.pendientes ?? row.vPendiente),
    total: money(row.total ?? (num(row.comprado ?? row.resuelto ?? row.resueltas ?? row.vComprado) + num(row.donado ?? row.valorDonado ?? row.vDonado) + num(row.pendiente ?? row.pendientes ?? row.vPendiente)))
  })).filter(row => row.label || row.total || row.comprado || row.donado || row.pendiente);
}
function normalizeTicketRows(rows = []){
  return rows.map(row => ({
    label: text(row.label ?? row.k ?? row.tienda ?? 'Sin tienda/ticket'),
    importe: money(row.v ?? row.importe ?? row.total),
    pendiente: !!row.pending,
    donado: !!row.donated,
    ticket: text(row.rawTicket || '')
  })).filter(row => row.label || row.importe);
}

export function buildGraficasModel(options = {}){
  const application = options.app || app();
  const event = options.event || currentEvent(application);
  const rawBudget = options.budget || budgetSummary(application);
  const budget = normalizeBudget(rawBudget);
  const segmento = normalizeBreakdown(options.segmento || callSummary('summaryBySegmento'));
  const destino = normalizeBreakdown(options.destino || callSummary('summaryByDestino'));
  const tiendaTicket = normalizeTicketRows(options.tiendaTicket || callSummary('summaryByTiendaTicket'));
  return {
    version: GRAFICAS_SHEET_VERSION,
    generatedAt: new Date().toISOString(),
    event: {
      id: event?.id || '',
      titulo: text(event?.titulo || event?.EVENTOS_TITULO || 'Sin evento'),
      situacion: event?.situacion || 'En curso'
    },
    budget,
    charts: {
      resumen: [
        {label:'Ingresos realizados', value:budget.operativa.ingresosRealizados},
        {label:'Pendiente ingresos', value:budget.operativa.pendienteIngresos},
        {label:'Comprado', value:budget.operativa.comprado},
        {label:'Pendiente compra', value:budget.operativa.pendienteCompra},
        {label:'Valor donado', value:budget.donacionProducto.valorDonado},
        {label:'Saldo operativo', value:budget.operativa.saldoOperativo},
        {label:'Valoración evento', value:budget.operativa.valoracionEvento}
      ],
      segmento,
      destino,
      tiendaTicket
    },
    rawBudget
  };
}
export function buildGraficasRows(model = buildGraficasModel()){
  const rows = [['BLOQUE','CONCEPTO','COMPRADO','DONADO','PENDIENTE','TOTAL']];
  model.charts.resumen.forEach(item => rows.push(['RESUMEN', item.label, '', '', '', item.value]));
  model.charts.segmento.forEach(item => rows.push(['SEGMENTO', item.label, item.comprado, item.donado, item.pendiente, item.total]));
  model.charts.destino.forEach(item => rows.push(['DESTINO', item.label, item.comprado, item.donado, item.pendiente, item.total]));
  model.charts.tiendaTicket.forEach(item => rows.push(['TIENDA/TICKET', item.label, '', '', item.pendiente ? item.importe : '', item.importe]));
  return rows;
}
function styleTitle(cell){ cell.font={bold:true,size:16}; cell.alignment={vertical:'middle',horizontal:'left'}; }
function styleHeader(cell){ cell.font={bold:true}; cell.alignment={vertical:'middle',horizontal:'center',wrapText:true}; cell.border={top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}}; }
function styleCell(cell, index){
  cell.alignment={vertical:'middle',horizontal:index < 2 ? 'left' : 'right',wrapText:true};
  cell.border={top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}};
  if(typeof cell.value === 'number') cell.numFmt = '#,##0.00 €;[Red]-#,##0.00 €';
  if(index < 2) cell.font={bold:index === 0};
}
function putRow(ws, rowNumber, values, styler = styleCell){
  const row = ws.getRow(rowNumber);
  values.forEach((value, index) => {
    const cell = row.getCell(index + 1);
    cell.value = value;
    if(styler) styler(cell, index, value);
  });
  row.commit?.();
  return row;
}
function styleSectionTitle(cell){
  styleHeader(cell);
  cell.font = {bold:true, size:13, color:{argb:'FFFFFFFF'}};
  cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF111827'}};
}


function formatEuro(value){
  try{
    return `${money(value).toLocaleString('es-ES', {minimumFractionDigits:2, maximumFractionDigits:2})} €`;
  }catch(_){
    return `${money(value).toFixed(2).replace('.', ',')} €`;
  }
}
function roundedRect(ctx, x, y, width, height, radius){
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
function drawStackedBar(ctx, x, y, width, height, parts, maxValue){
  ctx.fillStyle = '#f3f4f6';
  roundedRect(ctx, x, y, width, height, height / 2);
  ctx.fill();
  const totalAbs = Math.max(0, ...parts.map(part => Math.abs(num(part.value))));
  const scaleBase = Math.max(maxValue || 1, totalAbs || 1);
  let cursor = x;
  parts.forEach(part => {
    const value = Math.abs(num(part.value));
    if(!value) return;
    const partWidth = Math.max(3, Math.round(width * (value / scaleBase)));
    ctx.fillStyle = part.color;
    roundedRect(ctx, cursor, y, Math.min(partWidth, x + width - cursor), height, height / 2);
    ctx.fill();
    cursor += partWidth;
  });
}
function makeGraficasChartImage(model){
  if(typeof document === 'undefined') return null;
  const sections = [
    {
      title:'POR SEGMENTO',
      rows:(model.charts?.segmento || []).slice(0, 8).map(row => ({
        label: row.label,
        values: [
          {label:'Comprado', value:row.comprado, color:'#ef4444'},
          {label:'Donado', value:row.donado, color:'#f59e0b'},
          {label:'Pte.', value:row.pendiente, color:'#fb7185'}
        ],
        total: row.total
      }))
    },
    {
      title:'POR DESTINO',
      rows:(model.charts?.destino || []).slice(0, 8).map(row => ({
        label: row.label,
        values: [
          {label:'Comprado', value:row.comprado, color:'#ef4444'},
          {label:'Donado', value:row.donado, color:'#f59e0b'},
          {label:'Pte.', value:row.pendiente, color:'#fb7185'}
        ],
        total: row.total
      }))
    },
    {
      title:'POR TIENDA Y TICKET',
      rows:(model.charts?.tiendaTicket || []).slice(0, 9).map(row => ({
        label: row.label,
        values: [
          {label:'Importe', value:row.importe, color:row.pendiente ? '#fb7185' : (row.donado ? '#f59e0b' : '#0ea5e9')}
        ],
        total: row.importe
      }))
    }
  ];
  const width = 1120;
  const height = 880;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if(!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,width,height);
  ctx.fillStyle = '#111827';
  ctx.font = '700 28px system-ui, -apple-system, Segoe UI, Arial';
  ctx.fillText(`GRAFICAS MODULARES - ${model.event?.titulo || ''}`.slice(0, 70), 28, 44);
  ctx.font = '500 14px system-ui, -apple-system, Segoe UI, Arial';
  ctx.fillStyle = '#6b7280';
  ctx.fillText('Comprado · Donado · Pendiente / Total por agrupación', 28, 70);
  const allTotals = sections.flatMap(section => section.rows.map(row => Math.abs(num(row.total))));
  const maxValue = Math.max(1, ...allTotals);
  let y = 108;
  sections.forEach(section => {
    ctx.fillStyle = '#111827';
    roundedRect(ctx, 28, y - 24, width - 56, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 17px system-ui, -apple-system, Segoe UI, Arial';
    ctx.fillText(`${section.title}`, 42, y - 4);
    y += 18;
    section.rows.forEach(row => {
      const label = String(row.label || 'Sin clasificar');
      ctx.fillStyle = '#111827';
      ctx.font = '700 14px system-ui, -apple-system, Segoe UI, Arial';
      ctx.fillText(label.slice(0, 34), 42, y + 15);
      drawStackedBar(ctx, 315, y, 560, 20, row.values, maxValue);
      ctx.textAlign = 'right';
      ctx.font = '700 13px system-ui, -apple-system, Segoe UI, Arial';
      ctx.fillStyle = '#111827';
      ctx.fillText(formatEuro(row.total), width - 44, y + 16);
      ctx.textAlign = 'left';
      y += 31;
    });
    if(!section.rows.length){
      ctx.fillStyle = '#6b7280';
      ctx.font = '500 14px system-ui, -apple-system, Segoe UI, Arial';
      ctx.fillText('Sin datos', 42, y + 14);
      y += 31;
    }
    y += 26;
  });
  const legendY = height - 44;
  const legend = [
    ['Comprado', '#ef4444'],
    ['Donado', '#f59e0b'],
    ['Pendiente', '#fb7185'],
    ['Tienda/Ticket', '#0ea5e9']
  ];
  let x = 28;
  legend.forEach(([label, color]) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, legendY - 12, 12, 12);
    ctx.fillStyle = '#374151';
    ctx.font = '600 13px system-ui, -apple-system, Segoe UI, Arial';
    ctx.fillText(label, x + 18, legendY - 2);
    x += 125;
  });
  ctx.textAlign = 'right';
  ctx.fillStyle = '#6b7280';
  ctx.fillText(`©oltyLAB ’26_ControlEvent_${GRAFICAS_SHEET_VERSION}`, width - 28, legendY - 2);
  ctx.textAlign = 'left';
  return canvas.toDataURL('image/png');
}
function addGraficasChartImage(workbook, worksheet, model){
  try{
    if(!workbook || !worksheet || typeof workbook.addImage !== 'function' || typeof worksheet.addImage !== 'function') return {added:false, reason:'exceljs-image-api-unavailable'};
    const base64 = makeGraficasChartImage(model);
    if(!base64) return {added:false, reason:'canvas-unavailable'};
    const imageId = workbook.addImage({base64, extension:'png'});
    worksheet.addImage(imageId, {
      tl: {col: 7.1, row: 1.0},
      ext: {width: 840, height: 660},
      editAs: 'oneCell'
    });
    for(let c = 8; c <= 18; c += 1) worksheet.getColumn(c).width = 13;
    for(let r = 2; r <= 36; r += 1) worksheet.getRow(r).height = Math.max(worksheet.getRow(r).height || 20, 21);
    return {added:true, imageId, width:840, height:660};
  }catch(error){
    console.warn(`[ControlEventExcel/${GRAFICAS_SHEET_VERSION}] No se pudo añadir gráfico standalone de GRAFICAS.`, error);
    return {added:false, error:error?.message || String(error)};
  }
}

function configureCleanWorksheet(ws){
  try{
    ws.views = [{state:'frozen', ySplit:1}];
    ws.pageSetup = {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {left:0.25, right:0.25, top:0.35, bottom:0.35, header:0.1, footer:0.1}
    };
    ws.properties.defaultRowHeight = 20;
  }catch(_){ }
}
function writeChartBlock(ws, startRow, title, rows, columns){
  let r = startRow;
  ws.mergeCells(r,1,r,columns.length);
  ws.getCell(r,1).value = title;
  styleSectionTitle(ws.getCell(r,1));
  r += 1;
  putRow(ws, r++, columns, styleHeader);
  rows.forEach(row => putRow(ws, r++, row, styleCell));
  r += 1;
  return r;
}
function cleanTicketRow(item){
  const isDonado = !!item.donado;
  const isPendiente = !!item.pendiente;
  return [
    'TIENDA/TICKET',
    item.label,
    (!isDonado && !isPendiente) ? item.importe : '',
    isDonado ? item.importe : '',
    isPendiente ? item.importe : '',
    item.importe
  ];
}
export function writeGraficasWorksheet(workbook, options = {}){
  if(!workbook || typeof workbook.addWorksheet !== 'function') throw new Error('writeGraficasWorksheet necesita un workbook de ExcelJS.');
  const model = options.model || buildGraficasModel(options);
  const sheetName = options.sheetName || 'GRAFICAS_MODULAR';
  const existing = workbook.getWorksheet?.(sheetName);
  if(existing && typeof workbook.removeWorksheet === 'function') workbook.removeWorksheet(existing.id);
  const ws = workbook.addWorksheet(sheetName, {views:[{state:'frozen', ySplit:1}]});
  configureCleanWorksheet(ws);
  ws.columns = [
    {header:'Bloque', width:18},
    {header:'Concepto', width:42},
    {header:'Comprado', width:18},
    {header:'Donado', width:18},
    {header:'Pendiente', width:18},
    {header:'Total', width:18}
  ];
  let r = 1;
  ws.mergeCells(r,1,r,6);
  ws.getCell(r,1).value = `GRAFICAS MODULARES DEL EVENTO - ${model.event.titulo}`;
  styleTitle(ws.getCell(r,1));
  ws.getRow(r).height = 24;
  r += 1;
  putRow(ws, r++, ['Emitido por', `©oltyLAB ’26_ControlEvent_${GRAFICAS_SHEET_VERSION}`, '', '', '', model.generatedAt], styleCell);
  putRow(ws, r++, ['Situación', model.event.situacion, '', '', '', ''], styleCell);
  r += 1;
  r = writeChartBlock(ws, r, 'RESUMEN ECONÓMICO', model.charts.resumen.map(item => ['RESUMEN', item.label, '', '', '', item.value]), ['BLOQUE','CONCEPTO','COMPRADO','DONADO','PENDIENTE','TOTAL']);
  r = writeChartBlock(ws, r, 'POR SEGMENTO', model.charts.segmento.map(item => ['SEGMENTO', item.label, item.comprado, item.donado, item.pendiente, item.total]), ['BLOQUE','SEGMENTO','COMPRADO','DONADO','PENDIENTE','TOTAL']);
  r = writeChartBlock(ws, r, 'POR DESTINO', model.charts.destino.map(item => ['DESTINO', item.label, item.comprado, item.donado, item.pendiente, item.total]), ['BLOQUE','DESTINO','COMPRADO','DONADO','PENDIENTE','TOTAL']);
  r = writeChartBlock(ws, r, 'POR TIENDA Y TICKET', model.charts.tiendaTicket.map(cleanTicketRow), ['BLOQUE','TIENDA/TICKET','COMPRADO','DONADO','PENDIENTE','TOTAL']);
  try{ ws.autoFilter = {from:{row:5,column:1}, to:{row:Math.max(5, ws.rowCount), column:6}}; }catch(_){ }
  lastWorksheetBuild = {builtAt:new Date().toISOString(), version:GRAFICAS_SHEET_VERSION, sheetName, eventTitle:model.event.titulo, rows:ws.rowCount, columns:ws.columnCount, standaloneClean:true};
  window.dispatchEvent(new CustomEvent('controlevent:excel-graficas-worksheet-built', {detail:lastWorksheetBuild}));
  return {worksheet:ws, model, info:lastWorksheetBuild};
}
export function captureGraficasSnapshot(options = {}){
  const model = buildGraficasModel(options);
  const rows = buildGraficasRows(model);
  lastSnapshot = {capturedAt:new Date().toISOString(), source:options.source || 'manual', model, rows, rowCount:rows.length, writerReady:typeof window.ExcelJS?.Workbook === 'function'};
  window.dispatchEvent(new CustomEvent('controlevent:excel-graficas-snapshot', {detail:lastSnapshot}));
  return lastSnapshot;
}
export function preview(){
  const snapshot = captureGraficasSnapshot({source:'preview'});
  console.table(snapshot.rows.slice(1).map(row => ({bloque:row[0], concepto:row[1], comprado:row[2], donado:row[3], pendiente:row[4], total:row[5]})));
  return snapshot;
}
export function attachGraficasToInfoEventoWorkbook(workbook, options = {}){
  if(!readAuditSetting() && options.force !== true){
    lastInfoEventoAttach = {attached:false, skipped:true, reason:'disabled', at:new Date().toISOString(), version:GRAFICAS_SHEET_VERSION};
    return lastInfoEventoAttach;
  }
  try{
    if(!workbook || typeof workbook.addWorksheet !== 'function') throw new Error('Workbook ExcelJS no disponible.');
    const sheetName = options.sheetName || 'GRAFICAS_MODULAR';
    const result = writeGraficasWorksheet(workbook, {...options, sheetName, source:options.source || 'infoevento-audit'});
    const ws = result.worksheet;
    try{ ws.state = options.hidden ? 'hidden' : 'visible'; }catch(_){ }
    lastInfoEventoAttach = {attached:true, skipped:false, at:new Date().toISOString(), version:GRAFICAS_SHEET_VERSION, sheetName, hidden:!!options.hidden, rows:ws?.rowCount || 0, eventTitle:result.model?.event?.titulo || ''};
    window.dispatchEvent(new CustomEvent('controlevent:excel-graficas-infoevento-attached', {detail:lastInfoEventoAttach}));
    return lastInfoEventoAttach;
  }catch(error){
    lastInfoEventoAttach = {attached:false, skipped:false, at:new Date().toISOString(), version:GRAFICAS_SHEET_VERSION, error:error?.message || String(error)};
    console.warn(`[ControlEventExcel/${GRAFICAS_SHEET_VERSION}] No se pudo añadir GRAFICAS modular al INFOEVENTO. Se mantiene GRAFICAS legacy.`, error);
    return lastInfoEventoAttach;
  }
}

function sanitizeStandaloneWorkbook(workbook, worksheet){
  try{
    if(!workbook || !worksheet) return {ok:false, reason:'missing-workbook-or-worksheet'};
    const keepId = worksheet.id;
    if(Array.isArray(workbook.worksheets) && typeof workbook.removeWorksheet === 'function'){
      [...workbook.worksheets].forEach(ws => {
        if(ws && ws.id !== keepId) workbook.removeWorksheet(ws.id);
      });
    }
    // v28.0: no se vacían drawings/media porque los gráficos standalone son imágenes PNG protegidas.
    // Sólo se eliminan hojas sobrantes; la protección de objetos impide borrar los gráficos.
    try{ workbook.definedNames.model = []; }catch(_){ }
    configureCleanWorksheet(worksheet);
    return {ok:true, kept:worksheet.name, sheetCount:workbook.worksheets?.length || 0};
  }catch(error){
    console.warn('[ControlEventExcel] No se pudo limpiar el workbook standalone de GRAFICAS.', error);
    return {ok:false, error:error?.message || String(error)};
  }
}

export async function downloadStandaloneGraficas(options = {}){
  const message = 'GRAFICAS standalone desactivado en v28.0: no se genera un Excel independiente porque la fuente fiable es INFOEVENTO. Usa el botón normal de INFOEVENTO para obtener RESUMEN y GRAFICAS correctos.';
  console.warn(`[ControlEventExcel/${GRAFICAS_SHEET_VERSION}] ${message}`, {options});
  return {ok:false, disabled:true, version:GRAFICAS_SHEET_VERSION, module:'graficas-sheet', message, recommendedAction:'exportExcel'};
}

export function getLastSnapshot(){ return lastSnapshot; }
export function getLastWorksheetBuild(){ return lastWorksheetBuild; }
export function assertReady(){
  const snapshot = captureGraficasSnapshot({source:'assert-ready'});
  const warnings = [];
  if(!snapshot.model.event.id && !snapshot.model.event.titulo) warnings.push('No hay evento activo para GRAFICAS.');
  if(snapshot.rowCount < 8) warnings.push('El modelo GRAFICAS contiene pocas filas.');
  if(!snapshot.writerReady) warnings.push('ExcelJS no está disponible todavía; la escritura modular se probará cuando cargue vendor/exceljs.');
  return {ok:warnings.length === 0, warnings, snapshot, lastWorksheetBuild, audit:getInfoEventoAuditConfig()};
}
export function installGraficasSheetBridge(){
  if(installed) return window.ControlEventGraficasSheet;
  installed = true;
  window.ControlEventGraficasSheet = {
    version:GRAFICAS_SHEET_VERSION,
    mode:meta.mode,
    meta,
    buildModel:buildGraficasModel,
    buildRows:buildGraficasRows,
    writeWorksheet:writeGraficasWorksheet,
    downloadStandalone:downloadStandaloneGraficas,
    attachToInfoEventoWorkbook:attachGraficasToInfoEventoWorkbook,
    enableInfoEventoAudit:setInfoEventoAuditEnabled,
    auditConfig:getInfoEventoAuditConfig,
    capture:captureGraficasSnapshot,
    preview,
    assertReady,
    getLastSnapshot,
    getLastWorksheetBuild
  };
  window.addEventListener('controlevent:excel-before-run', event => {
    if(event?.detail?.name === 'exportExcel') captureGraficasSnapshot({source:'excel-before-run', excelOptions:event.detail.options});
  });
  return window.ControlEventGraficasSheet;
}
export function describe(){ return {...meta, audit:getInfoEventoAuditConfig(), lastSnapshot, lastWorksheetBuild, lastInfoEventoAttach}; }

const api = {
  meta,
  describe,
  run:captureGraficasSnapshot,
  buildModel:buildGraficasModel,
  buildRows:buildGraficasRows,
  writeWorksheet:writeGraficasWorksheet,
  downloadStandalone:downloadStandaloneGraficas,
  attachToInfoEventoWorkbook:attachGraficasToInfoEventoWorkbook,
  enableInfoEventoAudit:setInfoEventoAuditEnabled,
  auditConfig:getInfoEventoAuditConfig,
  capture:captureGraficasSnapshot,
  preview,
  assertReady,
  install:installGraficasSheetBridge
};
registerExcelModule('graficas-sheet', api);
registerExcelModule('graficas', api);

if(typeof window !== 'undefined'){
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installGraficasSheetBridge, {once:true});
  else installGraficasSheetBridge();
}
