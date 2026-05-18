import { VERSION } from './version.js';
import { getApp, whenAppReady } from './app-context.js';
import { installDomainCalculations } from './domain/index.js';
import { installExcelModules } from '../modules/excel/index.js';
import { installTicketModules } from '../modules/tickets/index.js';
import { installRuntimeDiagnostics } from './diagnostics/runtime-diagnostics.js';
import { installLegacyMap } from './diagnostics/legacy-map.js';
import { installLegacyCleanup } from './diagnostics/legacy-cleanup.js';

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
  modules.activate(tab, {reason:'app-main-initial'}).catch(error => console.warn('[v27.4.3] No se pudo activar modulo inicial', error));
}

function install(app){
  applyVersion();
  const domain = installDomainCalculations(app, {mode: 'shadow'});
  const excel = installExcelModules();
  const tickets = installTicketModules();
  const legacyMap = installLegacyMap();
  const legacyCleanup = installLegacyCleanup();
  const diagnostics = installRuntimeDiagnostics({app, domain, excel, tickets, legacyMap, legacyCleanup});
  window.ControlEventRuntime = {
    version: VERSION,
    app,
    modules: window.ControlEventModules || null,
    domain,
    excel,
    tickets,
    diagnostics,
    legacyMap,
    legacyCleanup,
    inspect: () => diagnostics.inspect(),
    checkApi: () => diagnostics.checkApi()
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
