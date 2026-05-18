import { downloadInfoEvento, registerExcelModule } from './_excel-runtime.js';

export const meta = {
  name: 'infoevento',
  version: 'v27.0.2',
  mode: 'modular-public-facade',
  description: 'Controlador modular para INFOEVENTO. La llamada pública exportExcel ya pasa por este módulo; el motor de generación legacy se conserva como backend estable.'
};

export function run(options = {}){
  return downloadInfoEvento(options);
}

registerExcelModule('exportExcel', {meta, run});
registerExcelModule('infoevento', {meta, run});
