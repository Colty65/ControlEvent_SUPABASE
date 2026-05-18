import { downloadInfoEvento, registerExcelModule } from './_excel-runtime.js';
import { captureResumenSnapshot } from './resumen-sheet.js';

export const meta = {
  name: 'infoevento',
  version: 'v27.4.1',
  mode: 'modular-public-facade-with-resumen-graficas-infoevento-audit',
  description: 'Controlador modular para INFOEVENTO. Captura los modelos RESUMEN/GRAFICAS y, desde v27.4.1, el motor legacy añade hojas RESUMEN_MODULAR y GRAFICAS_MODULAR de auditoría al workbook para comparar sin sustituir aún las hojas legacy.'
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
