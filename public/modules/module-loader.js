import { getApp } from '../app/app-context.js';
import { findMenuModuleByButton, menuModules } from './menu-registry.js';

const loadedModules = new Map();
const moduleState = new Map();
let installed = false;

function contextFor(entry){
  return {
    entry,
    root: document.getElementById(entry.viewId),
    app: getApp() || window.ControlEventApp || window,
    window
  };
}

async function importMenuModule(entry){
  if(!entry) return null;
  if(!loadedModules.has(entry.name)){
    loadedModules.set(entry.name, import(entry.module));
  }
  return loadedModules.get(entry.name);
}

async function loadMenuModule(entry, options = {}){
  if(!entry) return null;
  const module = await importMenuModule(entry);
  const context = contextFor(entry);
  const state = moduleState.get(entry.name) || {mounted:false, activations:0};

  window.dispatchEvent(new CustomEvent('controlevent:module-before-activate', {
    detail: {name: entry.name, viewId: entry.viewId, mounted: state.mounted}
  }));

  if(!state.mounted && typeof module.mount === 'function'){
    await module.mount(context);
    state.mounted = true;
  }else if(state.mounted && typeof module.activate === 'function'){
    await module.activate(context);
  }else if(typeof module.refresh === 'function'){
    await module.refresh(context);
  }

  state.activations = Number(state.activations || 0) + 1;
  state.lastActivatedAt = Date.now();
  moduleState.set(entry.name, state);

  window.dispatchEvent(new CustomEvent('controlevent:module-mounted', {
    detail: {name: entry.name, viewId: entry.viewId, meta: module.meta || null, options}
  }));
  return module;
}

export async function activateMenuModule(name, options = {}){
  const entry = menuModules.find(item => item.name === name) || null;
  return loadMenuModule(entry, options);
}

export async function refreshCurrentMenuModule(options = {}){
  const app = getApp() || window.ControlEventApp;
  const name = app?.navigation?.currentMainTab || 'ingresos';
  return activateMenuModule(name, {reason:'refresh-current', ...options});
}

export async function preloadAllMenuModules(options = {}){
  const results = [];
  for(const entry of menuModules){
    try{
      const module = await importMenuModule(entry);
      results.push({name: entry.name, ok:true, meta: module?.meta || null});
    }catch(error){
      results.push({name: entry.name, ok:false, error:error?.message || String(error)});
      if(!options.silent) console.warn('[modules/v28.7.6] No se pudo precargar modulo', entry.name, error);
    }
  }
  return results;
}

export async function ensureAllMenuModules(options = {}){
  const activate = options.activate === true;
  const results = [];
  for(const entry of menuModules){
    try{
      const module = activate ? await loadMenuModule(entry, {reason:'ensure-all', ...options}) : await importMenuModule(entry);
      results.push({name: entry.name, ok:true, mounted: !!moduleState.get(entry.name)?.mounted, meta: module?.meta || null});
    }catch(error){
      results.push({name: entry.name, ok:false, error:error?.message || String(error)});
    }
  }
  return results;
}

export function moduleDiagnostics(){
  return {
    version: 'v28.7.6',
    entries: menuModules.map(entry => ({name: entry.name, viewId: entry.viewId, module: entry.module, rootExists: !!document.getElementById(entry.viewId)})),
    loaded: Array.from(loadedModules.keys()),
    state: Array.from(moduleState.entries()).reduce((acc, [name, info]) => {
      acc[name] = {...info};
      return acc;
    }, {}),
    current: (getApp() || window.ControlEventApp)?.navigation?.currentMainTab || 'ingresos',
    lazyMode: 'screen-modules-on-demand',
    eagerPreload: false
  };
}

function scheduleActivation(entry, options = {}){
  if(!entry) return;
  window.setTimeout(() => {
    loadMenuModule(entry, options).catch(error => {
      console.error('[modules/v28.7.6] No se pudo cargar modulo', entry.name, error);
    });
  }, 0);
}

export function installControlEventModules(){
  if(installed) return window.ControlEventModules;
  installed = true;

  document.addEventListener('click', event => {
    const button = event.target.closest?.('button[id]');
    if(!button) return;
    const entry = findMenuModuleByButton(button.id);
    if(!entry) return;
    scheduleActivation(entry, {reason:'menu-click', buttonId: button.id});
  }, true);

  window.addEventListener('controlevent:runtime-ready', () => {
    window.dispatchEvent(new CustomEvent('controlevent:modules-ready', {
      detail: {version:'v28.7.6', lazyMode:'screen-lazy-handles-initial-activation'}
    }));
  }, {once:true});

  window.ControlEventModules = {
    version: 'v28.7.6',
    entries: menuModules,
    activate: activateMenuModule,
    refreshCurrent: refreshCurrentMenuModule,
    preloadAll: preloadAllMenuModules,
    ensureAll: ensureAllMenuModules,
    diagnostics: moduleDiagnostics,
    info: moduleDiagnostics,
    loaded: loadedModules,
    state: moduleState
  };
  window.__ceV260Modules = window.ControlEventModules;
  window.__ceV264Modules = window.ControlEventModules;
  return window.ControlEventModules;
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', installControlEventModules, {once:true});
}else{
  installControlEventModules();
}
