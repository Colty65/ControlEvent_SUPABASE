const LEGACY_MAP_VERSION = 'v26.9';
const LEGACY_MAP_URL = './diagnostics/legacy-function-map.json';
const LEGACY_SUMMARY = {"bundles":["legacy-bundle-before-modules-v26.9.js","legacy-bundle-after-modules-v26.9.js"],"totalEntries":2340,"uniqueNames":1001,"duplicateNames":332,"exportedGlobalsOrActions":292,"kindCounts":{"function_decl":1475,"async_function_decl":67,"const_function":105,"arrow_function":401,"window_assignment":292},"bundleCounts":{"legacy-bundle-before-modules-v26.9.js":1880,"legacy-bundle-after-modules-v26.9.js":460},"topDuplicateNames":[{"name":"wrapped","count":56},{"name":"$","count":42},{"name":"render","count":35},{"name":"norm","count":35},{"name":"esc","count":34},{"name":"money","count":27},{"name":"refreshVersion","count":26},{"name":"st","count":25},{"name":"w","count":25},{"name":"up","count":21},{"name":"exportExcel","count":20},{"name":"ticket","count":19},{"name":"compras","count":19},{"name":"byId","count":19},{"name":"donorName","count":17},{"name":"setTip","count":17},{"name":"isCurrent","count":17},{"name":"persona","count":17},{"name":"tienda","count":16},{"name":"storeName","count":15},{"name":"graphPartsV171","count":15},{"name":"isDon","count":15},{"name":"sum","count":15},{"name":"emittedByTextV171","count":14},{"name":"value","count":14},{"name":"num","count":14},{"name":"price","count":13},{"name":"producto","count":13},{"name":"renderGraficas","count":12},{"name":"makeChartImageDataUrl","count":12}],"candidateDuplicateHelpers":246};
let rawMap = null;
let loadingPromise = null;
let installed = false;

function clone(value){
  try{ return JSON.parse(JSON.stringify(value)); }
  catch(_){ return value; }
}

async function load(){
  if(rawMap) return rawMap;
  if(!loadingPromise){
    loadingPromise = fetch(LEGACY_MAP_URL, {cache:'no-store'})
      .then(response => {
        if(!response.ok) throw new Error(`No se pudo cargar ${LEGACY_MAP_URL} (${response.status})`);
        return response.json();
      })
      .then(payload => { rawMap = payload; return rawMap; });
  }
  return loadingPromise;
}

function requireLoaded(action){
  if(rawMap) return rawMap;
  console.warn(`[ControlEventLegacyMap/v26.9] Para usar ${action}, ejecuta antes: await ControlEventLegacyMap.load()`);
  return null;
}

function summary(){
  return clone(rawMap?.summary || LEGACY_SUMMARY || {});
}

function printSummary(){
  const data = summary();
  const rows = [
    ['Entradas detectadas', data.totalEntries],
    ['Nombres únicos', data.uniqueNames],
    ['Nombres duplicados', data.duplicateNames],
    ['Globales/acciones expuestas', data.exportedGlobalsOrActions],
    ['Candidatos helper duplicados', data.candidateDuplicateHelpers]
  ];
  try{ console.table(rows.map(([k,v]) => ({concepto:k, valor:v}))); }
  catch(_){ console.log(rows); }
  return data;
}

function topDuplicates(limit = 30){
  return clone((summary().topDuplicateNames || []).slice(0, Number(limit) || 30));
}

function listDuplicates(options = {}){
  const map = requireLoaded('listDuplicates');
  if(!map) return [];
  const minCount = Number(options.minCount || 2);
  const riskIncludes = options.riskIncludes ? String(options.riskIncludes).toLowerCase() : '';
  return (map.duplicates || [])
    .filter(item => item.count >= minCount)
    .filter(item => !riskIncludes || (item.risk || []).join('|').toLowerCase().includes(riskIncludes))
    .map(item => clone(item));
}

function findName(name){
  const map = requireLoaded('findName');
  if(!map) return [];
  const wanted = String(name || '').trim().toLowerCase();
  if(!wanted) return [];
  const collections = [
    ...(map.duplicates || []),
    ...(map.exportedGlobalsOrActions || []).map(item => ({name:item.name,count:1,occurrences:[item],risk:['exported-global-or-action']})),
    ...(map.candidateDuplicateHelpers || [])
  ];
  return collections
    .filter(item => String(item.name || '').toLowerCase().includes(wanted))
    .map(item => clone(item));
}

function candidates(){
  const map = requireLoaded('candidates');
  return map ? clone(map.candidateDuplicateHelpers || []) : [];
}

function exported(){
  const map = requireLoaded('exported');
  return map ? clone(map.exportedGlobalsOrActions || []) : [];
}

async function loadAndFindName(name){
  await load();
  return findName(name);
}

async function loadAndListDuplicates(options = {}){
  await load();
  return listDuplicates(options);
}

function installLegacyMap(){
  const api = {
    version: LEGACY_MAP_VERSION,
    mapVersion: 'ControlEvent v3.0_prod',
    mapUrl: LEGACY_MAP_URL,
    get raw(){ return rawMap; },
    load,
    summary,
    printSummary,
    topDuplicates,
    listDuplicates,
    findName,
    loadAndFindName,
    loadAndListDuplicates,
    candidates,
    exported
  };
  window.ControlEventLegacyMap = api;
  window.__ceV268LegacyMap = api;
  installed = true;
  window.dispatchEvent(new CustomEvent('controlevent:legacy-map-ready', {detail: api}));
  return api;
}

export { installLegacyMap, load, listDuplicates, findName, summary, topDuplicates, loadAndFindName, loadAndListDuplicates };
export default installLegacyMap;

if(typeof window !== 'undefined' && !installed){
  installLegacyMap();
}
