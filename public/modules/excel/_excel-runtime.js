import { getApp, callAction } from '../../app/app-context.js';

const registry = new Map();
let installed = false;
let lastRun = null;

export function resolveApp(){
  return getApp() || window.ControlEventApp || window;
}

export function resolveExcelAction(name){
  const app = resolveApp();
  const fromApp = app?.actions?.[name] || app?.[name];
  const fromWindow = window[name];
  return typeof fromApp === 'function' ? fromApp : (typeof fromWindow === 'function' ? fromWindow : null);
}

export function registerExcelModule(name, module){
  if(!name || !module) return module;
  registry.set(name, module);
  return module;
}

export function listExcelModules(){
  return Array.from(registry.keys());
}

export async function runExcelAction(name, options = {}){
  const startedAt = Date.now();
  const module = registry.get(name) || null;
  const action = module?.run || resolveExcelAction(name);
  if(typeof action !== 'function'){
    throw new Error(`No se ha encontrado la accion Excel ${name}.`);
  }
  window.dispatchEvent(new CustomEvent('controlevent:excel-before-run', {detail:{name, options}}));
  try{
    const result = await action(options);
    lastRun = {name, ok:true, startedAt, finishedAt:Date.now(), options};
    window.dispatchEvent(new CustomEvent('controlevent:excel-after-run', {detail:{...lastRun, result}}));
    return result;
  }catch(error){
    lastRun = {name, ok:false, startedAt, finishedAt:Date.now(), options, error};
    window.dispatchEvent(new CustomEvent('controlevent:excel-error', {detail:lastRun}));
    throw error;
  }
}

export function downloadInfoEvento(options = {}){
  const fn = resolveExcelAction('exportExcel') || (() => callAction('exportExcel'));
  if(typeof fn !== 'function') throw new Error('No se ha encontrado exportExcel.');
  return fn(options);
}

export function downloadBackup(options = {}){
  const fn = resolveExcelAction('exportSeedWorkbook') || (() => callAction('exportSeedWorkbook'));
  if(typeof fn !== 'function') throw new Error('No se ha encontrado exportSeedWorkbook.');
  return fn(options);
}

export function getInfo(){
  return {
    version: 'v26.5',
    modules: listExcelModules(),
    lastRun,
    legacy: {
      exportExcel: typeof (window.exportExcel || resolveExcelAction('exportExcel')) === 'function',
      exportSeedWorkbook: typeof (window.exportSeedWorkbook || resolveExcelAction('exportSeedWorkbook')) === 'function'
    }
  };
}

export function installExcelRuntime(){
  if(installed) return window.ControlEventExcel;
  installed = true;
  window.ControlEventExcel = {
    version: 'v26.5',
    mode: 'legacy-bridge',
    register: registerExcelModule,
    run: runExcelAction,
    info: getInfo,
    downloadInfoEvento,
    downloadBackup,
    get modules(){ return listExcelModules(); }
  };
  window.__ceV262Excel = window.ControlEventExcel;
  window.__ceV264Excel = window.ControlEventExcel;
  return window.ControlEventExcel;
}
