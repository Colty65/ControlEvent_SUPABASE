/* ControlEvent v15_prod - Perfilador de uso legacy bajo demanda.
   No se activa solo. Sólo envuelve funciones globales cuando el usuario ejecuta
   ControlEventLegacyUsage.start(). Sirve para saber qué parte del legacy se usa
   realmente antes de borrar o diferir código. */
const VERSION = 'v30.7';
const DEFAULT_PREFIXES = [
  'render', 'save', 'add', 'update', 'delete', 'export', 'import', 'load', 'sync',
  'select', 'toggle', 'show', 'hide', 'open', 'close', 'doLogin', 'logout',
  'set', 'get', 'build', 'summary', 'budget', 'draw', 'refresh'
];
const EXCLUDED_NAMES = new Set([
  'ControlEventLegacyUsage', 'ControlEventDebug', 'ControlEventRuntime',
  'ControlEventDiagnostics', 'ControlEventMobilePerformance', 'ControlEventLegacyWeight',
  'ControlEventExcel', 'ControlEventModules', 'ControlEventDomain', 'ControlEventTickets',
  'ControlEventMaintenance', 'ControlEventScreenLazy', 'ControlEventDataIntegrity',
  'ControlEventForms', 'ControlEventMaintenanceDiagnostics', 'ControlEventLegacyMap',
  'ControlEventLegacyCleanup'
]);
const state = {
  active: false,
  startedAt: null,
  stoppedAt: null,
  wrapped: new Map(),
  counts: new Map(),
  errors: new Map(),
  marks: [],
  options: null
};

