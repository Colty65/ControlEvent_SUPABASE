/* ControlEvent v28.7 - Proxy ligero para mantenimiento diferido.
   Evita ReferenceError si se consulta ControlEventMaintenance antes de abrir Mantenimiento. */
import { VERSION } from '../../app/version.js';

let loadingPromise = null;
let lastError = null;
const installedAt = Date.now();

function realApi(){
  const api = window.ControlEventMaintenance;
  return api && api.__ceMaintenanceReal === true ? api : null;
}

function currentTab(){
  return window.ControlEventApp?.navigation?.currentMaintTab || 'personas';
}

function proxyInfo(){
  const real = realApi();
  if(real && typeof real.info === 'function'){
    return {proxy:false, real:true, version: real.version || VERSION, state: real.info()};
  }
  return {
    proxy:true,
    real:false,
    version:'v28.7',
    appVersion: VERSION,
    mode:'maintenance-lazy-proxy',
    installedAt,
    current: currentTab(),
    rootExists: !!document.getElementById('maintenanceWrapper'),
    rootHidden: document.getElementById('maintenanceWrapper')?.classList?.contains('hidden') ?? null,
    loadedScreens: window.ControlEventModules?.diagnostics?.().loaded || [],
    lastError,
    note:'Mantenimiento aún no está cargado. Abre Mantenimiento o ejecuta await ControlEventMaintenance.ensure().'
  };
}

async function ensure(options = {}){
  const real = realApi();
  if(real) return real;
  if(!loadingPromise){
    loadingPromise = import('./index.js').then(module => {
      const api = module.installMaintenanceModules();
      if(api) api.__ceMaintenanceReal = true;
      if(options.schedule !== false && typeof api?.scheduleCurrent === 'function'){
        api.scheduleCurrent({reason: options.reason || 'maintenance-lazy-proxy-ensure', delay: options.delay ?? 60});
      }
      return api;
    }).catch(error => {
      lastError = error?.message || String(error);
      loadingPromise = null;
      console.warn('[ControlEventMaintenance/v28.7] No se pudo cargar mantenimiento bajo demanda', error);
      throw error;
    });
  }
  return loadingPromise;
}

export function installMaintenanceLazyProxy(){
  const current = window.ControlEventMaintenance;
  if(current && current.__ceMaintenanceReal === true) return current;
  if(current && current.__ceMaintenanceLazyProxy === true) return current;

  const api = {
    version:'v28.7',
    appVersion: VERSION,
    __ceMaintenanceLazyProxy:true,
    mode:'maintenance-lazy-proxy',
    lazyMode:'maintenance-load-on-first-use',
    ensure,
    load: ensure,
    info: proxyInfo,
    inspect: proxyInfo,
    print(){
      const report = proxyInfo();
      console.group('[ControlEventMaintenance/v28.7] Proxy ligero de mantenimiento');
      console.info(report);
      console.info('Para cargar el módulo real: await ControlEventMaintenance.ensure()');
      console.groupEnd();
      return report;
    },
    async loadAndPrint(){
      const real = await ensure();
      return typeof real?.print === 'function' ? real.print() : (real?.info?.() || real);
    },
    async activate(name, options = {}){
      const real = await ensure({schedule:false});
      return real.activate(name, options);
    },
    async refreshCurrent(options = {}){
      const real = await ensure({schedule:false});
      return real.refreshCurrent(options);
    },
    async scheduleCurrent(options = {}){
      const real = await ensure({schedule:false});
      return real.scheduleCurrent(options);
    },
    async refreshAll(options = {}){
      const real = await ensure({schedule:false});
      return real.refreshAll(options);
    }
  };
  window.ControlEventMaintenance = api;
  window.__ceV2821MaintenanceProxy = api;
  return api;
}
