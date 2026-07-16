/* ControlEvent v3.0_prod - MobileLite: render visible-only conservador.
   Objetivo: mejorar iPad/Android sin volver al ActiveRender de v28.6.
   No cambia datos, INFOEVENTO, BACKUP ni carga inicial: sólo evita repintar pantallas ocultas. */
import { VERSION } from '../version.js';

const RENDER_TARGETS = {
  renderIngresosSummary: 'tabIngresos',
  renderColabs: 'tabIngresos',
  renderCompras: 'tabCompras',
  renderDonaciones: 'tabDonaciones',
  renderMaintenance: 'maintenanceWrapper'
};

const state = {
  version: VERSION,
  installed: false,
  enabled: true,
  originals: new Map(),
  skipped: new Map(),
  executed: new Map(),
  last: null,
  installedAt: null
};

function iso(){ try{return new Date().toISOString();}catch(_){return String(Date.now());} }
function app(){ return window.ControlEventApp || null; }
function currentTab(){
  try{return String(app()?.navigation?.currentMainTab || 'ingresos');}
  catch(_){return 'ingresos';}
}
function byId(id){ return id ? document.getElementById(id) : null; }
function isHiddenByClass(el){
  if(!el) return true;
  let node = el;
  while(node && node !== document.documentElement){
    if(node.classList?.contains('hidden')) return true;
    node = node.parentElement;
  }
  return false;
}
function isVisible(id){
  const el = byId(id);
  return !!el && !isHiddenByClass(el);
}
function inc(map, name){ map.set(name, Number(map.get(name) || 0) + 1); }
function mark(kind, name, detail = {}){
  state.last = {at: iso(), kind, name, tab: currentTab(), ...detail};
}
function original(name){ return state.originals.get(name) || window[name]; }
function runOriginal(name, thisArg, args){
  const fn = original(name);
  if(typeof fn !== 'function') return undefined;
  inc(state.executed, name);
  mark('run', name);
  return fn.apply(thisArg || window, args || []);
}
function skip(name, reason){
  inc(state.skipped, name);
  mark('skip', name, {reason});
  return undefined;
}
function shouldRunTarget(rootId){
  if(!state.enabled) return true;
  return isVisible(rootId);
}
function wrapSimple(name, rootId){
  const fn = window[name];
  if(typeof fn !== 'function' || state.originals.has(name)) return false;
  const wrapped = function ControlEventMobileLiteSimple(...args){
    if(args.length) return runOriginal(name, this, args);
    if(!shouldRunTarget(rootId)) return skip(name, `${rootId}-hidden`);
    return runOriginal(name, this, args);
  };
  try{ Object.defineProperty(wrapped, 'name', {value: fn.name || name, configurable:true}); }catch(_){ }
  wrapped.__ceMobileLiteWrapped = true;
  state.originals.set(name, fn);
  window[name] = wrapped;
  return true;
}
function wrapBudget(){
  const name = 'renderBudget';
  const fn = window[name];
  if(typeof fn !== 'function' || state.originals.has(name)) return false;
  const wrapped = function ControlEventMobileLiteBudget(...args){
    if(args.length || !state.enabled) return runOriginal(name, this, args);
    const tab = currentTab();
    if(tab === 'resumen' || isVisible('tabResumen')) return runOriginal(name, this, args);
    if(tab === 'graficas' || isVisible('tabGraficas')){
      skip(name, 'resumen-hidden-graficas-visible');
      const graph = window.renderGraficas;
      return typeof graph === 'function' ? graph() : undefined;
    }
    return skip(name, 'resumen-hidden');
  };
  try{ Object.defineProperty(wrapped, 'name', {value: fn.name || name, configurable:true}); }catch(_){ }
  wrapped.__ceMobileLiteWrapped = true;
  state.originals.set(name, fn);
  window[name] = wrapped;
  return true;
}
function wrapGraficas(){
  const name = 'renderGraficas';
  const fn = window[name];
  if(typeof fn !== 'function' || state.originals.has(name)) return false;
  const wrapped = function ControlEventMobileLiteGraficas(...args){
    if(args.length || !state.enabled) return runOriginal(name, this, args);
    if(currentTab() === 'graficas' || isVisible('tabGraficas')) return runOriginal(name, this, args);
    return skip(name, 'graficas-hidden');
  };
  try{ Object.defineProperty(wrapped, 'name', {value: fn.name || name, configurable:true}); }catch(_){ }
  wrapped.__ceMobileLiteWrapped = true;
  state.originals.set(name, fn);
  window[name] = wrapped;
  return true;
}
function patchAppActions(){
  try{
    const actions = app()?.actions;
    if(!actions) return;
    [...Object.keys(RENDER_TARGETS), 'renderBudget', 'renderGraficas'].forEach(name => {
      if(typeof window[name] === 'function') actions[name] = (...args) => window[name](...args);
    });
  }catch(_){ }
}
function wrapAll(){
  const done = [];
  for(const [name, rootId] of Object.entries(RENDER_TARGETS)){
    if(wrapSimple(name, rootId)) done.push(name);
  }
  if(wrapBudget()) done.push('renderBudget');
  if(wrapGraficas()) done.push('renderGraficas');
  patchAppActions();
  return done;
}
function restore(){
  for(const [name, fn] of state.originals.entries()){
    if(typeof fn === 'function') window[name] = fn;
  }
  state.originals.clear();
  patchAppActions();
}
function install(options = {}){
  if(state.installed) return api;
  state.enabled = options.enabled !== false;
  state.installed = true;
  state.installedAt = iso();
  const wrapped = wrapAll();
  window.addEventListener('controlevent:app-ready', () => setTimeout(() => { wrapAll(); patchAppActions(); }, 0));
  window.addEventListener('controlevent:runtime-ready', () => setTimeout(() => { wrapAll(); patchAppActions(); }, 0));
  console.info(`[ControlEventMobileLite/${VERSION}] Instalado. Render visible-only: ${wrapped.join(', ') || 'pendiente'}.`);
  return api;
}
function enable(){ state.enabled = true; return inspect(); }
function disable(){ state.enabled = false; return inspect(); }
function hardDisable(){ state.enabled = false; restore(); return inspect(); }
function refreshCurrent(){
  const tab = currentTab();
  const map = {
    ingresos: ['renderIngresosSummary','renderColabs'],
    compras: ['renderCompras'],
    donaciones: ['renderDonaciones'],
    mapa: ['renderMapaProductos'],
    resumen: ['renderBudget'],
    graficas: ['renderGraficas']
  };
  return (map[tab] || map.ingresos).map(name => runOriginal(name, window, []));
}
function toObject(map){ return Array.from(map.entries()).reduce((acc,[k,v]) => { acc[k]=v; return acc; }, {}); }
function inspect(){
  return {
    version: VERSION,
    installed: state.installed,
    enabled: state.enabled,
    currentTab: currentTab(),
    wrapped: [...state.originals.keys()].sort(),
    visible: {
      ingresos: isVisible('tabIngresos'),
      compras: isVisible('tabCompras'),
      donaciones: isVisible('tabDonaciones'),
      mapa: isVisible('tabMapaProductos'),
      resumen: isVisible('tabResumen'),
      graficas: isVisible('tabGraficas'),
      mantenimiento: isVisible('maintenanceWrapper')
    },
    skipped: toObject(state.skipped),
    executed: toObject(state.executed),
    last: state.last,
    commands: [
      'ControlEventMobileLite.print()',
      'ControlEventMobileLite.disable()',
      'ControlEventMobileLite.enable()',
      'ControlEventMobileLite.hardDisable()',
      'ControlEventMobileLite.refreshCurrent()'
    ]
  };
}
function print(){
  const report = inspect();
  console.group(`[ControlEventMobileLite/${VERSION}] Render visible-only`);
  console.info('Estado', report);
  console.table({skipped: report.skipped, executed: report.executed});
  console.groupEnd();
  return report;
}

const api = {version: VERSION, install, enable, disable, hardDisable, refreshCurrent, inspect, print};
export function installMobileLiteOptimizer(options = {}){
  window.ControlEventMobileLite = api;
  return install(options);
}

if(typeof window !== 'undefined'){
  window.ControlEventMobileLite = api;
}
