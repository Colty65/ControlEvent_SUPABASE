import { VERSION } from './version.js';
import { getApp, whenAppReady } from './app-context.js';
import { installDomainCalculations } from './domain/index.js';
import { installExcelModules } from '../modules/excel/index.js';
import { installTicketModules } from '../modules/tickets/index.js';
import { installDebugMode } from './debug/debug-mode.js';
import { installScreenLazyRuntime } from './navigation/screen-lazy.js';
import { installMaintenanceLazyProxy } from '../modules/maintenance/lazy-proxy.js';
import { installLegacyHotpathOptimizer } from './performance/legacy-hotpath.js';
import { installActiveRenderOptimizer } from './performance/active-render.js';
import { installMobileLiteOptimizer } from './performance/mobile-lite.js';

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
  modules.activate(tab, {reason:'app-main-initial'}).catch(error => console.warn('[v29.4] No se pudo activar modulo inicial', error));
}

function install(app){
  applyVersion();
  const domain = installDomainCalculations(app, {mode: 'shadow'});
  const excel = installExcelModules();
  const tickets = installTicketModules();
  const hotpath = installLegacyHotpathOptimizer({mode:'mobile-safe'});
  const activeRender = installActiveRenderOptimizer({mode:'available-only', enabled:false});
  const mobileLite = installMobileLiteOptimizer({enabled:true});
  const debug = installDebugMode({app, domain, excel, tickets, hotpath, activeRender, mobileLite});
  const maintenanceProxy = installMaintenanceLazyProxy();
  const screenLazy = installScreenLazyRuntime({app, modules: window.ControlEventModules});
  window.ControlEventRuntime = {
    version: VERSION,
    mode: debug.isEnabled() ? 'debug-enabled' : 'production-lite',
    app,
    modules: window.ControlEventModules || null,
    domain,
    excel,
    tickets,
    debug,
    screenLazy,
    inspect: () => ({
      version: VERSION,
      mode: window.ControlEventRuntime?.mode || 'production-lite',
      appReady: !!app,
      modules: !!window.ControlEventModules,
      domain: !!domain,
      excel: !!excel,
      tickets: !!tickets,
      hotpath: hotpath?.inspect?.() || null,
      activeRender: activeRender?.inspect?.() || null,
      mobileLite: mobileLite?.inspect?.() || null,
      debug: debug.status(),
      screenLazy: screenLazy.info(),
      maintenance: maintenanceProxy?.info?.() || null
    }),
    checkApi: async () => window.ControlEventDiagnostics?.checkApi?.() || {disabled:true, ok:null}
  };
  window.dispatchEvent(new CustomEvent('controlevent:runtime-ready', {
    detail: window.ControlEventRuntime
  }));
  setTimeout(() => {
    screenLazy.activateInitial({app: getApp(), modules: window.ControlEventModules, delay: 80});
    window.ControlEventDiagnostics?.assertHealthy?.();
  }, 0);
}

whenAppReady(app => install(app || getApp()));

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', applyVersion, {once:true});
}else{
  applyVersion();
}
