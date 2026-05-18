import { downloadBackup, registerExcelModule } from './_excel-runtime.js';

export const meta = {
  name: 'backup',
  version: 'v27.0',
  mode: 'modular-public-facade',
  description: 'Controlador modular para descarga de datos/backup. La llamada pública exportSeedWorkbook ya pasa por este módulo; el motor legacy queda encapsulado.'
};

export function run(options = {}){
  return downloadBackup(options);
}

registerExcelModule('exportSeedWorkbook', {meta, run});
registerExcelModule('backup', {meta, run});
