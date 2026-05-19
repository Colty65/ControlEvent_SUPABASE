/* ControlEvent v28.7.5 - Optimizador conservador de rutas calientes legacy.
   Objetivo móvil: reducir recalculos repetidos dentro del mismo estado sin tocar INFOEVENTO/BACKUP.
   Cachea selectores/calculos puros y se invalida ante cambios de formulario, clicks y mutaciones legacy. */
import { VERSION } from '../version.js';

const CACHEABLE = [
  'selectedEvent',
  'isLocked',
  'personasForSelectedEvent',
  'tiendasForSelectedEvent',
  'productosForSelectedEvent',
  'collabsForEvent',
  'comprasForEvent',
  'ingresoSummary',
  'budgetSummary',
  'summaryBySegmento',
  'summaryByDestino',
  'summaryByTiendaTicket'
];

const MUTATION_PREFIXES = [
  'add', 'update', 'delete', 'remove', 'import', 'load', 'sync', 'changeSelectedEvent',
  'setCurrent', 'setEvent', 'toggleEvent', 'doLogin', 'doLogout'
];

const MUTATION_EXACT = new Set([
  'render', 'saveState', 'pushStateToServer', 'fetchAccessUsers', 'setImportStatus',
  'exportExcel', 'exportSeedWorkbook'
]);

const state = {
  version: VERSION,
  installed: false,
  enabled: true,
  revision: 1,
  cache: new Map(),
  originals: new Map(),
  mutations: new Map(),
  stats: new Map(),
  invalidations: [],
  installedAt: null
};

