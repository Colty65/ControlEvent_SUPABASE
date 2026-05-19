import { VERSION } from './version.js';
import { getApp, whenAppReady } from './app-context.js';
import { installDomainCalculations } from './domain/index.js';
import { installExcelModules } from '../modules/excel/index.js';
import { installTicketModules } from '../modules/tickets/index.js';
import { installDebugMode } from './debug/debug-mode.js';

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
  modules.activate(tab, {reason:'app-main-initial'}).catch(error => console.warn('[v28.9] No se pudo activar modulo inicial', error));
}

function install(app){
  applyVersion();
  const domain = installDomainCalculations(app, {mode: 'shadow'});
  const excel = installExcelModules();
  const tickets = installTicketModules();
  const debug = installDebugMode({app, domain, excel, tickets});
  window.ControlEventRuntime = {
    version: VERSION,
    mode: debug.isEnabled() ? 'debug-enabled' : 'production-lite',
    app,
    modules: window.ControlEventModules || null,
    domain,
    excel,
    tickets,
    debug,
    inspect: () => ({
      version: VERSION,
      mode: window.ControlEventRuntime?.mode || 'production-lite',
      appReady: !!app,
      modules: !!window.ControlEventModules,
      domain: !!domain,
      excel: !!excel,
      tickets: !!tickets,
      debug: debug.status()
    }),
    checkApi: async () => window.ControlEventDiagnostics?.checkApi?.() || {disabled:true, ok:null}
  };
  window.dispatchEvent(new CustomEvent('controlevent:runtime-ready', {
    detail: window.ControlEventRuntime
  }));
  setTimeout(() => {
    activateCurrentModule(getApp());
    window.ControlEventDiagnostics?.assertHealthy?.();
  }, 0);
}

whenAppReady(app => install(app || getApp()));

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', applyVersion, {once:true});
}else{
  applyVersion();
}