function now(){ return (performance?.now?.() || Date.now()); }
function iso(){ try{return new Date().toISOString();}catch(_){return '';} }
function isCandidateName(name, prefixes = DEFAULT_PREFIXES){
  if(!name || EXCLUDED_NAMES.has(name)) return false;
  if(name.startsWith('__') || name.startsWith('webkit') || name.startsWith('on')) return false;
  if(/^HTML|^CSS|^SVG|^IDB|^Intl|^Map$|^Set$|^Array$|^Object$|^Promise$/.test(name)) return false;
  return prefixes.some(prefix => name === prefix || name.startsWith(prefix));
}
function isWrappable(name, value){
  if(typeof value !== 'function') return false;
  if(value.__ceLegacyUsageWrapped) return false;
  const src = Function.prototype.toString.call(value);
  if(/\[native code\]/.test(src)) return false;
  return true;
}
function readWindowFunctionNames({prefixes = DEFAULT_PREFIXES, include = [], max = 350} = {}){
  const names = new Set();
  for(const name of include){
    try{ if(isWrappable(name, window[name])) names.add(name); }catch(_){ }
  }
  for(const name of Object.getOwnPropertyNames(window)){
    if(names.size >= max) break;
    if(!isCandidateName(name, prefixes)) continue;
    try{ if(isWrappable(name, window[name])) names.add(name); }catch(_){ }
  }
  return [...names].sort();
}
function recordCall(name, elapsed, errored){
  const prev = state.counts.get(name) || {name, calls:0, totalMs:0, maxMs:0, errors:0, firstAt:null, lastAt:null};
  prev.calls += 1;
  prev.totalMs += elapsed;
  prev.maxMs = Math.max(prev.maxMs, elapsed);
  prev.avgMs = prev.calls ? prev.totalMs / prev.calls : 0;
  if(errored) prev.errors += 1;
  prev.firstAt = prev.firstAt || iso();
  prev.lastAt = iso();
  state.counts.set(name, prev);
}
function wrapFunction(name){
  if(state.wrapped.has(name)) return false;
  const original = window[name];
  if(!isWrappable(name, original)) return false;
  const wrapped = function ControlEventLegacyUsageWrapped(...args){
    const start = now();
    let failed = false;
    try{
      return original.apply(this, args);
    }catch(error){
      failed = true;
      const list = state.errors.get(name) || [];
      if(list.length < 10) list.push({at: iso(), message: String(error?.message || error)});
      state.errors.set(name, list);
      throw error;
    }finally{
      recordCall(name, now() - start, failed);
    }
  };
  try{
    Object.defineProperty(wrapped, 'name', {value: original.name || name, configurable:true});
  }catch(_){ }
  Object.defineProperty(wrapped, '__ceLegacyUsageWrapped', {value:true});
  state.wrapped.set(name, original);
  window[name] = wrapped;
  return true;
}
function start(options = {}){
  if(state.active) return status();
  const names = readWindowFunctionNames(options);
  let wrapped = 0;
  for(const name of names){ if(wrapFunction(name)) wrapped += 1; }
  state.active = true;
  state.startedAt = iso();
  state.stoppedAt = null;
  state.options = {...options, candidates: names.length, wrapped};
  mark('start');
  console.info(`[ControlEventLegacyUsage/${VERSION}] Perfil iniciado. Funciones envueltas: ${wrapped}. Usa la app y luego ejecuta ControlEventLegacyUsage.print().`);
  return status();
}
function stop(){
  for(const [name, original] of state.wrapped.entries()){
    try{ if(window[name]?.__ceLegacyUsageWrapped) window[name] = original; }catch(_){ }
  }
  state.wrapped.clear();
  state.active = false;
  state.stoppedAt = iso();
  mark('stop');
  return status();
}
function reset({keepActive = true} = {}){
  state.counts.clear();
  state.errors.clear();
  state.marks = [];
  if(!keepActive) stop();
  if(state.active) mark('reset');
  return status();
}
function mark(label = 'mark'){
  const item = {label:String(label || 'mark'), at:iso(), ms:now()};
  state.marks.push(item);
  return item;
}
function rows({limit = 80, minCalls = 1} = {}){
  return [...state.counts.values()]
    .filter(item => item.calls >= minCalls)
    .sort((a,b) => b.totalMs - a.totalMs || b.calls - a.calls || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(item => ({
      name: item.name,
      calls: item.calls,
      totalMs: Math.round(item.totalMs * 10) / 10,
      avgMs: Math.round(item.avgMs * 100) / 100,
      maxMs: Math.round(item.maxMs * 10) / 10,
      errors: item.errors,
      firstAt: item.firstAt,
      lastAt: item.lastAt
    }));
}
function unusedCandidates(){
  const wrappedNames = [...state.wrapped.keys()];
  return wrappedNames.filter(name => !state.counts.has(name)).sort();
}
function inspect(){
  const usedRows = rows({limit: 500});
  return {
    version: VERSION,
    active: state.active,
    startedAt: state.startedAt,
    stoppedAt: state.stoppedAt,
    wrapped: state.wrapped.size,
    used: usedRows.length,
    unused: unusedCandidates().length,
    calls: usedRows.reduce((sum, item) => sum + item.calls, 0),
    totalMs: Math.round(usedRows.reduce((sum, item) => sum + item.totalMs, 0) * 10) / 10,
    marks: state.marks.slice(),
    top: usedRows.slice(0, 25),
    unusedCandidates: unusedCandidates().slice(0, 100),
    errors: Object.fromEntries(state.errors.entries()),
    options: state.options
  };
}
function print(options = {}){
  const report = inspect();
  console.group(`[ControlEventLegacyUsage/${VERSION}] Uso real de funciones legacy`);
  console.info('Estado', {active: report.active, wrapped: report.wrapped, used: report.used, calls: report.calls, totalMs: report.totalMs});
  if(report.marks.length) console.table(report.marks);
  console.table(rows({limit: options.limit || 40, minCalls: options.minCalls || 1}));
  if(report.unusedCandidates.length) console.info('Candidatas no usadas durante esta sesión', report.unusedCandidates.slice(0, 40));
  if(Object.keys(report.errors).length) console.warn('Errores capturados', report.errors);
  console.groupEnd();
  return report;
}
function status(){
  return {
    version: VERSION,
    active: state.active,
    startedAt: state.startedAt,
    stoppedAt: state.stoppedAt,
    wrapped: state.wrapped.size,
    used: state.counts.size,
    calls: [...state.counts.values()].reduce((sum, item) => sum + item.calls, 0),
    commands: [
      'ControlEventLegacyUsage.start()',
      "ControlEventLegacyUsage.mark('descripción')",
      'ControlEventLegacyUsage.print()',
      'ControlEventLegacyUsage.stop()'
    ]
  };
}
function scenarioInstructions(){
  return [
    '1) Ejecuta ControlEventLegacyUsage.start() en modo debug.',
    "2) Marca acciones: ControlEventLegacyUsage.mark('abrir ingresos').",
    '3) Usa la app: pestañas, mantenimiento, INFOEVENTO, BACKUP, carga de datos.',
    '4) Ejecuta ControlEventLegacyUsage.print().',
    '5) Ejecuta ControlEventLegacyUsage.stop() si quieres restaurar funciones originales.'
  ];
}

export function installLegacyUsageProfiler(){
  const api = {version: VERSION, start, stop, reset, mark, print, inspect, status, rows, unusedCandidates, scenarioInstructions};
  window.ControlEventLegacyUsage = api;
  return api;
}
