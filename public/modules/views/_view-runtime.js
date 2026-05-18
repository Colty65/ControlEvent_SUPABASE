import { getApp } from '../../app/app-context.js';

const mountedViews = new Map();

export function resolveApp(context = {}){
  return context.app || getApp() || window.ControlEventApp || window;
}

export function resolveActions(context = {}){
  const app = resolveApp(context);
  return app?.actions || window;
}

export function byId(id){
  return id ? document.getElementById(id) : null;
}

export function callAction(context, name, ...args){
  const actions = resolveActions(context);
  const fn = actions?.[name] || window[name];
  if(typeof fn !== 'function') return undefined;
  return fn(...args);
}

export function callWindow(name, ...args){
  const fn = window[name];
  if(typeof fn !== 'function') return undefined;
  return fn(...args);
}

export function safeStep(label, fn){
  try{
    return fn?.();
  }catch(error){
    console.warn(`[views/v26.1] ${label}`, error);
    return undefined;
  }
}

export function setRootModule(root, name){
  if(!root || !name) return;
  root.dataset.ceModule = name;
  root.dataset.ceModuleVersion = 'v26.1';
}

export function markMounted(name, root){
  if(!name) return;
  mountedViews.set(name, {root, mountedAt: Date.now(), activations: 0});
}

export function markActivated(name){
  const current = mountedViews.get(name) || {mountedAt: Date.now(), activations: 0};
  current.activations = Number(current.activations || 0) + 1;
  current.activatedAt = Date.now();
  mountedViews.set(name, current);
}

export function viewInfo(){
  return Array.from(mountedViews.entries()).reduce((acc, [name, info]) => {
    acc[name] = {...info, root: info.root?.id || null};
    return acc;
  }, {});
}

export function applyVisualPatches(){
  safeStep('__ceV251.applyZoomColors', () => window.__ceV251?.applyZoomColors?.());
  safeStep('__ceV252.apply', () => window.__ceV252?.apply?.());
  safeStep('__ceV253.apply', () => window.__ceV253?.apply?.());
}

export function renderParts(context, actionNames = []){
  actionNames.forEach(name => safeStep(name, () => callAction(context, name)));
}

export function createLegacyView({name, render = [], patches = false, beforeActivate, afterActivate} = {}){
  return {
    meta: {name, version: 'v26.1', mode: 'legacy-controller'},
    mount(context = {}){
      setRootModule(context.root, name);
      markMounted(name, context.root);
      return this.activate(context);
    },
    activate(context = {}){
      markActivated(name);
      safeStep(`${name}.beforeActivate`, () => beforeActivate?.(context));
      renderParts(context, render);
      if(patches) applyVisualPatches();
      safeStep(`${name}.afterActivate`, () => afterActivate?.(context));
    }
  };
}

if(typeof window !== 'undefined'){
  window.ControlEventViewRuntime = {
    version: 'v26.1',
    info: viewInfo,
    callAction,
    applyVisualPatches
  };
}
