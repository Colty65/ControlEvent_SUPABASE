import { registerExcelModule, ensureExcelJS, protectWorkbook } from './_excel-runtime.js';

const RESUMEN_SHEET_VERSION = 'v28.2.2';
let lastSnapshot = null;
let lastWorksheetBuild = null;
let installed = false;
let lastInfoEventoAttach = null;
const AUDIT_STORAGE_KEY = 'controlevent:v28.0:resumenModularAudit';

export const meta = {
  name: 'resumen-sheet',
  version: RESUMEN_SHEET_VERSION,
  mode: 'modular-infoevento-audit-writer',
  description: 'Módulo real para preparar, validar y escribir una hoja RESUMEN modular. En v28.0 mantiene el modelo modular para auditoría interna; la descarga standalone queda desactivada porque INFOEVENTO es la fuente fiable.'
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

function markMoneyColumn(ws, fromRow = 1, toRow = ws.rowCount){
  for(let r = fromRow; r <= toRow; r += 1){
    const valueCell = ws.getCell(r, 2);
    if(typeof valueCell.value === 'number') valueCell.numFmt = '#,##0.00 €;[Red]-#,##0.00 €';
  }
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
function makeResumenChartImage(model){
  if(typeof document === 'undefined') return null;
  const b = model.budget || {};
  const items = [
    {label:'Importe socios', value:b.socios?.importe, color:'#2563eb'},
    {label:'Ingresado socios', value:b.socios?.ingresado, color:'#059669'},
    {label:'Pendiente socios', value:b.socios?.pendiente, color:'#dc2626'},
    {label:'Comprado', value:b.operativa?.comprado, color:'#ef4444'},
    {label:'Pendiente compra', value:b.operativa?.pendienteCompra, color:'#f59e0b'},
    {label:'Saldo actual', value:b.operativa?.saldoActual, color:'#0f766e'},
    {label:'Saldo operativo', value:b.operativa?.saldoOperativo, color:'#0891b2'},
    {label:'Valoración evento', value:b.operativa?.valoracionEvento, color:'#111827'}
  ].map(item => ({...item, value:money(item.value)}));
  const width = 980;
  const height = 520;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if(!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,width,height);
  ctx.fillStyle = '#111827';
  ctx.font = '700 28px system-ui, -apple-system, Segoe UI, Arial';
  ctx.fillText(`RESUMEN VISUAL - ${model.event?.titulo || ''}`.slice(0, 62), 28, 44);
  ctx.font = '500 15px system-ui, -apple-system, Segoe UI, Arial';
  ctx.fillStyle = '#6b7280';
  ctx.fillText('Gráfico modular generado desde los datos del evento', 28, 70);
  const max = Math.max(1, ...items.map(item => Math.abs(item.value)));
  const labelX = 30;
  const barX = 300;
  const valueX = 860;
  const top = 105;
  const rowH = 47;
  items.forEach((item, index) => {
    const y = top + index * rowH;
    ctx.font = '700 16px system-ui, -apple-system, Segoe UI, Arial';
    ctx.fillStyle = '#111827';
    ctx.fillText(item.label, labelX, y + 23);
    ctx.fillStyle = '#f3f4f6';
    roundedRect(ctx, barX, y + 6, 520, 22, 11);
    ctx.fill();
    const ratio = Math.min(1, Math.abs(item.value) / max);
    const barW = Math.max(item.value === 0 ? 0 : 4, Math.round(520 * ratio));
    if(barW > 0){
      ctx.fillStyle = item.value < 0 ? '#b91c1c' : item.color;
      roundedRect(ctx, barX, y + 6, barW, 22, 11);
      ctx.fill();
    }
    ctx.font = '700 15px system-ui, -apple-system, Segoe UI, Arial';
    ctx.fillStyle = item.value < 0 ? '#b91c1c' : '#111827';
    ctx.textAlign = 'right';
    ctx.fillText(formatEuro(item.value), valueX + 90, y + 23);
    ctx.textAlign = 'left';
  });
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(28, height - 44, width - 56, 1);
  ctx.fillStyle = '#6b7280';
  ctx.font = '500 13px system-ui, -apple-system, Segoe UI, Arial';
  ctx.fillText(`©oltyLAB ’26_ControlEvent_${RESUMEN_SHEET_VERSION}`, 28, height - 18);
  return canvas.toDataURL('image/png');
}
function addResumenChartImage(workbook, worksheet, model){
  try{
    if(!workbook || !worksheet || typeof workbook.addImage !== 'function' || typeof worksheet.addImage !== 'function') return {added:false, reason:'exceljs-image-api-unavailable'};
    const base64 = makeResumenChartImage(model);
    if(!base64) return {added:false, reason:'canvas-unavailable'};
    const imageId = workbook.addImage({base64, extension:'png'});
    worksheet.addImage(imageId, {
      tl: {col: 3.2, row: 1.0},
      ext: {width: 760, height: 405},
      editAs: 'oneCell'
    });
    for(let c = 4; c <= 12; c += 1) worksheet.getColumn(c).width = 14;
    for(let r = 2; r <= 22; r += 1) worksheet.getRow(r).height = Math.max(worksheet.getRow(r).height || 20, 22);
    return {added:true, imageId, width:760, height:405};
  }catch(error){
    console.warn(`[ControlEventExcel/${RESUMEN_SHEET_VERSION}] No se pudo añadir gráfico standalone de RESUMEN.`, error);
    return {added:false, error:error?.message || String(error)};
  }
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
  configureCleanWorksheet(ws);
  ws.columns = [
    {header:'Concepto', key:'concepto', width:36},
    {header:'Valor', key:'valor', width:22},
    {header:'Observaciones', key:'observaciones', width:44}
  ];

  let r = 1;
  ws.mergeCells(r,1,r,3);
  ws.getCell(r,1).value = `RESUMEN DEL EVENTO - ${model.event.titulo}`;
  styleTitle(ws.getCell(r,1));
  ws.getRow(r).height = 24;
  r += 1;

  putRow(ws, r++, ['Emitido por', `©oltyLAB ’26_ControlEvent_${RESUMEN_SHEET_VERSION}`, model.generatedAt], (cell, index) => index === 0 ? styleLabel(cell) : styleValue(cell));
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

  if(options.includeDiagnosticRows === true){
    r += 1;
    putRow(ws, r++, ['BLOQUE', 'CAMPO', 'VALOR'], styleHeader);
    buildResumenRows(model).slice(1).forEach(row => {
      putRow(ws, r++, row, (cell, index) => index < 2 ? styleLabel(cell) : styleValue(cell));
    });
  }

  ws.eachRow(row => {
    row.eachCell(cell => {
      cell.alignment = {...(cell.alignment || {}), vertical:'middle', wrapText:true};
    });
  });
  markMoneyColumn(ws);
  try{ ws.autoFilter = {from:{row:5,column:1}, to:{row:Math.max(5, ws.rowCount), column:3}}; }catch(_){ }
  lastWorksheetBuild = {
    builtAt: new Date().toISOString(),
    version: RESUMEN_SHEET_VERSION,
    sheetName,
    eventTitle: model.event.titulo,
    rows: ws.rowCount,
    columns: ws.columnCount,
    standaloneClean: options.includeDiagnosticRows !== true
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
    console.warn('[ControlEventExcel] No se pudo limpiar el workbook standalone de RESUMEN.', error);
    return {ok:false, error:error?.message || String(error)};
  }
}

export async function downloadStandaloneResumen(options = {}){
  const message = 'RESUMEN standalone desactivado en v28.0: no se genera un Excel independiente porque la fuente fiable es INFOEVENTO. Usa el botón normal de INFOEVENTO para obtener RESUMEN y GRAFICAS correctos.';
  console.warn(`[ControlEventExcel/${RESUMEN_SHEET_VERSION}] ${message}`, {options});
  return {ok:false, disabled:true, version:RESUMEN_SHEET_VERSION, module:'resumen-sheet', message, recommendedAction:'exportExcel'};
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
