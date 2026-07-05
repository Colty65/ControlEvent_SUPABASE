/* ControlEvent v18_prod - Diagnóstico de carga móvil/rendimiento.
   Sólo lectura: no modifica estado, no toca INFOEVENTO/BACKUP ni guardado. */
import { VERSION } from '../version.js';

const DIAGNOSTICS_VERSION = 'v30.7';
const LEGACY_BEFORE = 'legacy-bundle-before-modules-v30.7.js';
const LEGACY_AFTER = 'legacy-bundle-after-modules-v30.7.js';
let lastReport = null;

function nowIso(){
  try{ return new Date().toISOString(); }catch(_){ return String(Date.now()); }
}

function number(value, fallback = 0){
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round(value, decimals = 1){
  const p = Math.pow(10, decimals);
  return Math.round(number(value) * p) / p;
}

function bytesToKb(bytes){ return round(number(bytes) / 1024, 1); }
function bytesToMb(bytes){ return round(number(bytes) / (1024 * 1024), 2); }

function navInfo(){
  const nav = navigator || {};
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection || null;
  return {
    userAgent: nav.userAgent || '',
    platform: nav.platform || '',
    language: nav.language || '',
    online: nav.onLine,
    hardwareConcurrency: nav.hardwareConcurrency || null,
    deviceMemoryGb: nav.deviceMemory || null,
    connection: connection ? {
      effectiveType: connection.effectiveType || null,
      downlinkMbps: connection.downlink || null,
      rttMs: connection.rtt || null,
      saveData: !!connection.saveData
    } : null
  };
}

function screenInfo(){
  return {
    width: window.innerWidth || 0,
    height: window.innerHeight || 0,
    screenWidth: window.screen?.width || 0,
    screenHeight: window.screen?.height || 0,
    devicePixelRatio: window.devicePixelRatio || 1,
    orientation: window.screen?.orientation?.type || null,
    isLikelyMobile: Math.min(window.innerWidth || 9999, window.innerHeight || 9999) <= 760 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')
  };
}

function getPerformanceEntries(){
  try{ return performance.getEntriesByType('resource') || []; }catch(_){ return []; }
}

function isSameOrigin(entry){
  try{ return new URL(entry.name, location.href).origin === location.origin; }catch(_){ return false; }
}

function pathOf(entry){
  try{ return new URL(entry.name, location.href).pathname; }catch(_){ return String(entry.name || ''); }
}

function sizeOf(entry){
  return number(entry.transferSize || entry.encodedBodySize || entry.decodedBodySize || 0);
}

function resourceRows(){
  return getPerformanceEntries().map(entry => ({
    name: entry.name,
    path: pathOf(entry),
    type: entry.initiatorType || '',
    sameOrigin: isSameOrigin(entry),
    durationMs: round(entry.duration || 0, 1),
    transferKb: bytesToKb(entry.transferSize || 0),
    encodedKb: bytesToKb(entry.encodedBodySize || 0),
    decodedKb: bytesToKb(entry.decodedBodySize || 0),
    sizeBytes: sizeOf(entry),
    fromCacheLikely: !entry.transferSize && !!entry.decodedBodySize
  }));
}

function groupResources(rows){
  const totals = {all:{count:0,kb:0}, script:{count:0,kb:0}, css:{count:0,kb:0}, image:{count:0,kb:0}, fetch:{count:0,kb:0}, other:{count:0,kb:0}};
  for(const row of rows){
    const key = row.type === 'script' ? 'script' : row.type === 'css' || row.type === 'link' ? 'css' : row.type === 'img' ? 'image' : row.type === 'fetch' || row.type === 'xmlhttprequest' ? 'fetch' : 'other';
    const kb = row.transferKb || row.encodedKb || row.decodedKb || 0;
    totals.all.count += 1; totals.all.kb += kb;
    totals[key].count += 1; totals[key].kb += kb;
  }
  for(const value of Object.values(totals)) value.kb = round(value.kb, 1);
  return totals;
}

function legacyResources(rows){
  return rows.filter(row => row.path.includes('/app/legacy/') || row.path.includes(LEGACY_BEFORE) || row.path.includes(LEGACY_AFTER));
}

function domMetrics(){
  const inputs = document.querySelectorAll('input,select,textarea,button').length;
  const cards = document.querySelectorAll('.card,.itemcard,.summary-card,.budget-panel').length;
  const hidden = document.querySelectorAll('.hidden,[hidden],.collapsed-body.hidden').length;
  const nodes = document.getElementsByTagName('*').length;
  return {
    nodes,
    inputsAndButtons: inputs,
    cards,
    hiddenNodes: hidden,
    mainCards: document.querySelectorAll('.main .card').length,
    rowsRendered: document.querySelectorAll('.itemcard,.rowline,.summary-item,.budget-row').length
  };
}

function memoryInfo(){
  const mem = performance.memory || null;
  if(!mem) return null;
  return {
    usedJsHeapMb: bytesToMb(mem.usedJSHeapSize),
    totalJsHeapMb: bytesToMb(mem.totalJSHeapSize),
    heapLimitMb: bytesToMb(mem.jsHeapSizeLimit)
  };
}

function navTiming(){
  const nav = performance.getEntriesByType?.('navigation')?.[0] || null;
  if(nav){
    return {
      type: nav.type || null,
      domInteractiveMs: round(nav.domInteractive || 0, 1),
      domContentLoadedMs: round(nav.domContentLoadedEventEnd || 0, 1),
      loadEventEndMs: round(nav.loadEventEnd || 0, 1),
      responseEndMs: round(nav.responseEnd || 0, 1),
      transferKb: bytesToKb(nav.transferSize || 0),
      decodedKb: bytesToKb(nav.decodedBodySize || 0)
    };
  }
  const timing = performance.timing || null;
  if(!timing) return null;
  const start = timing.navigationStart;
  return {
    type: 'legacy-timing',
    domInteractiveMs: timing.domInteractive - start,
    domContentLoadedMs: timing.domContentLoadedEventEnd - start,
    loadEventEndMs: timing.loadEventEnd - start,
    responseEndMs: timing.responseEnd - start
  };
}

function scriptTags(){
  return Array.from(document.scripts || []).map(script => ({
    id: script.id || '',
    src: script.src ? pathOf({name: script.src}) : '(inline)',
    type: script.type || 'classic',
    async: !!script.async,
    defer: !!script.defer
  }));
}

function estimateScore(report){
  let score = 100;
  const allKb = report.resources.totals.all.kb;
  const scriptKb = report.resources.totals.script.kb;
  const scriptCount = report.resources.totals.script.count;
  const legacyCount = report.resources.legacy.count;
  const domNodes = report.dom.nodes;
  if(allKb > 2500) score -= 25; else if(allKb > 1500) score -= 15; else if(allKb > 900) score -= 8;
  if(scriptKb > 1800) score -= 25; else if(scriptKb > 1000) score -= 15; else if(scriptKb > 700) score -= 8;
  if(scriptCount > 25) score -= 12; else if(scriptCount > 15) score -= 7;
  if(legacyCount > 2) score -= 10;
  if(domNodes > 5000) score -= 18; else if(domNodes > 3000) score -= 10; else if(domNodes > 1800) score -= 5;
  if(report.navigator.connection?.saveData) score -= 3;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function recommendations(report){
  const recs = [];
  if(report.resources.totals.script.kb > 1000) recs.push('Separar ExcelJS y legacy para cargarlos sólo cuando se usan. Impacto móvil: muy alto.');
  if(report.resources.legacy.count >= 2) recs.push('Siguiente fase: dividir legacy por pantalla o cargar el segundo bundle bajo demanda.');
  if(report.dom.nodes > 2500) recs.push('Reducir renderizados iniciales: listas largas sólo al abrir cada pestaña.');
  if(report.resources.excelJs.loadedAtStart) recs.push('ExcelJS ya aparece cargado; confirmar que sólo se ha cargado tras pedir INFOEVENTO/Excel.');
  else recs.push('ExcelJS no está cargado al inicio: correcto para móvil. Se cargará bajo demanda al generar Excel.');
  if(report.pwa.controlled && report.resources.totals.all.kb === 0) recs.push('Muchos recursos parecen venir de caché; probar una carga en incógnito para medir peso real.');
  if(!recs.length) recs.push('Diagnóstico sin avisos relevantes. Mantener estrategia de carga diferida por pantalla.');
  return recs;
}

export function inspectMobilePerformance(){
  const rows = resourceRows();
  const legacy = legacyResources(rows);
  const excelJs = rows.find(row => row.path.includes('exceljs')) || null;
  const report = {
    version: DIAGNOSTICS_VERSION,
    appVersion: VERSION,
    inspectedAt: nowIso(),
    mode: 'diagnostic-only',
    screen: screenInfo(),
    navigator: navInfo(),
    timing: navTiming(),
    memory: memoryInfo(),
    dom: domMetrics(),
    scripts: {
      tags: scriptTags(),
      count: document.scripts?.length || 0
    },
    resources: {
      totals: groupResources(rows),
      count: rows.length,
      rows,
      legacy: {
        count: legacy.length,
        totalKb: round(legacy.reduce((sum, row) => sum + (row.transferKb || row.encodedKb || row.decodedKb || 0), 0), 1),
        files: legacy.map(row => ({path: row.path, kb: row.transferKb || row.encodedKb || row.decodedKb || 0, durationMs: row.durationMs}))
      },
      excelJs: {
        loadedAtStart: !!excelJs,
        path: excelJs?.path || null,
        kb: excelJs ? (excelJs.transferKb || excelJs.encodedKb || excelJs.decodedKb || 0) : 0,
        globalReady: !!window.ExcelJS?.Workbook,
        lazyInfo: window.ControlEventExcel?.excelJsInfo?.() || null
      }
    },
    pwa: {
      serviceWorkerAvailable: 'serviceWorker' in navigator,
      controlled: !!navigator.serviceWorker?.controller,
      controllerUrl: navigator.serviceWorker?.controller?.scriptURL || null
    }
  };
  report.score = estimateScore(report);
  report.recommendations = recommendations(report);
  lastReport = report;
  return report;
}

export function resources(){
  const rows = resourceRows();
  try{ console.table(rows.map(row => ({type: row.type, path: row.path, kb: row.transferKb || row.encodedKb || row.decodedKb, ms: row.durationMs, cache: row.fromCacheLikely}))); }catch(_){ console.log(rows); }
  return rows;
}

export function scripts(){
  const rows = scriptTags();
  try{ console.table(rows); }catch(_){ console.log(rows); }
  return rows;
}

export function print(){
  const report = inspectMobilePerformance();
  console.group(`[ControlEventMobilePerformance/${DIAGNOSTICS_VERSION}] Diagnóstico móvil/rendimiento`);
  console.log('Resumen', {
    score: report.score,
    isLikelyMobile: report.screen.isLikelyMobile,
    resourcesKb: report.resources.totals.all.kb,
    scriptKb: report.resources.totals.script.kb,
    scriptCount: report.resources.totals.script.count,
    legacyKb: report.resources.legacy.totalKb,
    domNodes: report.dom.nodes,
    excelJsAtStart: report.resources.excelJs.loadedAtStart,
    swControlled: report.pwa.controlled
  });
  try{
    console.table(Object.entries(report.resources.totals).map(([tipo, value]) => ({tipo, peticiones:value.count, kb:value.kb})));
  }catch(_){ console.log(report.resources.totals); }
  if(report.recommendations.length) console.info('Recomendaciones:', report.recommendations);
  console.groupEnd();
  return report;
}

export function quick(){
  const report = inspectMobilePerformance();
  return {
    version: report.version,
    score: report.score,
    mobile: report.screen.isLikelyMobile,
    resourcesKb: report.resources.totals.all.kb,
    scriptKb: report.resources.totals.script.kb,
    scriptCount: report.resources.totals.script.count,
    legacyKb: report.resources.legacy.totalKb,
    domNodes: report.dom.nodes,
    excelJsAtStart: report.resources.excelJs.loadedAtStart,
    recommendations: report.recommendations
  };
}

export function installMobilePerformanceDiagnostics(){
  const api = {
    version: DIAGNOSTICS_VERSION,
    mode: 'diagnostic-only',
    inspect: inspectMobilePerformance,
    print,
    quick,
    resources,
    scripts,
    get lastReport(){ return lastReport; }
  };
  window.ControlEventMobilePerformance = api;
  window.__ceV278MobilePerformance = api;
  window.dispatchEvent(new CustomEvent('controlevent:mobile-performance-ready', {detail: api}));
  return api;
}
