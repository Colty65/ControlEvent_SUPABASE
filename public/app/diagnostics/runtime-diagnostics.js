import { getApp } from '../app-context.js';
import { PACKAGE_NAME, VERSION, VERSION_FILE } from '../version.js';

const DIAGNOSTICS_VERSION = 'v30.9.1';
const INDEX_LINES_BEFORE_V26_5 = 21412;
const INDEX_LINES_AFTER_V26_5 = 20392;
const INDEX_BYTES_BEFORE_V26_5 = 1418313;
const INDEX_BYTES_AFTER_V26_5 = 1166152;
const INDEX_LINES_BEFORE_V26_6 = 20392;
const INDEX_LINES_AFTER_V26_6 = 570;
const INDEX_BYTES_BEFORE_V26_6 = 1166152;
const INDEX_BYTES_AFTER_V26_6 = 27229;
const INDEX_INLINE_SCRIPTS_EXTRACTED_V26_6 = 63;
const INDEX_LINES_AFTER_V26_7 = 447;
const INDEX_BYTES_AFTER_V26_7 = 21333;
const INDEX_LEGACY_REQUESTS_BEFORE_V26_7 = 63;
const INDEX_LEGACY_REQUESTS_AFTER_V26_7 = 2;
const INDEX_LINES_AFTER_V26_9 = 447;
const INDEX_BYTES_AFTER_V26_9 = 21333;
const INDEX_LINES_AFTER_V27_0 = 447;
const INDEX_BYTES_AFTER_V27_0 = 21333;
const DEFAULT_TIMEOUT_MS = 8000;
let lastInspection = null;
let lastApiCheck = null;

function nowIso(){
  try{ return new Date().toISOString(); }catch(_){ return String(Date.now()); }
}

function exists(value){
  return value !== undefined && value !== null;
}

function fn(value){
  return typeof value === 'function';
}

function objectVersion(name){
  const obj = window[name];
  return obj?.version || obj?.meta?.version || null;
}

function objectMode(name){
  const obj = window[name];
  return obj?.mode || obj?.meta?.mode || null;
}

function mapSize(value){
  if(value instanceof Map) return value.size;
  if(Array.isArray(value)) return value.length;
  if(value && typeof value === 'object') return Object.keys(value).length;
  return 0;
}

function safeCall(label, callback, fallback = null){
  try{
    return callback?.() ?? fallback;
  }catch(error){
    return {ok:false, label, error:error?.message || String(error)};
  }
}

function checkRoot(id){
  const el = document.getElementById(id);
  return {id, ok: !!el, module: el?.dataset?.ceModule || null, maintenance: el?.dataset?.ceMaintenanceModule || null};
}

function collectWarnings(report){
  const warnings = [];
  if(!report.app.ready) warnings.push('ControlEventApp todavía no está disponible.');
  if(!report.modules.domain.present) warnings.push('No se ha instalado ControlEventDomain.');
  if(!report.modules.views.present) warnings.push('No se ha instalado ControlEventModules.');
  if(!report.modules.excel.present) warnings.push('No se ha instalado ControlEventExcel.');
  if(!report.modules.tickets.present) warnings.push('No se ha instalado ControlEventTickets.');
  if(!report.modules.legacyCleanup.present) warnings.push('No se ha instalado ControlEventLegacyCleanup.');
  if(!report.modules.forms.present) warnings.push('No se ha instalado ControlEventForms.');
  if(!report.modules.maintenanceDiagnostics?.present) warnings.push('No se ha instalado ControlEventMaintenanceDiagnostics.');
  if(!report.modules.mobilePerformance?.present) warnings.push('No se ha instalado ControlEventMobilePerformance.');
  // Mantenimiento se instala bajo demanda al activar su vista, así que no es aviso crítico al arrancar.
  if(!report.dom.mainRoots.every(item => item.ok)) warnings.push('Falta algún contenedor principal de pantalla.');
  if(report.version.domTitle && !report.version.domTitle.includes('v30.9.1')) warnings.push('El título del documento no parece estar en v30.9.1.');
  if(report.version.bodyDataset && !report.version.bodyDataset.includes('v30.9.1')) warnings.push('body.dataset.ceVersion no coincide con v30.9.1.');
  if(!report.legacy.exportExcel) warnings.push('No se encuentra exportExcel legacy; INFOEVENTO podría fallar.');
  if(!report.legacy.saveStateNow) warnings.push('No se encuentra saveStateNow; el guardado podría depender de otro flujo.');
  return warnings;
}

