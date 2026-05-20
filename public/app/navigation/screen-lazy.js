/* ControlEvent v29.0 - Carga diferida por pantalla sin tocar operativa estable */
import { VERSION } from '../version.js';

const SCREEN_LAZY_VERSION = 'v29.0';
const state = {
  version: SCREEN_LAZY_VERSION,
  mode: 'screen-lazy-safe',
  installedAt: null,
  initialScheduled: false,
  initialActivated: false,
  activations: [],
  events: [],
  lastError: null
};

function now(){ return Date.now(); }
function currentScreen(app){
  return app?.navigation?.currentMainTab || window.ControlEventApp?.navigation?.currentMainTab || 'ingresos';
}
function schedule(fn, delay = 60){
  if(typeof window.requestIdleCallback === 'function'){
    return window.requestIdleCallback(() => fn(), {timeout: Math.max(250, delay + 200)});
  }
  return window.setTimeout(fn, delay);
}
function getModules(modules){
  return modules || window.ControlEventModules || null;
}

async function activateScreen(name, options = {}){
  const modules = getModules(options.modules);
  if(!modules || typeof modules.activate !== 'function'){
    return {ok:false, reason:'modules-not-ready', name};
  }
  const startedAt = now();
  try{
    const result = await modules.activate(name, {reason:'screen-lazy', ...options});
    const item = {name, ok:true, startedAt, finishedAt: now(), ms: now() - startedAt, reason: options.reason || 'manual'};
    state.activations.push(item);
    return {ok:true, name, result, ...item};
  }catch(error){
    state.lastError = error?.message || String(error);
    const item = {name, ok:false, startedAt, finishedAt: now(), ms: now() - startedAt, error: state.lastError, reason: options.reason || 'manual'};
    state.activations.push(item);
    console.warn('[ControlEventScreenLazy/v29.0] No se pudo activar pantalla', name, error);
    return item;
  }
}

function activateInitial(options = {}){
  if(state.initialScheduled) return {ok:true, scheduled:true, already:true};
  state.initialScheduled = true;
  const app = options.app || window.ControlEventApp || null;
  const name = currentScreen(app);
  schedule(() => {
    activateScreen(name, {modules: options.modules, reason:'initial-after-first-paint'}).then(result => {
      state.initialActivated = !!result?.ok;
    });
  }, options.delay ?? 80);
  return {ok:true, scheduled:true, name, delay: options.delay ?? 80};
}

function installEventTracing(){
  if(window.__ceScreenLazyTracingInstalled) return;
  window.__ceScreenLazyTracingInstalled = true;
  window.addEventListener('controlevent:module-before-activate', event => {
    state.events.push({type:'before-activate', at: now(), ...(event.detail || {})});
  });
  window.addEventListener('controlevent:module-mounted', event => {
    state.events.push({type:'mounted', at: now(), ...(event.detail || {})});
  });
}

function info(){
  const modules = getModules();
  return {
    version: SCREEN_LAZY_VERSION,
    appVersion: VERSION,
    mode: state.mode,
    installedAt: state.installedAt,
    initialScheduled: state.initialScheduled,
    initialActivated: state.initialActivated,
    current: currentScreen(window.ControlEventApp),
    loadedScreens: modules?.diagnostics?.().loaded || [],
    maintenanceLazy: window.ControlEventMaintenance ? {version: window.ControlEventMaintenance.version, mode: window.ControlEventMaintenance.mode || null, lazyMode: window.ControlEventMaintenance.lazyMode || null, state: window.ControlEventMaintenance.info?.() || {}} : null,
    moduleState: modules?.diagnostics?.().state || {},
    activationCount: state.activations.length,
    activations: state.activations.slice(-12),
    lastError: state.lastError
  };
}
function print(){
  const report = info();
  console.group('[ControlEventScreenLazy/v29.0] Carga diferida por pantalla');
  console.info('Resumen', report);
  if(report.activations?.length) console.table(report.activations);
  console.groupEnd();
  return report;
}

export function installScreenLazyRuntime({app, modules} = {}){
  if(window.ControlEventScreenLazy) return window.ControlEventScreenLazy;
  state.installedAt = now();
  installEventTracing();
  const api = {
    version: SCREEN_LAZY_VERSION,
    mode: state.mode,
    activate: (name, options = {}) => activateScreen(name, {modules: modules || getModules(), ...options}),
    activateInitial: (options = {}) => activateInitial({app, modules: modules || getModules(), ...options}),
    info,
    inspect: info,
    print,
    state
  };
  window.ControlEventScreenLazy = api;
  return api;
}
