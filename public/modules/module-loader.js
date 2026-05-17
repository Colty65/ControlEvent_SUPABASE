import { findMenuModuleByButton, menuModules } from './menu-registry.js';

const loadedModules = new Map();

async function loadMenuModule(entry){
  if(!entry) return null;
  if(!loadedModules.has(entry.name)){
    loadedModules.set(entry.name, import(entry.module));
  }
  const module = await loadedModules.get(entry.name);
  const root = document.getElementById(entry.viewId);
  if(typeof module.mount === 'function'){
    await module.mount({
      entry,
      root,
      app: window.ControlEventApp || window,
      window
    });
  }
  window.dispatchEvent(new CustomEvent('controlevent:module-mounted', {
    detail: {name: entry.name, viewId: entry.viewId}
  }));
  return module;
}

export async function activateMenuModule(name){
  const entry = menuModules.find(item => item.name === name) || null;
  return loadMenuModule(entry);
}

export function installControlEventModules(){
  document.addEventListener('click', event => {
    const button = event.target.closest?.('button[id]');
    if(!button) return;
    const entry = findMenuModuleByButton(button.id);
    if(!entry) return;
    loadMenuModule(entry).catch(error => {
      console.error('[modules] No se pudo cargar modulo', entry.name, error);
    });
  }, true);

  window.ControlEventModules = {
    entries: menuModules,
    activate: activateMenuModule,
    loaded: loadedModules
  };
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', installControlEventModules, {once:true});
}else{
  installControlEventModules();
}
