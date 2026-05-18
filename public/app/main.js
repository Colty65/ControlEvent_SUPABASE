import { VERSION } from './version.js';
import { getApp, whenAppReady } from './app-context.js';

function applyVersion(){
  document.title = VERSION;
  document.querySelectorAll('.appname span,.appname-stack span').forEach(element => {
    if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(element.textContent || '')) element.textContent = VERSION;
  });
  document.body.dataset.ceVersion = VERSION;
}

function activateCurrentModule(app){
  const modules = window.ControlEventModules;
  if(!modules || typeof modules.activate !== 'function') return;
  const tab = app?.navigation?.currentMainTab || 'ingresos';
  modules.activate(tab).catch(error => console.warn('[v25.8] No se pudo activar modulo inicial', error));
}

function install(app){
  applyVersion();
  window.ControlEventRuntime = {
    version: VERSION,
    app,
    modules: window.ControlEventModules || null
  };
  window.dispatchEvent(new CustomEvent('controlevent:runtime-ready', {
    detail: window.ControlEventRuntime
  }));
  setTimeout(() => activateCurrentModule(getApp()), 0);
}

whenAppReady(app => install(app || getApp()));

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', applyVersion, {once:true});
}else{
  applyVersion();
}

