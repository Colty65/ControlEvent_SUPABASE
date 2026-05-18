import { downloadInfoEvento, registerExcelModule } from './_excel-runtime.js';
import { captureResumenSnapshot } from './resumen-sheet.js';

export const meta = {
  name: 'infoevento',
  version: 'v27.4.4',
  mode: 'modular-public-facade-with-resumen-graficas-infoevento-audit',
  description: 'Controlador modular para INFOEVENTO. Desde v27.4.4 mantiene el libro final limpio: no añade hojas RESUMEN_MODULAR/GRAFICAS_MODULAR por defecto; las herramientas modulares quedan disponibles sólo en standalone.'
};

let lastResumenSnapshot = null;

export function run(options = {}){
  lastResumenSnapshot = captureResumenSnapshot({source:'infoevento-before-legacy', excelOptions: options});
  return downloadInfoEvento(options);
}

export function getLastResumenSnapshot(){
  return lastResumenSnapshot;
}

registerExcelModule('exportExcel', {meta, run, getLastResumenSnapshot});
registerExcelModule('infoevento', {meta, run, getLastResumenSnapshot});
