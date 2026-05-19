/* ControlEvent v28.7 - Estado consolidado de rendimiento/móvil.
   Producción ligera: debug bajo demanda, ExcelJS bajo demanda, ActiveRender experimental apagado. */
import { VERSION } from '../version.js';

function safeCall(fn, fallback = null){
  try{ return typeof fn === 'function' ? fn() : fallback; }catch(error){ return {error: error?.message || String(error)}; }
}

function excelState(){
  const excel = window.ControlEventExcel?.info?.();
  const lazy = excel?.excelJs || null;
  return {
    loaded: !!(lazy?.loaded || window.ExcelJS),
    mode: lazy?.mode || 'unknown',
    source: lazy?.source || null,
    ready: !!lazy?.ready,
  };
}

function debugState(){
  const status = safeCall(() => window.ControlEventDebug?.status?.(), null);
  return {
    enabled: !!status?.enabled,
    loaded: !!status?.loaded,
    mode: status?.enabled ? 'debug-enabled' : 'production-lite'
  };
}

function resourcesSummary(){
  let resources = [];
  try{ resources = performance.getEntriesByType('resource') || []; }catch(_){ resources = []; }
  const summary = resources.reduce((acc, r) => {
    const type = r.initiatorType || 'other';
    const bytes = Number(r.transferSize || r.encodedBodySize || 0);
    acc.totalKb += bytes / 1024;
    acc.count += 1;
    acc.byType[type] = acc.byType[type] || {count:0, kb:0};
    acc.byType[type].count += 1;
    acc.byType[type].kb += bytes / 1024;
    return acc;
  }, {count:0, totalKb:0, byType:{}});
  summary.totalKb = Math.round(summary.totalKb * 10) / 10;
  for(const value of Object.values(summary.byType)) value.kb = Math.round(value.kb * 10) / 10;
  return summary;
}

function productionRules(){
  return [
    {area:'Debug/diagnósticos', expected:'bajo demanda', ok: !window.ControlEventDebug?.status?.().loaded || !!window.ControlEventDebug?.status?.().enabled},
    {area:'ExcelJS', expected:'no cargar al inicio', ok: !excelState().loaded},
    {area:'ActiveRender', expected:'experimental apagado', ok: !window.ControlEventActiveRender?.inspect?.().enabled},
    {area:'Hotpath cache', expected:'activo', ok: !!window.ControlEventHotpath?.inspect?.().enabled},
    {area:'Screen lazy', expected:'activo', ok: !!window.ControlEventScreenLazy?.info?.()},
    {area:'Mantenimiento', expected:'diferido/proxy', ok: !!window.ControlEventMaintenance?.info?.() || !!window.ControlEventMaintenance?.print},
  ];
}

function inspect(){
  const hotpath = safeCall(() => window.ControlEventHotpath?.inspect?.(), null);
  const activeRender = safeCall(() => window.ControlEventActiveRender?.inspect?.(), null);
  const screenLazy = safeCall(() => window.ControlEventScreenLazy?.info?.(), null);
  const maintenance = safeCall(() => window.ControlEventMaintenance?.info?.(), null);
  const runtime = window.ControlEventRuntime || null;
  const debug = debugState();
  const excel = excelState();
  const resources = resourcesSummary();
  const rules = productionRules();
  const score = Math.max(0, Math.min(100, 100 - rules.filter(r => !r.ok).length * 12));
  return {
    version: VERSION,
    mode: debug.enabled ? 'debug-enabled' : 'production-lite',
    score,
    excel,
    debug,
    hotpath: hotpath ? {enabled: hotpath.enabled, revision: hotpath.revision, cacheFunctions: hotpath.cacheFunctions, cacheSize: hotpath.cacheSize} : null,
    activeRender: activeRender ? {installed: activeRender.installed, enabled: activeRender.enabled, patched: activeRender.patched} : null,
    screenLazy: screenLazy ? {mode: screenLazy.mode, initialScheduled: screenLazy.initialScheduled, activeCount: screenLazy.active?.length || 0} : null,
    maintenance: maintenance ? {version: maintenance.version, proxy: maintenance.proxy, real: maintenance.__ceMaintenanceReal, loaded: maintenance.loaded} : null,
    resources,
    rules,
    runtime: runtime ? {version: runtime.version, mode: runtime.mode, appReady: !!runtime.app} : null,
    recommendations: rules.filter(r => !r.ok).map(r => `${r.area}: revisar, esperado ${r.expected}`)
  };
}

function print(){
  const report = inspect();
  console.group(`[ControlEventPerformanceStatus/${VERSION}] Estado de rendimiento consolidado`);
  console.info('Resumen', {mode: report.mode, score: report.score, excelLoaded: report.excel.loaded, resourcesKb: report.resources.totalKb});
  console.table(report.rules);
  console.info('Hotpath', report.hotpath);
  console.info('ActiveRender', report.activeRender);
  console.info('ScreenLazy', report.screenLazy);
  console.info('Maintenance', report.maintenance);
  if(report.recommendations.length) console.warn('Recomendaciones', report.recommendations);
  console.groupEnd();
  return report;
}

function quick(){
  const r = inspect();
  return {
    version: r.version,
    mode: r.mode,
    score: r.score,
    excelLoaded: r.excel.loaded,
    hotpathEnabled: !!r.hotpath?.enabled,
    activeRenderEnabled: !!r.activeRender?.enabled,
    resourcesKb: r.resources.totalKb,
    recommendations: r.recommendations
  };
}

export function installPerformanceStatus(){
  const api = {version: VERSION, inspect, print, quick};
  window.ControlEventPerformanceStatus = api;
  return api;
}
