import { getApp } from '../../app/app-context.js';

export const maintenanceSections = [
  {name:'personas', label:'Personas', viewId:'mtPersonas', buttonIds:['mtPersonasBtn'], module:'./personas.js'},
  {name:'eventos', label:'Eventos', viewId:'mtEventos', buttonIds:['mtEventosBtn'], module:'./eventos.js'},
  {name:'tiendas', label:'Tiendas', viewId:'mtTiendas', buttonIds:['mtTiendasBtn'], module:'./tiendas.js'},
  {name:'productos', label:'Productos', viewId:'mtProductos', buttonIds:['mtProductosBtn'], module:'./productos.js'},
  {name:'acceso', label:'Accesos', viewId:'mtAcceso', buttonIds:['mtAccesoBtn'], module:'./accesos.js', godOnly:true},
  {name:'importar', label:'Importación', viewId:'mtImportar', buttonIds:['btnOpenImport','mtImportBtn'], module:'./importacion.js'}
];

const loadedSections = new Map();
const sectionState = new Map();
let installed = false;

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

export function callLegacy(name, ...args){
  const app = resolveApp();
  const fn = app?.actions?.[name] || window[name];
  if(typeof fn !== 'function') return undefined;
  try{
    return fn(...args);
  }catch(error){
    console.warn(`[maintenance/v28.8] Error en ${name}`, error);
    return undefined;
  }
}

export function safeStep(label, fn){
  try{
    return fn?.();
  }catch(error){
    console.warn(`[maintenance/v28.8] ${label}`, error);
    return undefined;
  }
}

export function setSectionRoot(root, name){
  if(!root || !name) return;
  root.dataset.ceMaintenanceModule = name;
  root.dataset.ceMaintenanceVersion = 'v28.8';
}

export function currentMaintenanceName(){
  const app = resolveApp();
  const raw = app?.navigation?.currentMaintTab || 'personas';
  return raw === 'importacion' ? 'importar' : raw;
}

export function sectionByName(name){
  const normalized = name === 'importacion' ? 'importar' : name;
  return maintenanceSections.find(section => section.name === normalized) || null;
}

export function sectionByButtonId(buttonId){
  return maintenanceSections.find(section => section.buttonIds.includes(buttonId)) || null;
}

function contextFor(section, options = {}){
  return {
    section,
    root: byId(section.viewId),
    app: resolveApp(),
    options,
    window
  };
}

async function importSection(section){
  if(!section) return null;
  if(!loadedSections.has(section.name)){
    loadedSections.set(section.name, import(section.module));
  }
  return loadedSections.get(section.name);
}

export async function activateMaintenanceSection(name = currentMaintenanceName(), options = {}){
  const section = sectionByName(name) || sectionByName(currentMaintenanceName()) || maintenanceSections[0];
  if(!section) return null;

  const module = await importSection(section);
  const context = contextFor(section, options);
  const state = sectionState.get(section.name) || {mounted:false, activations:0};

  window.dispatchEvent(new CustomEvent('controlevent:maintenance-before-activate', {
    detail: {name: section.name, viewId: section.viewId, mounted: state.mounted, options}
  }));

  if(!state.mounted && typeof module.mount === 'function'){
    await module.mount(context);
    state.mounted = true;
  }else if(typeof module.activate === 'function'){
    await module.activate(context);
  }else if(typeof module.refresh === 'function'){
    await module.refresh(context);
  }

  state.activations = Number(state.activations || 0) + 1;
  state.lastActivatedAt = Date.now();
  sectionState.set(section.name, state);

  window.dispatchEvent(new CustomEvent('controlevent:maintenance-mounted', {
    detail: {name: section.name, viewId: section.viewId, meta: module.meta || null, options}
  }));
  return module;
}

export async function refreshCurrentMaintenance(options = {}){
  return activateMaintenanceSection(currentMaintenanceName(), {reason:'refresh-current-maintenance', ...options});
}

export async function refreshAllMaintenance(options = {}){
  for(const section of maintenanceSections){
    await activateMaintenanceSection(section.name, {reason:'refresh-all-maintenance', ...options});
  }
}

export function renderMaintenanceParts(context, actionNames = []){
  actionNames.forEach(name => safeStep(name, () => callLegacy(name)));
}

