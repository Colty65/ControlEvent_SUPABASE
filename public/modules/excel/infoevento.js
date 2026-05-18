import { downloadInfoEvento, registerExcelModule } from './_excel-runtime.js';

export const meta = {
  name: 'infoevento',
  version: 'v26.8',
  mode: 'legacy-export-controller',
  description: 'Controlador modular para INFOEVENTO. Mantiene la exportacion legacy final como fuente de verdad.'
};

export function run(options = {}){
  return downloadInfoEvento(options);
}

registerExcelModule('exportExcel', {meta, run});
registerExcelModule('infoevento', {meta, run});
