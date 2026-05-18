import { registerExcelModule, ensureExcelJS } from './_excel-runtime.js';

const GRAFICAS_SHEET_VERSION = 'v27.4.1';
const AUDIT_STORAGE_KEY = 'controlevent:v27.4.1:graficasModularAudit';
let installed = false;
let lastSnapshot = null;
let lastWorksheetBuild = null;
let lastInfoEventoAttach = null;

export const meta = {
  name: 'graficas-sheet',
  version: GRAFICAS_SHEET_VERSION,
  mode: 'modular-infoevento-audit-writer',
  description: 'Módulo real para preparar y escribir una hoja GRAFICAS modular. En v27.4.1 se integra en INFOEVENTO como hoja GRAFICAS_MODULAR para comparar sin sustituir todavía la hoja GRAFICAS legacy.'
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
  if(!storageAvailable()) return true;
  const raw = window.localStorage.getItem(AUDIT_STORAGE_KEY);
  if(raw === null || raw === '') return true;
  return !['0','false','no','off'].includes(String(raw).toLowerCase());
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
function writeChartBlock(ws, startRow, title, rows, columns){
  let r = startRow;
  ws.mergeCells(r,1,r,columns.length);
  ws.getCell(r,1).value = title;
  styleHeader(ws.getCell(r,1));
  r += 1;
  putRow(ws, r++, columns, styleHeader);
  rows.forEach(row => putRow(ws, r++, row, styleCell));
  r += 1;
  return r;
}
export function writeGraficasWorksheet(workbook, options = {}){
  if(!workbook || typeof workbook.addWorksheet !== 'function') throw new Error('writeGraficasWorksheet necesita un workbook de ExcelJS.');
  const model = options.model || buildGraficasModel(options);
  const sheetName = options.sheetName || 'GRAFICAS_MODULAR';
  const existing = workbook.getWorksheet?.(sheetName);
  if(existing && typeof workbook.removeWorksheet === 'function') workbook.removeWorksheet(existing.id);
  const ws = workbook.addWorksheet(sheetName, {views:[{state:'frozen', ySplit:1}]});
  ws.properties.defaultRowHeight = 20;
  ws.columns = [
    {header:'Bloque', width:18},
    {header:'Concepto', width:38},
    {header:'Comprado', width:18},
    {header:'Donado', width:18},
    {header:'Pendiente', width:18},
    {header:'Total', width:18}
  ];
  let r = 1;
  ws.mergeCells(r,1,r,6);
  ws.getCell(r,1).value = `GRAFICAS MODULARES DEL EVENTO - ${model.event.titulo}`;
  styleTitle(ws.getCell(r,1));
  r += 1;
  putRow(ws, r++, ['Emitido por', `ControlEvent ${GRAFICAS_SHEET_VERSION} - ©oltyLAB ’26`, '', '', '', model.generatedAt], styleCell);
  putRow(ws, r++, ['Situación', model.event.situacion, '', '', '', ''], styleCell);
  r += 1;
  r = writeChartBlock(ws, r, 'RESUMEN ECONÓMICO', model.charts.resumen.map(item => ['RESUMEN', item.label, '', '', '', item.value]), ['BLOQUE','CONCEPTO','COMPRADO','DONADO','PENDIENTE','TOTAL']);
  r = writeChartBlock(ws, r, 'POR SEGMENTO', model.charts.segmento.map(item => ['SEGMENTO', item.label, item.comprado, item.donado, item.pendiente, item.total]), ['BLOQUE','SEGMENTO','COMPRADO','DONADO','PENDIENTE','TOTAL']);
  r = writeChartBlock(ws, r, 'POR DESTINO', model.charts.destino.map(item => ['DESTINO', item.label, item.comprado, item.donado, item.pendiente, item.total]), ['BLOQUE','DESTINO','COMPRADO','DONADO','PENDIENTE','TOTAL']);
  r = writeChartBlock(ws, r, 'POR TIENDA Y TICKET', model.charts.tiendaTicket.map(item => ['TIENDA/TICKET', item.label, item.donado ? item.importe : '', item.donado ? item.importe : '', item.pendiente ? item.importe : '', item.importe]), ['BLOQUE','TIENDA/TICKET','COMPRADO','DONADO','PENDIENTE','TOTAL']);
  lastWorksheetBuild = {builtAt:new Date().toISOString(), version:GRAFICAS_SHEET_VERSION, sheetName, eventTitle:model.event.titulo, rows:ws.rowCount, columns:ws.columnCount};
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
export async function downloadStandaloneGraficas(options = {}){
  const ExcelJS = await ensureExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = `ControlEvent ${GRAFICAS_SHEET_VERSION} - ©oltyLAB ’26`;
  workbook.created = new Date();
  const result = writeGraficasWorksheet(workbook, {sheetName:'GRAFICAS', ...options});
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date();
  const stamp = `${String(date.getDate()).padStart(2,'0')}${String(date.getMonth()+1).padStart(2,'0')}${date.getFullYear()}_${String(date.getHours()).padStart(2,'0')}_${String(date.getMinutes()).padStart(2,'0')}_${String(date.getSeconds()).padStart(2,'0')}`;
  a.href = url;
  a.download = `ControlEvent_v27_4_1_GRAFICAS_MODULAR-${safeName(result.model.event.titulo)}_${stamp}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return result;
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
