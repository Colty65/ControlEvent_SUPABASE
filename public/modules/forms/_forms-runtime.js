// ControlEvent v27.6.1 - Runtime no intrusivo para formularios principales.
// No sustituye acciones legacy: sólo lee formularios, valida y diagnostica.
// v27.6.1: diagnóstico menos ruidoso y alineado con IDs reales de la UI.

export const FORMS_VERSION = 'v27.6.1';

export function getApp(){
  return window.ControlEventApp || window.ControlEventRuntime?.app || window;
}

export function getState(){
  return getApp()?.state || window.state || {};
}

export function byId(id){
  return id ? document.getElementById(id) : null;
}

export function valueOf(id){
  const el = byId(id);
  if(!el) return '';
  return typeof el.value === 'string' ? el.value : '';
}

export function textOfSelected(id){
  const el = byId(id);
  if(!el || !el.options) return '';
  return el.options[el.selectedIndex]?.textContent?.trim?.() || '';
}

export function currentEventId(){
  const app = getApp();
  const candidates = [];
  try{ candidates.push(app?.selectors?.selectedId?.()); }catch(_){ }
  try{ candidates.push(app?.selectors?.currentEventId?.()); }catch(_){ }
  try{ candidates.push(window.selectedId?.()); }catch(_){ }
  try{ candidates.push(window.selectedEvent?.()?.id); }catch(_){ }
  candidates.push(getState()?.selectedEventId);
  candidates.push(valueOf('selectedEvent'));
  candidates.push(valueOf('eventSelect'));
  const found = candidates.find(v => String(v || '').trim());
  return String(found || '');
}

export function parseEuro(value){
  if(typeof window.parseEuroInput === 'function'){
    try{ return window.parseEuroInput(value); }catch(_){ }
  }
  if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? '')
    .replace(/\s/g, '')
    .replace(/€/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function toNumber(value, fallback = 0){
  if(typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const n = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

export function optionExists(selectId, value){
  const el = byId(selectId);
  if(!el || !el.options) return false;
  return Array.from(el.options).some(opt => opt.value === value);
}

export function requiredActionInfo(name){
  const fn = window[name] || getApp()?.actions?.[name];
  return {name, exists: typeof fn === 'function'};
}

export function requiredActions(names = []){
  return names.map(requiredActionInfo);
}

export function buttonInfo(id){
  const el = byId(id);
  return {
    id,
    exists: !!el,
    disabled: !!el?.disabled,
    hidden: !!el?.classList?.contains('hidden'),
    locked: !!el?.closest?.('.locked'),
    text: el?.textContent?.trim?.() || ''
  };
}

export function formFieldInfo(ids = []){
  return ids.map(id => {
    const el = byId(id);
    return {
      id,
      exists: !!el,
      disabled: !!el?.disabled,
      readonly: !!el?.readOnly,
      value: el?.value ?? '',
      selectedText: el?.tagName === 'SELECT' ? textOfSelected(id) : undefined
    };
  });
}

export function detectProblems(report){
  const problems = [];
  const structuralProblems = [];
  const dataWarnings = [];
  if(!report) return problems;
  if(!report.eventId) dataWarnings.push('No hay evento seleccionado.');
  (report.requiredActions || []).forEach(item => {
    if(!item.exists) structuralProblems.push(`No existe la acción legacy ${item.name}.`);
  });
  (report.requiredButtons || []).forEach(item => {
    if(!item.exists) structuralProblems.push(`No existe el botón ${item.id}.`);
  });
  (report.requiredFields || []).forEach(item => {
    if(!item.exists) structuralProblems.push(`No existe el campo ${item.id}.`);
  });
  problems.push(...structuralProblems, ...dataWarnings);
  report.structuralProblems = structuralProblems;
  report.dataWarnings = dataWarnings;
  return problems;
}

export function addDataWarning(report, message){
  if(!report.dataWarnings) report.dataWarnings = [];
  if(!report.problems) report.problems = [];
  report.dataWarnings.push(message);
  report.problems.push(message);
}

export function printReport(title, report){
  const structuralProblems = report?.structuralProblems || [];
  const dataWarnings = report?.dataWarnings || [];
  if(structuralProblems.length){
    console.warn(`[ControlEventForms/${FORMS_VERSION}] ${title}: problemas estructurales`, structuralProblems, report);
  }else if(dataWarnings.length){
    console.info(`[ControlEventForms/${FORMS_VERSION}] ${title}: diagnóstico OK; formulario vacío o sin selección`, dataWarnings, report);
  }else{
    console.info(`[ControlEventForms/${FORMS_VERSION}] ${title}: OK`, report);
  }
  if(report?.fields){
    try{ console.table(report.fields); }catch(_){ }
  }
  return report;
}
