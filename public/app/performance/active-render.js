/* ControlEvent v2.0-pr - ActiveRender disponible pero desactivado por defecto.
   En v28.6 se comprobó que empeoraba iPad/Android. Se conserva sólo como herramienta experimental:
   ControlEventActiveRender.enable() / disable(). INFOEVENTO/BACKUP/carga de datos no se tocan. */
import { VERSION } from '../version.js';

const IMPORTANT_COMMON = [
  'renderEnvironmentBanner',
  'renderAuthUI',
  'renderHeader',
  'renderTabVisibility',
  'renderMainSelectors',
  'renderPermissions',
  'renderLockState'
];

const TAB_RENDERERS = {
  ingresos: ['renderIngresosSummary', 'renderColabs'],
  compras: ['renderBudget', 'renderCompras'],
  donaciones: ['renderDonaciones'],
  mapa: ['renderMapaProductos'],
  resumen: ['renderBudget'],
  graficas: ['renderBudget'],
};

const state = {
  version: VERSION,
  installed: false,
  enabled: false,
  originals: new Map(),
  calls: [],
  counts: {render:0, fullFallback:0, active:0, skippedGraficas:0, maintenanceDeferred:0, errors:0},
  last: null,
  installedAt: null,
  maintenanceTimer: null,
  inRender: false,
};

function now(){ return (performance?.now?.() || Date.now()); }
function iso(){ try{return new Date().toISOString();}catch(_){return '';} }
function app(){ return window.ControlEventApp || null; }
function auth(){ return !!(app()?.authUser || window.authUser); }
function currentTab(){
  try{return String(app()?.navigation?.currentMainTab || 'ingresos');}catch(_){return 'ingresos';}
}
function isFn(name){ return typeof window[name] === 'function'; }
function original(name){ return state.originals.get(name) || window[name]; }
function call(name, ...args){
  const fn = original(name);
  if(typeof fn !== 'function') return undefined;
  try{return fn.apply(window, args);}catch(error){ state.counts.errors += 1; console.warn(`[ControlEventActiveRender/${VERSION}] ${name}`, error); return undefined; }
}
function isMaintenanceVisible(){
  const root = document.getElementById('maintenanceWrapper');
  return !!root && !root.classList.contains('hidden') && root.offsetParent !== null;
}
function safeSave(){
  const fn = original('saveState');
  if(typeof fn !== 'function') return;
  try{ fn.call(window); }catch(error){ console.warn(`[ControlEventActiveRender/${VERSION}] saveState`, error); }
}
function scheduleMaintenance(reason='visible'){
  if(!isMaintenanceVisible()) return;
  state.counts.maintenanceDeferred += 1;
  if(state.maintenanceTimer) return;
  const run = () => {
    state.maintenanceTimer = null;
    if(!state.enabled || !isMaintenanceVisible()) return;
    call('renderMaintenance');
  };
  if('requestIdleCallback' in window){
    state.maintenanceTimer = requestIdleCallback(run, {timeout: 500});
  }else{
    state.maintenanceTimer = setTimeout(run, 80);
  }
}
function mark(kind, detail){
  const item = {at: iso(), kind, ...detail};
  state.last = item;
  state.calls.push(item);
  if(state.calls.length > 40) state.calls.shift();
}
function optimizedRender(...args){
  state.counts.render += 1;
  if(!state.enabled){
    state.counts.fullFallback += 1;
    return original('render')?.apply(window,args);
  }
  if(state.inRender){
    return undefined;
  }
  const start = now();
  state.inRender = true;
  try{
    call('renderEnvironmentBanner');
    call('renderAuthUI');
    if(!auth()){
      mark('auth-only', {ms: Math.round((now()-start)*10)/10});
      return undefined;
    }
    safeSave();
    IMPORTANT_COMMON.slice(2).forEach(name => call(name));
    const tab = currentTab();
    const renderers = TAB_RENDERERS[tab] || TAB_RENDERERS.ingresos;
    renderers.forEach(name => call(name));
    scheduleMaintenance(`render:${tab}`);
    state.counts.active += 1;
    mark('active-render', {tab, renderers, ms: Math.round((now()-start)*10)/10});
    return undefined;
  }finally{
    state.inRender = false;
  }
}
function guardedGraficas(...args){
  if(!state.enabled) return original('renderGraficas')?.apply(window,args);
  const tab = currentTab();
  const visible = tab === 'graficas' || document.getElementById('tabGraficas')?.offsetParent !== null;
  if(!visible){
    state.counts.skippedGraficas += 1;
    mark('skip-graficas', {tab});
    return undefined;
  }
  return original('renderGraficas')?.apply(window,args);
}
function patchAppActions(){
  try{
    const actions = app()?.actions;
    if(actions){
      actions.render = (...args) => window.render?.(...args);
      actions.renderGraficas = (...args) => window.renderGraficas?.(...args);
    }
  }catch(_){ }
}
function wrap(){
  if(isFn('render') && !state.originals.has('render')){
    state.originals.set('render', window.render);
    window.render = optimizedRender;
  }
  if(isFn('renderGraficas') && !state.originals.has('renderGraficas')){
    state.originals.set('renderGraficas', window.renderGraficas);
    window.renderGraficas = guardedGraficas;
  }
  patchAppActions();
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
  state.enabled = options.enabled === true;
  state.installed = true;
  state.installedAt = iso();
  if(state.enabled) wrap();
  window.addEventListener('controlevent:app-ready', () => { if(state.enabled) setTimeout(wrap,0); });
  window.addEventListener('controlevent:runtime-ready', () => { if(state.enabled) setTimeout(wrap,0); });
  console.info(`[ControlEventActiveRender/${VERSION}] Disponible, desactivado por defecto.`);
  return api;
}
function enable(){ state.enabled = true; wrap(); return inspect(); }
function disable(){ state.enabled = false; restore(); return inspect(); }
function inspect(){
  return {
    version: VERSION,
    installed: state.installed,
    enabled: state.enabled,
    patched: [...state.originals.keys()],
    currentTab: currentTab(),
    maintenanceVisible: isMaintenanceVisible(),
    counts: {...state.counts},
    last: state.last,
    recent: state.calls.slice(-12),
    commands: [
      'ControlEventActiveRender.print()',
      'ControlEventActiveRender.disable()',
      'ControlEventActiveRender.enable()'
    ]
  };
}
function print(){
  const report = inspect();
  console.group(`[ControlEventActiveRender/${VERSION}] ActiveRender experimental`);
  console.info('Estado', {enabled: report.enabled, currentTab: report.currentTab, patched: report.patched, counts: report.counts});
  if(report.recent.length) console.table(report.recent);
  console.groupEnd();
  return report;
}

const api = {version: VERSION, install, enable, disable, inspect, print};
export function installActiveRenderOptimizer(options){ return install(options); }

if(typeof window !== 'undefined'){
  window.ControlEventActiveRender = api;
}