function now(){ return (performance?.now?.() || Date.now()); }
function iso(){ try{return new Date().toISOString();}catch(_){return '';} }
function round(n, d=1){ const m = Math.pow(10,d); return Math.round(Number(n||0)*m)/m; }
function getApp(){ return window.ControlEventApp || null; }
function getState(){ return getApp()?.state || window.state || null; }
function arrLen(st, name){ const v = st?.[name]; return Array.isArray(v) ? v.length : 0; }
function selectedId(st){ return String(st?.selectedEventId || getApp()?.navigation?.selectedEventId || ''); }
function baseKey(name){
  const st = getState() || {};
  return [
    name,
    state.revision,
    selectedId(st),
    arrLen(st,'eventos'),
    arrLen(st,'personas'),
    arrLen(st,'tiendas'),
    arrLen(st,'productos'),
    arrLen(st,'colaboradores'),
    arrLen(st,'compras')
  ].join('|');
}
function isFn(name){ return typeof window[name] === 'function'; }
function record(name, kind, ms=0){
  const item = state.stats.get(name) || {name, calls:0, hits:0, misses:0, clears:0, totalMs:0, maxMs:0};
  if(kind === 'hit') item.hits += 1;
  if(kind === 'miss') item.misses += 1;
  if(kind === 'clear') item.clears += 1;
  if(kind === 'call') item.calls += 1;
  item.totalMs += Number(ms||0);
  item.maxMs = Math.max(item.maxMs, Number(ms||0));
  item.avgMs = item.calls ? item.totalMs / item.calls : 0;
  state.stats.set(name, item);
}
function clear(reason='manual'){
  const size = state.cache.size;
  state.cache.clear();
  state.revision += 1;
  state.invalidations.push({at: iso(), reason, size, revision: state.revision});
  if(state.invalidations.length > 40) state.invalidations.shift();
  for(const name of CACHEABLE) record(name, 'clear');
  return {ok:true, reason, size, revision: state.revision};
}
function shouldCacheResult(value){
  return value !== undefined;
}
function wrapCached(name){
  if(!isFn(name) || state.originals.has(name)) return false;
  const original = window[name];
  if(original.__ceHotpathWrapped) return false;
  const wrapped = function ControlEventHotpathCached(...args){
    if(!state.enabled || args.length){
      const t = now();
      try{return original.apply(this,args);} finally{record(name,'call',now()-t);}
    }
    const key = baseKey(name);
    if(state.cache.has(key)){
      record(name,'hit');
      return state.cache.get(key);
    }
    const t = now();
    const result = original.apply(this,args);
    const elapsed = now() - t;
    record(name,'call', elapsed);
    record(name,'miss');
    if(shouldCacheResult(result)) state.cache.set(key, result);
    return result;
  };
  try{ Object.defineProperty(wrapped, 'name', {value: original.name || name, configurable:true}); }catch(_){ }
  Object.defineProperty(wrapped, '__ceHotpathWrapped', {value:true});
  state.originals.set(name, original);
  window[name] = wrapped;
  return true;
}
function shouldWrapMutation(name){
  if(!isFn(name) || state.originals.has(name) || state.mutations.has(name)) return false;
  if(MUTATION_EXACT.has(name)) return false;
  return MUTATION_PREFIXES.some(prefix => name === prefix || name.startsWith(prefix));
}
function wrapMutation(name){
  if(!shouldWrapMutation(name)) return false;
  const original = window[name];
  if(original.__ceHotpathMutationWrapped) return false;
  const wrapped = function ControlEventHotpathMutation(...args){
    clear(`before:${name}`);
    try{
      return original.apply(this,args);
    }finally{
      setTimeout(() => clear(`after:${name}`), 0);
    }
  };
  try{ Object.defineProperty(wrapped, 'name', {value: original.name || name, configurable:true}); }catch(_){ }
  Object.defineProperty(wrapped, '__ceHotpathMutationWrapped', {value:true});
  state.mutations.set(name, original);
  window[name] = wrapped;
  return true;
}
function installEventInvalidators(){
  if(installEventInvalidators.done) return;
  installEventInvalidators.done = true;
  const clearFromEvent = event => {
    const target = event?.target;
    const id = target?.id || '';
    const type = event?.type || 'event';
    if(type === 'input'){
      if(!/collab|purchase|don|persona|evento|tienda|producto|Importe|Precio|Numero|Unidades|Ticket|selectedEvent/i.test(id)) return;
      clear(`input:${id||target?.tagName||''}`);
      return;
    }
    if(type === 'change'){
      clear(`change:${id||target?.tagName||''}`);
      return;
    }
    if(type === 'click'){
      const button = target?.closest?.('button,[role="button"],.tab,.mobile-menu-action');
      if(button) clear(`click:${button.id || button.title || button.textContent?.trim()?.slice(0,24) || 'button'}`);
    }
  };
  document.addEventListener('change', clearFromEvent, true);
  document.addEventListener('input', clearFromEvent, true);
  document.addEventListener('click', clearFromEvent, true);
  window.addEventListener('controlevent:runtime-ready', () => clear('runtime-ready'));
  window.addEventListener('controlevent:debug-ready', () => clear('debug-ready'));
}
function install(options = {}){
  if(state.installed) return api;
  state.enabled = options.enabled !== false;
  state.installed = true;
  state.installedAt = iso();
  const cached = CACHEABLE.filter(wrapCached);
  const mutationCandidates = Object.getOwnPropertyNames(window).filter(name => {
    try{return shouldWrapMutation(name);}catch(_){return false;}
  });
  const mutations = mutationCandidates.filter(wrapMutation);
  installEventInvalidators();
  console.info(`[ControlEventHotpath/${VERSION}] Optimizador instalado. Cacheados: ${cached.length}. Invalidadores: ${mutations.length}.`);
  return api;
}
function rows(){
  return [...state.stats.values()]
    .sort((a,b) => (b.hits-b.misses) - (a.hits-a.misses) || b.totalMs-a.totalMs)
    .map(item => ({
      name: item.name,
      calls: item.calls,
      hits: item.hits,
      misses: item.misses,
      hitRate: item.hits + item.misses ? `${round((item.hits/(item.hits+item.misses))*100,1)}%` : '',
      totalMs: round(item.totalMs,1),
      avgMs: round(item.avgMs,2),
      maxMs: round(item.maxMs,1),
      clears: item.clears
    }));
}
function inspect(){
  return {
    version: VERSION,
    installed: state.installed,
    enabled: state.enabled,
    revision: state.revision,
    cacheSize: state.cache.size,
    cachedFunctions: [...state.originals.keys()].sort(),
    invalidators: [...state.mutations.keys()].sort(),
    rows: rows(),
    invalidations: state.invalidations.slice(-15),
    commands: [
      'ControlEventHotpath.print()',
      'ControlEventHotpath.clear()',
      'ControlEventHotpath.disable()',
      'ControlEventHotpath.enable()'
    ]
  };
}
function print(){
  const report = inspect();
  console.group(`[ControlEventHotpath/${VERSION}] Cache de rutas calientes legacy`);
  console.info('Estado', {enabled: report.enabled, cacheSize: report.cacheSize, revision: report.revision, cachedFunctions: report.cachedFunctions.length});
  console.table(report.rows);
  if(report.invalidations.length) console.info('Últimas invalidaciones', report.invalidations);
  console.groupEnd();
  return report;
}
function enable(){ state.enabled = true; clear('enable'); return inspect(); }
function disable(){ state.enabled = false; clear('disable'); return inspect(); }

const api = {version: VERSION, install, clear, enable, disable, inspect, print, rows};
export function installLegacyHotpathOptimizer(options = {}){
  window.ControlEventHotpath = api;
  return install(options);
}
