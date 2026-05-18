const CLEANUP_VERSION = 'v26.9';
const CLEANUP_REPORT_URL = './diagnostics/legacy-cleanup-report.json';
let cleanupReport = null;
let cleanupPromise = null;
let installed = false;

function clone(value){
  try{ return JSON.parse(JSON.stringify(value)); }
  catch(_){ return value; }
}

function activeLegacyScripts(){
  return Array.from(document.querySelectorAll('script[src*="/app/legacy/"]')).map(script => ({
    id: script.id || '',
    src: script.getAttribute('src') || script.src || '',
    loaded: true
  }));
}

function loadedLegacyVersions(){
  return activeLegacyScripts().map(item => {
    const match = String(item.src || '').match(/v(\d+\.\d+)/i);
    return match ? `v${match[1]}` : null;
  }).filter(Boolean);
}

async function load(){
  if(cleanupReport) return cleanupReport;
  if(!cleanupPromise){
    cleanupPromise = fetch(CLEANUP_REPORT_URL, {cache:'no-store'})
      .then(response => {
        if(!response.ok) throw new Error(`No se pudo cargar ${CLEANUP_REPORT_URL} (${response.status})`);
        return response.json();
      })
      .then(payload => { cleanupReport = payload; return cleanupReport; });
  }
  return cleanupPromise;
}

function info(){
  return {
    version: CLEANUP_VERSION,
    reportLoaded: !!cleanupReport,
    activeLegacyScripts: activeLegacyScripts(),
    loadedLegacyVersions: loadedLegacyVersions(),
    expectedLegacyVersion: 'v26.9',
    activeLegacyRequestCount: activeLegacyScripts().length,
    oldVersionLoaded: loadedLegacyVersions().some(version => version !== 'v26.9')
  };
}

function assertClean(){
  const result = info();
  const warnings = [];
  if(result.activeLegacyRequestCount !== 2) warnings.push(`Se esperaban 2 bundles legacy activos y hay ${result.activeLegacyRequestCount}.`);
  if(result.oldVersionLoaded) warnings.push(`Hay scripts legacy de versión antigua cargados: ${result.loadedLegacyVersions.join(', ')}`);
  if(warnings.length) console.warn('[ControlEventLegacyCleanup/v26.9]', warnings, result);
  return {ok: warnings.length === 0, warnings, ...result};
}

async function report(){
  return clone(await load());
}

async function obsoleteFiles(){
  const payload = await load();
  return clone(payload?.obsoleteFilesSafeToDelete || []);
}

async function print(){
  const payload = await load();
  const status = assertClean();
  try{
    console.table([
      {concepto:'Versión', valor: payload.version},
      {concepto:'Bundles legacy activos', valor: status.activeLegacyRequestCount},
      {concepto:'Peticiones legacy activas', valor: payload.legacyRequestsActive},
      {concepto:'index.html líneas', valor: payload.indexHtml?.lines},
      {concepto:'Bytes legacy total', valor: payload.legacyBundleSizes?.totalBytes}
    ]);
  }catch(_){ console.log(payload, status); }
  return {payload, status};
}

export function installLegacyCleanup(){
  const api = {version:CLEANUP_VERSION, reportUrl:CLEANUP_REPORT_URL, load, report, info, assertClean, activeLegacyScripts, obsoleteFiles, print};
  window.ControlEventLegacyCleanup = api;
  window.__ceV269LegacyCleanup = api;
  installed = true;
  window.dispatchEvent(new CustomEvent('controlevent:legacy-cleanup-ready', {detail: api}));
  return api;
}

export { load, report, info, assertClean, activeLegacyScripts, obsoleteFiles, print };
export default installLegacyCleanup;

if(typeof window !== 'undefined' && !installed){
  installLegacyCleanup();
}
