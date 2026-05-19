import { downloadInfoEvento, ensureExcelJS, registerExcelModule } from './_excel-runtime.js';
import { captureResumenSnapshot } from './resumen-sheet.js';

export const meta = {
  name: 'infoevento',
  version: 'v28.0.2',
  mode: 'modular-public-facade-exceljs-lazy',
  description: 'Controlador modular para INFOEVENTO. Desde v27.7 mantiene el libro final limpio: no añade hojas RESUMEN_MODULAR/GRAFICAS_MODULAR por defecto; las herramientas modulares quedan disponibles sólo en standalone.'
};

let lastResumenSnapshot = null;

export async function run(options = {}){
  lastResumenSnapshot = captureResumenSnapshot({source:'infoevento-before-legacy', excelOptions: options});
  await ensureExcelJS();
  return downloadInfoEvento(options);
}

export function getLastResumenSnapshot(){
  return lastResumenSnapshot;
}

registerExcelModule('exportExcel', {meta, run, getLastResumenSnapshot});
registerExcelModule('infoevento', {meta, run, getLastResumenSnapshot});
