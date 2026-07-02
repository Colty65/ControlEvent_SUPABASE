import { installExcelRuntime } from './_excel-runtime.js';
import './infoevento.js';
import './backup.js';
import './resumen-sheet.js';
import './graficas-sheet.js';
import './ticket-images-sheet.js';

export function installExcelModules(){
  return installExcelRuntime();
}

if(typeof window !== 'undefined'){
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', installExcelModules, {once:true});
  }else{
    installExcelModules();
  }
}
