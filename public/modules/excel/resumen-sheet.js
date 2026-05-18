import { registerExcelModule, ensureExcelJS } from './_excel-runtime.js';

const RESUMEN_SHEET_VERSION = 'v27.4.1';
let lastSnapshot = null;
let lastWorksheetBuild = null;
let installed = false;
let lastInfoEventoAttach = null;
const AUDIT_STORAGE_KEY = 'controlevent:v27.4.1:resumenModularAudit';

export const meta = {
  name: 'resumen-sheet',
  version: RESUMEN_SHEET_VERSION,
  mode: 'modular-infoevento-audit-writer',
  description: 'Módulo real para preparar, validar y escribir una hoja RESUMEN modular. En v27.4.1 no sustituye todavía el RESUMEN legacy del INFOEVENTO salvo prueba explícita.'
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
    version: RESUMEN_SHEET_VERSION,
    enabled: readAuditSetting(),
    storageKey: AUDIT_STORAGE_KEY,
    sheetName: 'RESUMEN_MODULAR',
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

function safeCall(label, fn, fallback = null){
  try{ return fn(); }
  catch(error){
    console.warn(`[ControlEventExcel/${RESUMEN_SHEET_VERSION}] No se pudo calcular ${label}`, error);
    return fallback;
  }
}

function legacyBudget(application = app()){
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
      gastosPrevistos: money(operativa.gastosPrevistos),
      gastosRealizados: money(operativa.gastosRealizados),
      saldoActual: money(operativa.saldoActual ?? compras.saldoReal),
      saldoOperativo: money(operativa.saldoOperativo),
      valorDonado: money(operativa.valorDonado ?? donacionProducto.valorDonado),
      valoracionEvento: money(operativa.valoracionEvento)
    }
  };
}

export function buildResumenModel(options = {}){
  const application = options.app || app();
  const event = options.event || currentEvent(application);
  const rawBudget = options.budget || legacyBudget(application);
  const budget = normalizeBudget(rawBudget);
  const generatedAt = new Date().toISOString();
  const title = text(event?.titulo || event?.EVENTOS_TITULO || 'Sin evento');
  return {
    version: RESUMEN_SHEET_VERSION,
    generatedAt,
    event: {
      id: event?.id || '',
      titulo: title,
      precio: money(event?.precio ?? event?.EVENTOS_PRECIO),
      fechaIni: event?.fechaIni || event?.fechaini || '',
      fechaFin: event?.fechaFin || event?.fechafin || '',
      situacion: event?.situacion || 'En curso',
      descripcion: event?.descripcion || ''
    },
    budget,
    rawBudget
  };
}

export function buildResumenRows(model = buildResumenModel()){
  const b = model.budget;
  return [
    ['BLOQUE', 'CAMPO', 'VALOR'],
    ['EVENTO', 'Título', model.event.titulo],
    ['EVENTO', 'Precio', model.event.precio],
    ['EVENTO', 'Fecha inicio', model.event.fechaIni],
    ['EVENTO', 'Fecha fin', model.event.fechaFin],
    ['EVENTO', 'Situación', model.event.situacion],
    ['SOCIOS', 'Personas', b.socios.personas],
    ['SOCIOS', 'Importe socios', b.socios.importe],
    ['SOCIOS', 'Ingresado socios', b.socios.ingresado],
    ['SOCIOS', 'Pendiente socios', b.socios.pendiente],
    ['DONANTES', 'Personas', b.donantes.personas],
    ['DONANTES', 'Importe donantes', b.donantes.importe],
    ['DONANTES', 'Ingresado donantes', b.donantes.ingresado],
    ['DONANTES', 'Pendiente donantes', b.donantes.pendiente],
    ['DONACIÓN PRODUCTO', 'Valor donado', b.donacionProducto.valorDonado],
    ['OPERATIVA', 'Ingresos comprometidos', b.operativa.ingresosComprometidos],
    ['OPERATIVA', 'Ingresos realizados', b.operativa.ingresosRealizados],
    ['OPERATIVA', 'Comprado', b.operativa.comprado],
    ['OPERATIVA', 'Gastos organización', b.operativa.gastosOrganizacion],
    ['OPERATIVA', 'Pendiente compra', b.operativa.pendienteCompra],
    ['OPERATIVA', 'Saldo actual', b.operativa.saldoActual],
    ['OPERATIVA', 'Saldo operativo', b.operativa.saldoOperativo],
    ['OPERATIVA', 'Valoración evento', b.operativa.valoracionEvento]
  ];
}

