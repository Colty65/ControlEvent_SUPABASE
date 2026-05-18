import { registerExcelModule } from './_excel-runtime.js';

export const meta = {
  name: 'graficas-sheet',
  version: 'v26.5',
  mode: 'sheet-boundary',
  description: 'Frontera modular documentada para separar la hoja GRAFICAS en una fase posterior.'
};

export function describe(){
  return meta;
}

registerExcelModule('graficas-sheet', {meta, describe});
