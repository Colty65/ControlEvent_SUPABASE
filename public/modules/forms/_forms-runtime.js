// ControlEvent v27.6 - Runtime no intrusivo para formularios principales.
// No sustituye acciones legacy: sólo lee formularios, valida y diagnostica.

export const FORMS_VERSION = 'v27.6';

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
  return app?.selectors?.selectedId?.() || app?.selectors?.currentEventId?.() || window.selectedId?.() || valueOf('eventSelect') || '';
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
  if(!report) return problems;
  if(!report.eventId) problems.push('No hay evento seleccionado.');
  (report.requiredActions || []).forEach(item => {
    if(!item.exists) problems.push(`No existe la acción legacy ${item.name}.`);
  });
  (report.requiredButtons || []).forEach(item => {
    if(!item.exists) problems.push(`No existe el botón ${item.id}.`);
  });
  (report.requiredFields || []).forEach(item => {
    if(!item.exists) problems.push(`No existe el campo ${item.id}.`);
  });
  return problems;
}

export function printReport(title, report){
  const problems = report?.problems || [];
  if(problems.length){
    console.warn(`[ControlEventForms/${FORMS_VERSION}] ${title}: avisos`, problems, report);
  }else{
    console.info(`[ControlEventForms/${FORMS_VERSION}] ${title}: OK`, report);
  }
  if(report?.fields){
    try{ console.table(report.fields); }catch(_){ }
  }
  return report;
}
