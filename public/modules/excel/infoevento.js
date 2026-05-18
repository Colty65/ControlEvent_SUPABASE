import { downloadInfoEvento, registerExcelModule } from './_excel-runtime.js';
import { captureResumenSnapshot } from './resumen-sheet.js';

export const meta = {
  name: 'infoevento',
  version: 'v27.2.2',
  mode: 'modular-public-facade-with-resumen-writer-shadow',
  description: 'Controlador modular para INFOEVENTO. Antes de llamar al motor legacy captura el modelo modular de la hoja RESUMEN y deja preparado el escritor ExcelJS modular para sustituución progresiva.'
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