export function createMaintenanceSection({name, render = [], afterActivate, beforeActivate} = {}){
  return {
    meta: {name, version:'v28.8', mode:'maintenance-legacy-controller'},
    mount(context = {}){
      setSectionRoot(context.root, name);
      return this.activate(context);
    },
    activate(context = {}){
      safeStep(`${name}.beforeActivate`, () => beforeActivate?.(context));
      renderMaintenanceParts(context, render);
      safeStep(`${name}.afterActivate`, () => afterActivate?.(context));
    },
    refresh(context = {}){
      return this.activate(context);
    }
  };
}

function maintenanceInfo(){
  return Array.from(sectionState.entries()).reduce((acc, [name, info]) => {
    const section = sectionByName(name);
    acc[name] = {...info, viewId: section?.viewId || null};
    return acc;
  }, {});
}


function scheduleIdle(fn, delay = 90){
  if(typeof window.requestIdleCallback === 'function'){
    return window.requestIdleCallback(() => fn(), {timeout: Math.max(300, delay + 220)});
  }
  return window.setTimeout(fn, delay);
}

export function scheduleCurrentMaintenance(options = {}){
  const name = options.name || currentMaintenanceName();
  const delay = Number.isFinite(Number(options.delay)) ? Number(options.delay) : 90;
  const startedAt = Date.now();
  scheduleIdle(() => {
    activateMaintenanceSection(name, {reason:'maintenance-lazy-current', ...options, scheduledAt: startedAt})
      .catch(error => console.warn('[maintenance/v28.8] No se pudo activar mantenimiento diferido', name, error));
  }, delay);
  return {ok:true, scheduled:true, name, delay, reason: options.reason || 'maintenance-lazy-current'};
}

function scheduleActivation(section, options = {}){
  if(!section) return;
  window.setTimeout(() => {
    activateMaintenanceSection(section.name, options).catch(error => {
      console.error('[maintenance/v28.8] No se pudo activar mantenimiento', section.name, error);
    });
  }, 0);
}

export function installMaintenanceModules(){
  if(installed) return window.ControlEventMaintenance;
  installed = true;

  window.addEventListener('click', event => {
    const button = event.target?.closest?.('button[id],[data-target]');
    if(!button) return;
    const buttonId = button.id || button.getAttribute('data-target');
    const section = sectionByButtonId(buttonId);
    if(!section) return;
    scheduleActivation(section, {reason:'maintenance-click', buttonId});
  }, true);

  window.ControlEventMaintenance = {
    version:'v28.8',
    __ceMaintenanceReal: true,
    sections: maintenanceSections,
    activate: activateMaintenanceSection,
    refreshCurrent: refreshCurrentMaintenance,
    scheduleCurrent: scheduleCurrentMaintenance,
    refreshAll: refreshAllMaintenance,
    current: currentMaintenanceName,
    loaded: loadedSections,
    state: sectionState,
    lazyMode: 'maintenance-section-on-demand',
    ensure: async () => window.ControlEventMaintenance,
    load: async () => window.ControlEventMaintenance,
    loadAndPrint: async () => {
      const api = window.ControlEventMaintenance;
      return typeof api?.print === 'function' ? api.print() : (typeof api?.info === 'function' ? api.info() : api);
    },
    info: maintenanceInfo,
    inspect: maintenanceInfo,
    print(){ const report = maintenanceInfo(); console.group('[ControlEventMaintenance/v28.8] Mantenimiento diferido'); console.info(report); console.groupEnd(); return report; },
    actions: {
      addPersona: () => callLegacy('addPersona'),
      addEvento: () => callLegacy('addEvento'),
      addTienda: () => callLegacy('addTienda'),
      addProducto: () => callLegacy('addProducto'),
      saveAccessUser: (...args) => callLegacy('saveAccessUser', ...args),
      deleteAccessUser: (...args) => callLegacy('deleteAccessUser', ...args),
      importInitialWorkbook: () => callLegacy('importInitialWorkbook')
    }
  };
  window.__ceV261Maintenance = window.ControlEventMaintenance;
  window.__ceV264Maintenance = window.ControlEventMaintenance;
  return window.ControlEventMaintenance;
}
