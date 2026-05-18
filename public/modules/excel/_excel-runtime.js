import { getApp, callAction } from '../../app/app-context.js';

const EXCEL_RUNTIME_VERSION = 'v27.4.4';
const registry = new Map();
const legacyEngines = new Map();
const publicFacadeMarkers = new Set();
const runLocks = new Map();
let installed = false;
let publicFacadeInstalled = false;
let lastRun = null;
let lastFacadeInstall = null;

const EXCELJS_SOURCES = [
  '/vendor/exceljs.min.js',
  './vendor/exceljs.min.js',
  'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',
  'https://unpkg.com/exceljs@4.4.0/dist/exceljs.min.js'
];
let excelJsLoadPromise = null;

function excelJsReady(){
  return typeof window !== 'undefined' && !!window.ExcelJS?.Workbook;
}
function loadExternalScript(src){
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve(src);
    script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(script);
  });
}

export const EXCEL_PROTECTION_PASSWORD = 'open_excel_arrastre';
export const EXCEL_PROTECTION_OPTIONS = {
  selectLockedCells:true,
  selectUnlockedCells:true,
  formatCells:false,
  formatColumns:false,
  formatRows:false,
  insertColumns:false,
  insertRows:false,
  insertHyperlinks:false,
  deleteColumns:false,
  deleteRows:false,
  sort:false,
  autoFilter:false,
  pivotTables:false
};

export async function protectWorksheet(worksheet, options = {}){
  if(!worksheet || typeof worksheet.protect !== 'function'){
    return {protected:false, reason:'worksheet-not-protectable', name:worksheet?.name || null};
  }
  try{
    worksheet.eachRow(row => row.eachCell(cell => {
      cell.protection = {...(cell.protection || {}), locked:true};
    }));
  }catch(_){ }
  const password = options.password || EXCEL_PROTECTION_PASSWORD;
  const protectionOptions = {...EXCEL_PROTECTION_OPTIONS, ...(options.protectionOptions || {})};
  await worksheet.protect(password, protectionOptions);
  return {protected:true, name:worksheet.name || null};
}

export async function protectWorkbook(workbook, options = {}){
  const worksheets = Array.isArray(workbook?.worksheets) ? workbook.worksheets : [];
  const results = [];
  for(const worksheet of worksheets){
    try{
      results.push(await protectWorksheet(worksheet, options));
    }catch(error){
      results.push({protected:false, name:worksheet?.name || null, error:error?.message || String(error)});
      if(options.throwOnError) throw error;
    }
  }
  return {protected:results.filter(item => item.protected).length, total:worksheets.length, results};
}

export async function ensureExcelJS(){
  if(excelJsReady()) return window.ExcelJS;
  if(typeof window !== 'undefined' && typeof window.ensureExcelJS === 'function'){
    try{
      await window.ensureExcelJS();
      if(excelJsReady()) return window.ExcelJS;
    }catch(error){
      console.warn(`[ControlEventExcel/${EXCEL_RUNTIME_VERSION}] ensureExcelJS legacy no pudo cargar ExcelJS; se prueban fuentes alternativas.`, error);
    }
  }
  if(excelJsLoadPromise) return excelJsLoadPromise;
  excelJsLoadPromise = (async () => {
    let lastError = null;
    for(const src of EXCELJS_SOURCES){
      try{
        await loadExternalScript(src);
        if(excelJsReady()) return window.ExcelJS;
      }catch(error){
        lastError = error;
      }
    }
    throw lastError || new Error('ExcelJS no está disponible.');
  })().finally(() => {
    if(!excelJsReady()) excelJsLoadPromise = null;
  });
  return excelJsLoadPromise;
}

export function resolveApp(){
  return getApp() || window.ControlEventApp || window;
}

function isFacadeFunction(fn, name){
  return typeof fn === 'function' && (fn.__ceExcelFacade === true || fn.__ceExcelFacadeName === name);
}

function rememberLegacyAction(name, fn){
  if(typeof fn !== 'function') return null;
  if(isFacadeFunction(fn, name)) return legacyEngines.get(name) || null;
  if(!legacyEngines.has(name)) legacyEngines.set(name, fn);
  return legacyEngines.get(name) || fn;
}