export function buildResumenSections(model = buildResumenModel()){
  const b = model.budget;
  return [
    {
      title: 'SOCIOS',
      rows: [
        ['SOCIOS', b.socios.personas],
        ['IMPORTE SOCIOS', b.socios.importe],
        ['INGRESADO SOCIOS', b.socios.ingresado],
        ['PENDIENTE SOCIOS', b.socios.pendiente]
      ]
    },
    {
      title: 'DONANTES',
      rows: [
        ['DONANTES', b.donantes.personas],
        ['IMPORTE DONANTES', b.donantes.importe],
        ['INGRESADO DONANTES', b.donantes.ingresado],
        ['VALOR ESTIMADO PRODUCTO DONADO', b.donacionProducto.valorDonado]
      ]
    },
    {
      title: 'OPERATIVA',
      rows: [
        ['SALDO GLOBAL', b.operativa.saldoActual],
        ['COMPRADO', b.operativa.comprado],
        ['PDTE.COMPRA', b.operativa.pendienteCompra],
        ['SALDO OPERATIVO', b.operativa.saldoOperativo],
        ['VALORACIÓN EVENTO', b.operativa.valoracionEvento]
      ]
    }
  ];
}

function styleTitle(cell){
  cell.font = {bold:true, size:16};
  cell.alignment = {vertical:'middle', horizontal:'left'};
}
function styleHeader(cell){
  cell.font = {bold:true};
  cell.alignment = {vertical:'middle', horizontal:'center', wrapText:true};
  cell.border = {top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'}};
}
function styleLabel(cell){
  cell.font = {bold:true};
  cell.alignment = {vertical:'middle', horizontal:'left', wrapText:true};
  cell.border = {top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'}};
}
function styleValue(cell){
  cell.alignment = {vertical:'middle', horizontal:'right', wrapText:true};
  cell.border = {top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'}};
  if(typeof cell.value === 'number') cell.numFmt = '#,##0.00 €;[Red]-#,##0.00 €';
}
function putRow(ws, rowNumber, values, styleFn){
  const row = ws.getRow(rowNumber);
  values.forEach((value, index) => {
    const cell = row.getCell(index + 1);
    cell.value = value;
    if(styleFn) styleFn(cell, index, value);
  });
  row.commit?.();
  return row;
}

export function writeResumenWorksheet(workbook, options = {}){
  if(!workbook || typeof workbook.addWorksheet !== 'function'){
    throw new Error('writeResumenWorksheet necesita un workbook de ExcelJS.');
  }
  const model = options.model || buildResumenModel(options);
  const sheetName = options.sheetName || 'RESUMEN_MODULAR';
  const existing = workbook.getWorksheet?.(sheetName);
  if(existing && typeof workbook.removeWorksheet === 'function') workbook.removeWorksheet(existing.id);
  const ws = workbook.addWorksheet(sheetName, {views:[{state:'frozen', ySplit:1}]});
  ws.properties.defaultRowHeight = 20;
  ws.columns = [
    {header:'Concepto', key:'concepto', width:34},
    {header:'Valor', key:'valor', width:22},
    {header:'Observaciones', key:'observaciones', width:48}
  ];

  let r = 1;
  ws.mergeCells(r,1,r,3);
  ws.getCell(r,1).value = `RESUMEN DEL EVENTO - ${model.event.titulo}`;
  styleTitle(ws.getCell(r,1));
  r += 1;
  putRow(ws, r++, ['Emitido por', `ControlEvent ${RESUMEN_SHEET_VERSION} - ©oltyLAB ’26`, model.generatedAt], (cell, index) => index === 0 ? styleLabel(cell) : styleValue(cell));
  putRow(ws, r++, ['Fechas', `${model.event.fechaIni || ''}${model.event.fechaFin ? ' - ' + model.event.fechaFin : ''}`, model.event.situacion], (cell, index) => index === 0 ? styleLabel(cell) : styleValue(cell));
  putRow(ws, r++, ['Precio evento', model.event.precio, model.event.descripcion || ''], (cell, index) => index === 0 ? styleLabel(cell) : styleValue(cell));
  r += 1;

  buildResumenSections(model).forEach(section => {
    ws.mergeCells(r,1,r,3);
    ws.getCell(r,1).value = section.title;
    styleHeader(ws.getCell(r,1));
    r += 1;
    section.rows.forEach(([label, value]) => {
      putRow(ws, r++, [label, value, ''], (cell, index) => index === 0 ? styleLabel(cell) : styleValue(cell));
    });
    r += 1;
  });

  putRow(ws, r++, ['BLOQUE', 'CAMPO', 'VALOR'], styleHeader);
  buildResumenRows(model).slice(1).forEach(row => {
    putRow(ws, r++, row, (cell, index) => index < 2 ? styleLabel(cell) : styleValue(cell));
  });

  ws.eachRow(row => {
    row.eachCell(cell => {
      cell.alignment = {...(cell.alignment || {}), vertical:'middle', wrapText:true};
    });
  });
  lastWorksheetBuild = {
    builtAt: new Date().toISOString(),
    version: RESUMEN_SHEET_VERSION,
    sheetName,
    eventTitle: model.event.titulo,
    rows: ws.rowCount,
    columns: ws.columnCount
  };
  window.dispatchEvent(new CustomEvent('controlevent:excel-resumen-worksheet-built', {detail:lastWorksheetBuild}));
  return {worksheet: ws, model, info: lastWorksheetBuild};
}

export function captureResumenSnapshot(options = {}){
  const model = buildResumenModel(options);
  const rows = buildResumenRows(model);
  lastSnapshot = {
    capturedAt: new Date().toISOString(),
    source: options.source || 'manual',
    model,
    rows,
    rowCount: rows.length,
    writerReady: typeof window.ExcelJS?.Workbook === 'function'
  };
  window.dispatchEvent(new CustomEvent('controlevent:excel-resumen-snapshot', {detail:lastSnapshot}));
  return lastSnapshot;
}

export function preview(){
  const snapshot = captureResumenSnapshot({source:'preview'});
  console.table(snapshot.rows.slice(1).map(row => ({bloque:row[0], campo:row[1], valor:row[2]})));
  return snapshot;
}


export function attachResumenToInfoEventoWorkbook(workbook, options = {}){
  if(!readAuditSetting() && options.force !== true){
    lastInfoEventoAttach = {attached:false, skipped:true, reason:'disabled', at:new Date().toISOString(), version:RESUMEN_SHEET_VERSION};
    return lastInfoEventoAttach;
  }
  try{
    if(!workbook || typeof workbook.addWorksheet !== 'function') throw new Error('Workbook ExcelJS no disponible.');
    const sheetName = options.sheetName || 'RESUMEN_MODULAR';
    const result = writeResumenWorksheet(workbook, {
      ...options,
      sheetName,
      source: options.source || 'infoevento-audit'
    });
    const ws = result.worksheet;
    try{ ws.state = options.hidden ? 'hidden' : 'visible'; }catch(_){ }
    lastInfoEventoAttach = {
      attached:true,
      skipped:false,
      at:new Date().toISOString(),
      version:RESUMEN_SHEET_VERSION,
      sheetName,
      hidden: !!options.hidden,
      rows: ws?.rowCount || 0,
      eventTitle: result.model?.event?.titulo || ''
    };
    window.dispatchEvent(new CustomEvent('controlevent:excel-resumen-infoevento-attached', {detail:lastInfoEventoAttach}));
    return lastInfoEventoAttach;
  }catch(error){
    lastInfoEventoAttach = {attached:false, skipped:false, at:new Date().toISOString(), version:RESUMEN_SHEET_VERSION, error:error?.message || String(error)};
    console.warn(`[ControlEventExcel/${RESUMEN_SHEET_VERSION}] No se pudo añadir RESUMEN modular al INFOEVENTO. Se mantiene RESUMEN legacy.`, error);
    return lastInfoEventoAttach;
  }
}

export async function downloadStandaloneResumen(options = {}){
  const ExcelJS = await ensureExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = `ControlEvent ${RESUMEN_SHEET_VERSION} - ©oltyLAB ’26`;
  workbook.created = new Date();
  const result = writeResumenWorksheet(workbook, {sheetName:'RESUMEN', ...options});
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date();
  const stamp = `${String(date.getDate()).padStart(2,'0')}${String(date.getMonth()+1).padStart(2,'0')}${date.getFullYear()}_${String(date.getHours()).padStart(2,'0')}_${String(date.getMinutes()).padStart(2,'0')}_${String(date.getSeconds()).padStart(2,'0')}`;
  a.href = url;
  a.download = `ControlEvent_v27_4_1_RESUMEN_MODULAR-${safeName(result.model.event.titulo)}_${stamp}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return result;
}

export function getLastSnapshot(){
  return lastSnapshot;
}

export function getLastWorksheetBuild(){
  return lastWorksheetBuild;
}

export function assertReady(){
  const snapshot = captureResumenSnapshot({source:'assert-ready'});
  const warnings = [];
  if(!snapshot.model.event.id && !snapshot.model.event.titulo) warnings.push('No hay evento activo para RESUMEN.');
  if(snapshot.rowCount < 10) warnings.push('El modelo RESUMEN contiene pocas filas.');
  if(!snapshot.writerReady) warnings.push('ExcelJS no está disponible todavía; la escritura modular se probará cuando cargue vendor/exceljs.');
  return {ok:warnings.length === 0, warnings, snapshot, lastWorksheetBuild, audit:getInfoEventoAuditConfig()};
}

export function installResumenSheetBridge(){
  if(installed) return window.ControlEventResumenSheet;
  installed = true;
  window.ControlEventResumenSheet = {
    version: RESUMEN_SHEET_VERSION,
    mode: meta.mode,
    meta,
    buildModel: buildResumenModel,
    buildRows: buildResumenRows,
    buildSections: buildResumenSections,
    writeWorksheet: writeResumenWorksheet,
    downloadStandalone: downloadStandaloneResumen,
    attachToInfoEventoWorkbook: attachResumenToInfoEventoWorkbook,
    enableInfoEventoAudit: setInfoEventoAuditEnabled,
    auditConfig: getInfoEventoAuditConfig,
    capture: captureResumenSnapshot,
    preview,
    assertReady,
    getLastSnapshot,
    getLastWorksheetBuild
  };
  window.addEventListener('controlevent:excel-before-run', event => {
    if(event?.detail?.name === 'exportExcel'){
      captureResumenSnapshot({source:'excel-before-run', excelOptions:event.detail.options});
    }
  });
  return window.ControlEventResumenSheet;
}

export function describe(){
  return {...meta, audit:getInfoEventoAuditConfig(), lastSnapshot, lastWorksheetBuild, lastInfoEventoAttach};
}

const api = {
  meta,
  describe,
  run: captureResumenSnapshot,
  buildModel: buildResumenModel,
  buildRows: buildResumenRows,
  buildSections: buildResumenSections,
  writeWorksheet: writeResumenWorksheet,
  downloadStandalone: downloadStandaloneResumen,
  attachToInfoEventoWorkbook: attachResumenToInfoEventoWorkbook,
  enableInfoEventoAudit: setInfoEventoAuditEnabled,
  auditConfig: getInfoEventoAuditConfig,
  capture: captureResumenSnapshot,
  preview,
  assertReady,
  install: installResumenSheetBridge
};
registerExcelModule('resumen-sheet', api);
registerExcelModule('resumen', api);

if(typeof window !== 'undefined'){
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installResumenSheetBridge, {once:true});
  else installResumenSheetBridge();
}
