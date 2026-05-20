/* ControlEvent v29.3 - Diagnóstico de peso legacy y preparación de limpieza.
   Sólo diagnóstico bajo demanda. No modifica la operativa. */
const VERSION = 'v29.3';
const LEGACY_BEFORE = 'legacy-bundle-before-modules-v29.3.js';
const LEGACY_AFTER = 'legacy-bundle-after-modules-v29.3.js';
const LEGACY_PATHS = [
  `/app/legacy/${LEGACY_BEFORE}`,
  `/app/legacy/${LEGACY_AFTER}`
];

function bytesToKb(bytes){ return Math.round((Number(bytes || 0) / 1024) * 10) / 10; }
function nowIso(){ try{return new Date().toISOString();}catch(_){return '';} }
async function fetchText(path){
  const response = await fetch(path, {cache:'no-store'});
  if(!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.text();
}
async function gzipSize(text){
  try{
    if(typeof CompressionStream === 'undefined') return null;
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    const buffer = await new Response(stream).arrayBuffer();
    return buffer.byteLength;
  }catch(_error){ return null; }
}
function resourceEntry(path){
  const entries = performance?.getEntriesByType?.('resource') || [];
  return entries.find(entry => String(entry.name || '').includes(path)) || null;
}
function countOccurrences(text, pattern){
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}
function topRepeatedFunctionNames(text, limit = 25){
  const names = [];
  const patterns = [
    /function\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/g,
    /window\.([A-Za-z_$][\w$]*)\s*=/g
  ];
  for(const rx of patterns){
    let m; while((m = rx.exec(text))) names.push(m[1]);
  }
  const counts = new Map();
  for(const name of names) counts.set(name, (counts.get(name) || 0) + 1);
  return [...counts.entries()]
    .filter(([,count]) => count > 1)
    .sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name,count]) => ({name, count}));
}
function sectionMarkers(text){
  const markers = [];
  const rx = /Bloque inline #(\d+)|v(\d+\.\d+(?:\.\d+)?)/g;
  let m;
  while((m = rx.exec(text)) && markers.length < 250){
    markers.push(m[1] ? `inline-${m[1]}` : `v${m[2]}`);
  }
  return markers;
}
async function analyzePath(path){
  const text = await fetchText(path);
  const encoded = new TextEncoder().encode(text);
  const gzipBytes = await gzipSize(text);
  const entry = resourceEntry(path);
  return {
    path,
    rawBytes: encoded.byteLength,
    rawKb: bytesToKb(encoded.byteLength),
    gzipBytes,
    gzipKb: gzipBytes == null ? null : bytesToKb(gzipBytes),
    transferKb: bytesToKb(entry?.transferSize || entry?.encodedBodySize || 0),
    decodedKb: bytesToKb(entry?.decodedBodySize || encoded.byteLength),
    lines: text.split(/\r?\n/).length,
    functionDeclarations: countOccurrences(text, /function\s+[A-Za-z_$][\w$]*\s*\(/g),
    windowAssignments: countOccurrences(text, /window\.[A-Za-z_$][\w$]*\s*=/g),
    inlineBlocks: countOccurrences(text, /Bloque inline #\d+/g),
    versionMarkers: countOccurrences(text, /ControlEvent v\d+\.\d+(?:\.\d+)?/g),
    topDuplicates: topRepeatedFunctionNames(text, 15),
    sampleMarkers: sectionMarkers(text).slice(0, 40)
  };
}
function recommendations(report){
  const recs = [];
  const totalKb = report.totals.rawKb;
  if(totalKb > 500) recs.push('El legacy sigue siendo pesado: priorizar partición por uso real antes de eliminar código.');
  if(report.totals.windowAssignments > 100) recs.push('Hay muchas funciones globales: extraer primero acciones con menor acoplamiento y mantener fachada de compatibilidad.');
  if(report.totals.inlineBlocks > 20) recs.push('Aún hay muchos bloques legacy históricos: revisar parches antiguos por versión y retirar sólo con mapa de uso.');
  recs.push('No tocar INFOEVENTO/BACKUP mientras sigan estables; la limpieza debe centrarse en código no ejecutado o diagnóstico.');
  recs.push('Siguiente paso seguro: instrumentar qué funciones legacy se llaman realmente durante una sesión normal.');
  return recs;
}
async function inspect(){
  const bundles = [];
  for(const path of LEGACY_PATHS){
    try{ bundles.push(await analyzePath(path)); }
    catch(error){ bundles.push({path, error: String(error?.message || error)}); }
  }
  const totals = bundles.reduce((acc, item) => {
    acc.rawBytes += item.rawBytes || 0;
    acc.gzipBytes += item.gzipBytes || 0;
    acc.lines += item.lines || 0;
    acc.functionDeclarations += item.functionDeclarations || 0;
    acc.windowAssignments += item.windowAssignments || 0;
    acc.inlineBlocks += item.inlineBlocks || 0;
    acc.versionMarkers += item.versionMarkers || 0;
    return acc;
  }, {rawBytes:0, gzipBytes:0, lines:0, functionDeclarations:0, windowAssignments:0, inlineBlocks:0, versionMarkers:0});
  totals.rawKb = bytesToKb(totals.rawBytes);
  totals.gzipKb = totals.gzipBytes ? bytesToKb(totals.gzipBytes) : null;
  const report = {
    version: VERSION,
    capturedAt: nowIso(),
    mode: 'diagnostic-only',
    bundles,
    totals,
    recommendations: []
  };
  report.recommendations = recommendations(report);
  window.__CE_LEGACY_WEIGHT_LAST_REPORT__ = report;
  return report;
}
async function print(){
  const report = await inspect();
  console.group(`[ControlEventLegacyWeight/${VERSION}] Peso legacy y preparación de limpieza`);
  console.table(report.bundles.map(b => ({path:b.path, rawKb:b.rawKb, gzipKb:b.gzipKb, lines:b.lines, inlineBlocks:b.inlineBlocks, funciones:b.functionDeclarations, windowAssignments:b.windowAssignments, error:b.error || ''})));
  console.info('Totales', report.totals);
  console.info('Recomendaciones', report.recommendations);
  console.groupEnd();
  return report;
}
function last(){ return window.__CE_LEGACY_WEIGHT_LAST_REPORT__ || null; }
async function quick(){
  const report = await inspect();
  return {
    version: report.version,
    rawKb: report.totals.rawKb,
    gzipKb: report.totals.gzipKb,
    lines: report.totals.lines,
    inlineBlocks: report.totals.inlineBlocks,
    windowAssignments: report.totals.windowAssignments,
    recommendation: report.recommendations[0]
  };
}

export function installLegacyWeightDiagnostics(){
  const api = {version: VERSION, paths: LEGACY_PATHS.slice(), inspect, print, quick, last};
  window.ControlEventLegacyWeight = api;
  return api;
}