export function inspectRuntime(){
  const app = getApp() || window.ControlEventApp || null;
  const modules = window.ControlEventModules || null;
  const maintenance = window.ControlEventMaintenance || null;
  const excel = window.ControlEventExcel || null;
  const tickets = window.ControlEventTickets || null;
  const domain = window.ControlEventDomain || null;
  const legacyMap = window.ControlEventLegacyMap || null;
  const legacyCleanup = window.ControlEventLegacyCleanup || null;
  const forms = window.ControlEventForms || null;
  const maintenanceDiagnostics = window.ControlEventMaintenanceDiagnostics || null;
  const mobilePerformance = window.ControlEventMobilePerformance || null;

  const report = {
    ok: true,
    diagnosticsVersion: DIAGNOSTICS_VERSION,
    inspectedAt: nowIso(),
    indexHtml: {
      linesBeforeV26_5: INDEX_LINES_BEFORE_V26_5,
      linesAfterV26_5: INDEX_LINES_AFTER_V26_5,
      linesReducedV26_5: INDEX_LINES_BEFORE_V26_5 - INDEX_LINES_AFTER_V26_5,
      bytesBeforeV26_5: INDEX_BYTES_BEFORE_V26_5,
      bytesAfterV26_5: INDEX_BYTES_AFTER_V26_5,
      bytesReducedV26_5: INDEX_BYTES_BEFORE_V26_5 - INDEX_BYTES_AFTER_V26_5,
      linesBeforeV26_6: INDEX_LINES_BEFORE_V26_6,
      linesAfterV26_6: INDEX_LINES_AFTER_V26_6,
      linesReducedV26_6: INDEX_LINES_BEFORE_V26_6 - INDEX_LINES_AFTER_V26_6,
      bytesBeforeV26_6: INDEX_BYTES_BEFORE_V26_6,
      bytesAfterV26_6: INDEX_BYTES_AFTER_V26_6,
      bytesReducedV26_6: INDEX_BYTES_BEFORE_V26_6 - INDEX_BYTES_AFTER_V26_6,
      inlineScriptsExtractedV26_6: INDEX_INLINE_SCRIPTS_EXTRACTED_V26_6,
      linesReducedTotalSinceV26_4: INDEX_LINES_BEFORE_V26_5 - INDEX_LINES_AFTER_V26_6,
      bytesReducedTotalSinceV26_4: INDEX_BYTES_BEFORE_V26_5 - INDEX_BYTES_AFTER_V26_6,
      linesAfterV26_7: INDEX_LINES_AFTER_V26_7,
      bytesAfterV26_7: INDEX_BYTES_AFTER_V26_7,
      legacyRequestsBeforeV26_7: INDEX_LEGACY_REQUESTS_BEFORE_V26_7,
      legacyRequestsAfterV26_7: INDEX_LEGACY_REQUESTS_AFTER_V26_7,
      legacyRequestsReducedV26_7: INDEX_LEGACY_REQUESTS_BEFORE_V26_7 - INDEX_LEGACY_REQUESTS_AFTER_V26_7,
      linesAfterV26_9: INDEX_LINES_AFTER_V26_9,
      bytesAfterV26_9: INDEX_BYTES_AFTER_V26_9,
      linesAfterV27_0: INDEX_LINES_AFTER_V27_0,
      bytesAfterV27_0: INDEX_BYTES_AFTER_V27_0
    },
    version: {
      expected: VERSION,
      file: VERSION_FILE,
      packageName: PACKAGE_NAME,
      domTitle: document.title || '',
      bodyDataset: document.body?.dataset?.ceVersion || ''
    },
    app: {
      ready: !!app,
      hasState: !!(app?.state || window.state),
      selectedEventId: String(app?.state?.selectedEventId || window.state?.selectedEventId || ''),
      currentMainTab: app?.navigation?.currentMainTab || null,
      currentMaintTab: app?.navigation?.currentMaintTab || null,
      user: app?.authUser?.nombre || window.authUser?.nombre || null,
      userLevel: app?.authUser?.nivel || window.authUser?.nivel || null
    },
    modules: {
      domain: {
        present: !!domain,
        version: objectVersion('ControlEventDomain'),
        mode: objectMode('ControlEventDomain'),
        hasApi: !!domain?.api,
        canCompareLegacy: fn(domain?.compareWithLegacy)
      },
      views: {
        present: !!modules,
        version: objectVersion('ControlEventModules'),
        entries: modules?.entries?.map?.(entry => entry.name) || [],
        loaded: mapSize(modules?.loaded),
        state: safeCall('ControlEventModules.info', () => modules?.info?.() || modules?.diagnostics?.(), {})
      },
      viewRuntime: {
        present: !!window.ControlEventViewRuntime,
        version: objectVersion('ControlEventViewRuntime'),
        info: safeCall('ControlEventViewRuntime.info', () => window.ControlEventViewRuntime?.info?.(), {})
      },
      maintenance: {
        present: !!maintenance,
        version: objectVersion('ControlEventMaintenance'),
        sections: maintenance?.sections?.map?.(section => section.name) || [],
        loaded: mapSize(maintenance?.loaded),
        info: safeCall('ControlEventMaintenance.info', () => maintenance?.info?.(), {})
      },
      excel: {
        present: !!excel,
        version: objectVersion('ControlEventExcel'),
        mode: objectMode('ControlEventExcel'),
        info: safeCall('ControlEventExcel.info', () => excel?.info?.(), {})
      },
      resumenSheet: {
        present: !!window.ControlEventResumenSheet,
        version: objectVersion('ControlEventResumenSheet'),
        mode: objectMode('ControlEventResumenSheet'),
        ready: safeCall('ControlEventResumenSheet.assertReady', () => window.ControlEventResumenSheet?.assertReady?.(), {})
      },
      tickets: {
        present: !!tickets,
        version: objectVersion('ControlEventTickets'),
        mode: objectMode('ControlEventTickets'),
        info: safeCall('ControlEventTickets.info', () => tickets?.info?.(), {})
      },
      legacyMap: {
        present: !!legacyMap,
        version: objectVersion('ControlEventLegacyMap'),
        summary: safeCall('ControlEventLegacyMap.summary', () => legacyMap?.summary?.(), {})
      },
      legacyCleanup: {
        present: !!legacyCleanup,
        version: objectVersion('ControlEventLegacyCleanup'),
        info: safeCall('ControlEventLegacyCleanup.info', () => legacyCleanup?.info?.(), {})
      },
      forms: {
        present: !!forms,
        version: objectVersion('ControlEventForms'),
        mode: objectMode('ControlEventForms'),
        info: safeCall('ControlEventForms.info', () => forms?.info?.(), {}),
        snapshot: safeCall('ControlEventForms.snapshot', () => forms?.snapshot?.(), {})
      },
      mobilePerformance: {
        present: !!mobilePerformance,
        version: objectVersion('ControlEventMobilePerformance'),
        mode: objectMode('ControlEventMobilePerformance'),
        quick: safeCall('ControlEventMobilePerformance.quick', () => mobilePerformance?.quick?.(), {})
      },
      maintenanceDiagnostics: {
        present: !!maintenanceDiagnostics,
        version: objectVersion('ControlEventMaintenanceDiagnostics'),
        mode: objectMode('ControlEventMaintenanceDiagnostics'),
        info: safeCall('ControlEventMaintenanceDiagnostics.info', () => maintenanceDiagnostics?.info?.(), {}),
        inspect: safeCall('ControlEventMaintenanceDiagnostics.inspect', () => maintenanceDiagnostics?.inspect?.(), {})
      }
    },
    dom: {
      mainRoots: ['tabIngresos','tabCompras','tabDonaciones','tabResumen','tabGraficas','maintenanceWrapper'].map(checkRoot),
      maintenanceRoots: ['mtPersonas','mtEventos','mtTiendas','mtProductos','mtAcceso','mtImportar'].map(checkRoot)
    },
    legacy: {
      exportExcel: fn(window.exportExcel) || fn(app?.actions?.exportExcel),
      exportSeedWorkbook: fn(window.exportSeedWorkbook) || fn(app?.actions?.exportSeedWorkbook),
      saveStateNow: fn(window.saveStateNow) || fn(app?.actions?.saveStateNow),
      renderBudget: fn(window.renderBudget) || fn(app?.actions?.renderBudget),
      renderCompras: fn(window.renderCompras) || fn(app?.actions?.renderCompras),
      renderDonaciones: fn(window.renderDonaciones) || fn(app?.actions?.renderDonaciones),
      renderColabs: fn(window.renderColabs) || fn(app?.actions?.renderColabs)
    },
    pwa: {
      serviceWorkerAvailable: 'serviceWorker' in navigator,
      controlled: !!navigator.serviceWorker?.controller
    }
  };
  report.warnings = collectWarnings(report);
  report.ok = report.warnings.length === 0;
  lastInspection = report;
  return report;
}

