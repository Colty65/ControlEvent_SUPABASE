import { VERSION } from '../version.js';

const STORAGE_KEY = 'controlevent:debug';
const SESSION_KEY = 'controlevent:debug:session';
let loadingPromise = null;
let loadedRuntime = null;

function safeStorage(kind = 'localStorage'){
  try{
    const store = window?.[kind];
    const probe = `__ce_debug_probe_${Date.now()}`;
    store?.setItem?.(probe, '1');
    store?.removeItem?.(probe);
    return store || null;
  }catch(_error){
    return null;
  }
}

function parseUrlDebugFlag(){
  try{
    const params = new URLSearchParams(window.location.search || '');
    const raw = params.get('ceDebug') ?? params.get('debug') ?? params.get('diagnostics');
    if(raw === null) return null;
    if(/^(1|true|yes|si|sí|on|debug)$/i.test(String(raw))) return true;
    if(/^(0|false|no|off)$/i.test(String(raw))) return false;
    return null;
  }catch(_error){
    return null;
  }
}

function readStoredEnabled(){
  const session = safeStorage('sessionStorage');
  const local = safeStorage('localStorage');
  const sessionValue = session?.getItem?.(SESSION_KEY);
  if(sessionValue === '1') return true;
  if(sessionValue === '0') return false;
  const localValue = local?.getItem?.(STORAGE_KEY);
  if(localValue === '1') return true;
  if(localValue === '0') return false;
  return false;
}

function writeStoredEnabled(value, {sessionOnly = false} = {}){
  const session = safeStorage('sessionStorage');
  const local = safeStorage('localStorage');
  if(sessionOnly){
    session?.setItem?.(SESSION_KEY, value ? '1' : '0');
    return;
  }
  local?.setItem?.(STORAGE_KEY, value ? '1' : '0');
  session?.removeItem?.(SESSION_KEY);
}

function syncUrlFlag(){
  const flag = parseUrlDebugFlag();
  if(flag === null) return readStoredEnabled();
  writeStoredEnabled(flag, {sessionOnly: true});
  return flag;
}

function installDisabledDiagnosticsStub(debugApi){
  if(window.ControlEventDiagnostics && !window.ControlEventDiagnostics.disabled) return;
  window.ControlEventDiagnostics = {
    version: VERSION,
    disabled: true,
    mode: 'debug-disabled',
    enable: () => debugApi.enable(),
    inspect: () => ({
      version: VERSION,
      disabled: true,
      message: 'Diagnósticos desactivados para aligerar la carga móvil. Ejecuta ControlEventDebug.enable() para cargarlos.'
    }),
    print: () => console.info('[ControlEventDiagnostics] Desactivado. Ejecuta ControlEventDebug.enable() para cargar diagnósticos.'),
    assertHealthy: () => true,
    checkApi: async () => ({disabled:true, ok:null})
  };
}

async function loadDiagnosticsModules(baseContext){
  if(loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const [
      runtimeDiagnostics,
      legacyMapModule,
      legacyCleanupModule,
      dataIntegrityModule,
      formsModule,
      maintenanceDiagnosticsModule,
      mobilePerformanceModule
    ] = await Promise.all([
      import('../diagnostics/runtime-diagnostics.js'),
      import('../diagnostics/legacy-map.js'),
      import('../diagnostics/legacy-cleanup.js'),
      import('../diagnostics/data-integrity.js'),
      import('../../modules/forms/index.js'),
      import('../diagnostics/maintenance-diagnostics.js'),
      import('../diagnostics/mobile-performance.js')
    ]);

    const legacyMap = legacyMapModule.installLegacyMap();
    const legacyCleanup = legacyCleanupModule.installLegacyCleanup();
    const dataIntegrity = dataIntegrityModule.installDataIntegrity();
    const forms = formsModule.installFormModules();
    const maintenanceDiagnostics = maintenanceDiagnosticsModule.installMaintenanceDiagnostics();
    const mobilePerformance = mobilePerformanceModule.installMobilePerformanceDiagnostics();
    const diagnostics = runtimeDiagnostics.installRuntimeDiagnostics({
      app: baseContext.app,
      domain: baseContext.domain,
      excel: baseContext.excel,
      tickets: baseContext.tickets,
      legacyMap,
      legacyCleanup,
      dataIntegrity,
      forms,
      maintenanceDiagnostics,
      mobilePerformance,
      debugMode: window.ControlEventDebug || null
    });

    loadedRuntime = {
      version: VERSION,
      mode: 'debug-enabled',
      diagnostics,
      legacyMap,
      legacyCleanup,
      dataIntegrity,
      forms,
      maintenanceDiagnostics,
      mobilePerformance
    };

    Object.assign(window.ControlEventRuntime || {}, loadedRuntime);
    window.dispatchEvent(new CustomEvent('controlevent:debug-ready', {detail: loadedRuntime}));
    console.info(`[ControlEventDebug/${VERSION}] Diagnósticos cargados bajo demanda.`);
    return loadedRuntime;
  })().catch(error => {
    loadingPromise = null;
    console.error(`[ControlEventDebug/${VERSION}] No se pudieron cargar los diagnósticos.`, error);
    throw error;
  });
  return loadingPromise;
}

export function installDebugMode(baseContext = {}){
  const enabled = syncUrlFlag();
  const debugApi = {
    version: VERSION,
    storageKey: STORAGE_KEY,
    sessionKey: SESSION_KEY,
    mode: enabled ? 'debug-enabled' : 'debug-disabled',
    isEnabled: () => readStoredEnabled(),
    status: () => ({
      version: VERSION,
      enabled: readStoredEnabled(),
      loaded: !!loadedRuntime,
      loading: !!loadingPromise && !loadedRuntime,
      urlHint: '?debug=1 o ?ceDebug=1',
      commands: ['ControlEventDebug.enable()', 'ControlEventDebug.disable()', 'ControlEventDebug.loadDiagnostics()', 'ControlEventDebug.status()']
    }),
    enable: async ({reload = false, sessionOnly = false} = {}) => {
      writeStoredEnabled(true, {sessionOnly});
      debugApi.mode = 'debug-enabled';
      if(reload){
        window.location.reload();
        return {ok:true, reload:true};
      }
      return debugApi.loadDiagnostics();
    },
    disable: ({reload = true} = {}) => {
      writeStoredEnabled(false);
      safeStorage('sessionStorage')?.setItem?.(SESSION_KEY, '0');
      if(reload) window.location.reload();
      return {ok:true, disabled:true, reload};
    },
    loadDiagnostics: () => loadDiagnosticsModules(baseContext),
    print: () => {
      const status = debugApi.status();
      console.group(`[ControlEventDebug/${VERSION}] Modo producción/debug`);
      console.table(status);
      if(!status.enabled){
        console.info('Modo producción activo: diagnósticos no cargados para aligerar móvil.');
        console.info('Activa diagnóstico temporal con: ControlEventDebug.enable()');
      }
      console.groupEnd();
      return status;
    }
  };

  window.ControlEventDebug = debugApi;
  installDisabledDiagnosticsStub(debugApi);

  if(enabled){
    setTimeout(() => debugApi.loadDiagnostics().catch(() => undefined), 0);
  }
  return debugApi;
}
