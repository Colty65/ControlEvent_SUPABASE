import { downloadBackup, registerExcelModule } from './_excel-runtime.js';

export const meta = {
  name: 'backup',
  version: 'v26.3',
  mode: 'legacy-export-controller',
  description: 'Controlador modular para descarga de datos/backup.'
};

export function run(options = {}){
  return downloadBackup(options);
}

registerExcelModule('exportSeedWorkbook', {meta, run});
registerExcelModule('backup', {meta, run});