function fetchWithTimeout(url, options = {}){
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);
  return fetch(url, {
    cache: 'no-store',
    credentials: 'same-origin',
    ...options,
    signal: controller.signal
  }).finally(() => window.clearTimeout(timeout));
}

async function readJsonEndpoint(path){
  const startedAt = Date.now();
  try{
    const response = await fetchWithTimeout(path, {timeoutMs: DEFAULT_TIMEOUT_MS});
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();
    return {path, ok: response.ok, status: response.status, ms: Date.now() - startedAt, payload};
  }catch(error){
    return {path, ok:false, status:0, ms: Date.now() - startedAt, error:error?.message || String(error)};
  }
}

export async function checkApi(){
  const endpoints = ['/api/version', '/api/health', '/api/diagnostics'];
  const results = [];
  for(const endpoint of endpoints){
    results.push(await readJsonEndpoint(endpoint));
  }
  lastApiCheck = {
    ok: results.every(result => result.ok),
    checkedAt: nowIso(),
    results
  };
  return lastApiCheck;
}

export function assertHealthy(){
  const report = inspectRuntime();
  if(!report.ok){
    console.warn('[ControlEventDiagnostics/v30.9.1] Avisos detectados', report.warnings, report);
  }
  return report;
}

export function print(){
  const report = inspectRuntime();
  const rows = [
    ['App', report.app.ready ? 'OK' : 'NO'],
    ['Domain', report.modules.domain.present ? 'OK' : 'NO'],
    ['Views', report.modules.views.present ? 'OK' : 'NO'],
    ['Maintenance', report.modules.maintenance.present ? 'OK' : 'NO'],
    ['Excel', report.modules.excel.present ? 'OK' : 'NO'],
    ['Tickets', report.modules.tickets.present ? 'OK' : 'NO'],
    ['Legacy exportExcel', report.legacy.exportExcel ? 'OK' : 'NO'],
    ['Legacy map', report.modules.legacyMap.present ? 'OK' : 'NO'],
    ['Legacy cleanup', report.modules.legacyCleanup.present ? 'OK' : 'NO'],
    ['Forms', report.modules.forms.present ? 'OK' : 'NO'],
    ['Mobile performance', report.modules.mobilePerformance.present ? 'OK' : 'NO'],
    ['PWA control', report.pwa.controlled ? 'SW activo' : 'sin controlador']
  ];
  try{ console.table(rows.map(([area, estado]) => ({area, estado}))); }catch(_){ console.log(rows); }
  if(report.warnings.length) console.warn('[ControlEventDiagnostics/v30.9.1]', report.warnings);
  return report;
}

export function installRuntimeDiagnostics(runtime = {}){
  const api = {
    version: DIAGNOSTICS_VERSION,
    appVersion: VERSION,
    inspect: inspectRuntime,
    assertHealthy,
    checkApi,
    print,
    get lastInspection(){ return lastInspection; },
    get lastApiCheck(){ return lastApiCheck; },
    runtime
  };
  window.ControlEventDiagnostics = api;
  window.__ceV264Diagnostics = api;
  window.dispatchEvent(new CustomEvent('controlevent:diagnostics-ready', {detail: api}));
  return api;
}
