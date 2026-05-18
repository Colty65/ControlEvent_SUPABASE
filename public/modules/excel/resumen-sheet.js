import { registerExcelModule } from './_excel-runtime.js';

const RESUMEN_SHEET_VERSION = 'v27.1';
let lastSnapshot = null;
let installed = false;

export const meta = {
  name: 'resumen-sheet',
  version: RESUMEN_SHEET_VERSION,
  mode: 'modular-shadow-sheet',
  description: 'Módulo real para preparar y validar los datos de la hoja RESUMEN antes de que el motor INFOEVENTO legacy genere el Excel final.'
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

export function captureResumenSnapshot(options = {}){
  const model = buildResumenModel(options);
  const rows = buildResumenRows(model);
  lastSnapshot = {
    capturedAt: new Date().toISOString(),
    source: options.source || 'manual',
    model,
    rows,
    rowCount: rows.length
  };
  window.dispatchEvent(new CustomEvent('controlevent:excel-resumen-snapshot', {detail:lastSnapshot}));
  return lastSnapshot;
}

export function preview(){
  const snapshot = captureResumenSnapshot({source:'preview'});
  console.table(snapshot.rows.slice(1).map(row => ({bloque:row[0], campo:row[1], valor:row[2]})));
  return snapshot;
}

export function getLastSnapshot(){
  return lastSnapshot;
}

export function assertReady(){
  const snapshot = captureResumenSnapshot({source:'assert-ready'});
  const warnings = [];
  if(!snapshot.model.event.id && !snapshot.model.event.titulo) warnings.push('No hay evento activo para RESUMEN.');
  if(snapshot.rowCount < 10) warnings.push('El modelo RESUMEN contiene pocas filas.');
  return {ok:warnings.length === 0, warnings, snapshot};
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
    capture: captureResumenSnapshot,
    preview,
    assertReady,
    getLastSnapshot
  };
  window.addEventListener('controlevent:excel-before-run', event => {
    if(event?.detail?.name === 'exportExcel'){
      captureResumenSnapshot({source:'excel-before-run', excelOptions:event.detail.options});
    }
  });
  return window.ControlEventResumenSheet;
}

export function describe(){
  return {...meta, lastSnapshot};
}

const api = {meta, describe, run: captureResumenSnapshot, buildModel: buildResumenModel, buildRows: buildResumenRows, capture: captureResumenSnapshot, preview, assertReady, install: installResumenSheetBridge};
registerExcelModule('resumen-sheet', api);
registerExcelModule('resumen', api);

if(typeof window !== 'undefined'){
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installResumenSheetBridge, {once:true});
  else installResumenSheetBridge();
}
