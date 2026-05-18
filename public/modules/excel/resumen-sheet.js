import { registerExcelModule } from './_excel-runtime.js';

export const meta = {
  name: 'resumen-sheet',
  version: 'v27.0',
  mode: 'sheet-boundary',
  description: 'Frontera modular documentada para separar la hoja RESUMEN en una fase posterior.'
};

export function describe(){
  return meta;
}

registerExcelModule('resumen-sheet', {meta, describe});