export function captureLegacyExcelActions(){
  ['exportExcel','exportSeedWorkbook'].forEach(name => {
    const app = resolveApp();
    const fromApp = app?.actions?.[name] || app?.[name];
    const fromWindow = window[name];
    rememberLegacyAction(name, fromWindow);
    rememberLegacyAction(name, fromApp);
  });
  return getLegacyActionInfo();
}

export function getLegacyAction(name){
  captureLegacyExcelActions();
  return legacyEngines.get(name) || null;
}

export function getLegacyActionInfo(){
  return Object.fromEntries(['exportExcel','exportSeedWorkbook'].map(name => {
    const fn = legacyEngines.get(name);
    return [name, {
      captured: typeof fn === 'function',
      facadePublic: isFacadeFunction(window[name], name),
      legacyName: fn?.name || null
    }];
  }));
}

export function resolveExcelAction(name, {preferLegacy = false} = {}){
  if(preferLegacy){
    const legacy = getLegacyAction(name);
    if(typeof legacy === 'function') return legacy;
  }
  const app = resolveApp();
  const fromApp = app?.actions?.[name] || app?.[name];
  const fromWindow = window[name];
  if(typeof fromWindow === 'function' && !isFacadeFunction(fromWindow, name)) return fromWindow;
  if(typeof fromApp === 'function' && !isFacadeFunction(fromApp, name)) return fromApp;
  const legacy = getLegacyAction(name);
  return typeof legacy === 'function' ? legacy : null;
}

export function registerExcelModule(name, module){
  if(!name || !module) return module;
  registry.set(name, module);
  return module;
}

export function listExcelModules(){
  return Array.from(registry.keys());
}

export async function invokeLegacyExcelAction(name, args = [], options = {}){
  const legacy = getLegacyAction(name) || resolveExcelAction(name, {preferLegacy:true});
  if(typeof legacy !== 'function'){
    const fallback = () => callAction(name, ...(Array.isArray(args) ? args : [args]));
    if(typeof fallback === 'function') return fallback();
    throw new Error(`No se ha encontrado el motor legacy Excel ${name}.`);
  }
  return legacy.apply(options.thisArg || window, Array.isArray(args) ? args : [args]);
}

export async function runExcelAction(name, options = {}){
  const startedAt = Date.now();
  const module = registry.get(name) || null;
  const action = module?.run || resolveExcelAction(name);
  if(typeof action !== 'function'){
    throw new Error(`No se ha encontrado la accion Excel ${name}.`);
  }
  if(runLocks.get(name)){
    console.warn(`[ControlEventExcel/${EXCEL_RUNTIME_VERSION}] Acción ${name} ignorada: ya hay una ejecución en curso.`);
    return runLocks.get(name);
  }
  const runPromise = (async () => {
    window.dispatchEvent(new CustomEvent('controlevent:excel-before-run', {detail:{name, options, version:EXCEL_RUNTIME_VERSION}}));
    try{
      const result = await action(options);
      lastRun = {name, ok:true, startedAt, finishedAt:Date.now(), options, controllerVersion:EXCEL_RUNTIME_VERSION};
      window.dispatchEvent(new CustomEvent('controlevent:excel-after-run', {detail:{...lastRun, result}}));
      return result;
    }catch(error){
      lastRun = {name, ok:false, startedAt, finishedAt:Date.now(), options, controllerVersion:EXCEL_RUNTIME_VERSION, error};
      window.dispatchEvent(new CustomEvent('controlevent:excel-error', {detail:lastRun}));
      throw error;
    }finally{
      runLocks.delete(name);
    }
  })();
  runLocks.set(name, runPromise);
  return runPromise;
}

export function downloadInfoEvento(options = {}){
  return invokeLegacyExcelAction('exportExcel', options.args || [], options);
}

export function downloadBackup(options = {}){
  return invokeLegacyExcelAction('exportSeedWorkbook', options.args || [], options);
}

function makeFacade(name){
  const facade = function controlEventExcelFacade(){
    return runExcelAction(name, {
      source: 'public-facade',
      args: Array.from(arguments),
      calledAt: new Date().toISOString()
    });
  };
  Object.defineProperty(facade, '__ceExcelFacade', {value:true});
  Object.defineProperty(facade, '__ceExcelFacadeName', {value:name});
  Object.defineProperty(facade, '__ceExcelFacadeVersion', {value:EXCEL_RUNTIME_VERSION});
  return facade;
}

