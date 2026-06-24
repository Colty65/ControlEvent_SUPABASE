import * as ingresos from './ingresos-form.js';
import * as compras from './compras-form.js';
import * as donaciones from './donaciones-form.js';
import { FORMS_VERSION } from './_forms-runtime.js';

const forms = {ingresos, compras, donaciones};

function snapshot(){
  return {
    version: FORMS_VERSION,
    mode: 'diagnostic-only',
    ingresos: ingresos.read(),
    compras: compras.read(),
    donaciones: donaciones.read()
  };
}

function validateAll(){
  return {
    version: FORMS_VERSION,
    ingresos: ingresos.validate(),
    compras: compras.validate(),
    donaciones: donaciones.validate()
  };
}

function print(){
  const report = validateAll();
  console.group(`[ControlEventForms/${FORMS_VERSION}] Diagnóstico de formularios principales`);
  ingresos.print();
  compras.print();
  donaciones.print();
  console.groupEnd();
  return report;
}

function info(){
  return {
    version: FORMS_VERSION,
    mode: 'diagnostic-only',
    installed: true,
    forms: Object.keys(forms),
    note: 'No sustituye acciones legacy; sólo diagnostica y prepara extracción futura.'
  };
}

export function installFormModules(){
  if(typeof window === 'undefined') return null;
  const api = {
    version: FORMS_VERSION,
    mode: 'diagnostic-only',
    forms,
    info,
    snapshot,
    validateAll,
    print,
    ingresos,
    compras,
    donaciones
  };
  window.ControlEventForms = api;
  window.__ceV276Forms = api;
  return api;
}

export {ingresos, compras, donaciones};