export function installPublicExcelFacade(){
  captureLegacyExcelActions();
  ['exportExcel','exportSeedWorkbook'].forEach(name => {
    const current = window[name];
    if(!isFacadeFunction(current, name)) rememberLegacyAction(name, current);
    const facade = makeFacade(name);
    window[name] = facade;
    publicFacadeMarkers.add(name);
    try{
      // En scripts legacy clásicos el binding global suele reflejar window[name].
      // Se deja dentro de try para no romper módulos estrictos si el binding no existe.
      // eslint-disable-next-line no-eval
      window.eval(`${name} = window.${name}`);
    }catch(_){ }
  });
  publicFacadeInstalled = true;
  lastFacadeInstall = {installedAt: new Date().toISOString(), actions: Array.from(publicFacadeMarkers)};
  return lastFacadeInstall;
}

export function getInfo(){
  captureLegacyExcelActions();
  return {
    version: EXCEL_RUNTIME_VERSION,
    mode: 'modular-public-facade-resumen-graficas-infoevento-audit',
    modules: listExcelModules(),
    lastRun,
    busy: Object.fromEntries(Array.from(runLocks.keys()).map(name => [name, true])),
    publicFacadeInstalled,
    publicFacadeActions: Array.from(publicFacadeMarkers),
    lastFacadeInstall,
    legacy: getLegacyActionInfo(),
    resumenAudit: window.ControlEventResumenSheet?.auditConfig?.() || null,
    graficasAudit: window.ControlEventGraficasSheet?.auditConfig?.() || null
  };
}

export function assertReady(){
  const info = getInfo();
  const warnings = [];
  if(!info.publicFacadeInstalled) warnings.push('La fachada pública Excel v27.4.4 no está instalada.');
  if(!info.legacy.exportExcel.captured) warnings.push('No se ha capturado motor legacy exportExcel.');
  if(!info.legacy.exportSeedWorkbook.captured) warnings.push('No se ha capturado motor legacy exportSeedWorkbook.');
  if(!registry.has('exportExcel')) warnings.push('No está registrado el módulo INFOEVENTO.');
  if(!registry.has('exportSeedWorkbook')) warnings.push('No está registrado el módulo BACKUP.');
  const result = {ok: warnings.length === 0, warnings, info};
  if(warnings.length) console.warn(`[ControlEventExcel/${EXCEL_RUNTIME_VERSION}]`, warnings, info);
  return result;
}

export function installExcelRuntime(){
  if(installed) return window.ControlEventExcel;
  installed = true;
  captureLegacyExcelActions();
  window.ControlEventExcel = {
    version: EXCEL_RUNTIME_VERSION,
    mode: 'modular-public-facade-resumen-graficas-infoevento-audit',
    register: registerExcelModule,
    run: runExcelAction,
    info: getInfo,
    assertReady,
    installPublicFacade: installPublicExcelFacade,
    downloadInfoEvento,
    downloadBackup,
    enableResumenAudit: enabled => window.ControlEventResumenSheet?.enableInfoEventoAudit?.(enabled),
    resumenAuditConfig: () => window.ControlEventResumenSheet?.auditConfig?.() || null,
    enableGraficasAudit: enabled => window.ControlEventGraficasSheet?.enableInfoEventoAudit?.(enabled),
    graficasAuditConfig: () => window.ControlEventGraficasSheet?.auditConfig?.() || null,
    invokeLegacy: invokeLegacyExcelAction,
    protectWorkbook,
    protectWorksheet,
    legacyInfo: getLegacyActionInfo,
    get modules(){ return listExcelModules(); }
  };
  window.__ceV262Excel = window.ControlEventExcel;
  window.__ceV264Excel = window.ControlEventExcel;
  window.__ceV270Excel = window.ControlEventExcel;
  window.__ceV271Excel = window.ControlEventExcel;
  window.__ceV272Excel = window.ControlEventExcel;
  window.__ceV272ResumenWriter = window.ControlEventResumenSheet || null;
  installPublicExcelFacade();
  return window.ControlEventExcel;
}
