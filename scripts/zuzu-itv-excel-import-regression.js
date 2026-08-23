import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseZuzuBatteryExcel } from '../services/zuzu-itv-excel.service.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const cases=[
  {file:'tests/ITV_Zuzu_Bateria_Tecnica_21.xlsx',count:21,first:'Dame el PAN comprado en todos los eventos',last:'Hazme una gráfica con esto'},
  {file:'tests/ITV_Zuzu_Bateria_Humana_33.xlsx',count:33,first:'Dime si Pocholo ha donado ya algo, que ya es hora de que se estire.',last:'Y ahora dime en lenguaje normal qué hemos estado averiguando en toda esta conversación.'}
];
let ko=0;
for(const c of cases){
  try{
    const full=path.join(root,c.file),dataBase64=fs.readFileSync(full).toString('base64');
    const r=await parseZuzuBatteryExcel({dataBase64,fileName:path.basename(full)});
    const ok=r.questions.length===c.count&&r.questions[0]?.prompt===c.first&&r.questions.at(-1)?.prompt===c.last&&r.questions.every(q=>q?.oracle?.kind==='ledger-structural');
    console.log(`${ok?'OK':'KO'} ${c.file} · ${r.questions.length} preguntas · hoja=${r.sheetName}`);
    if(!ok)ko++;
  }catch(e){ko++;console.error(`KO ${c.file} · ${e?.message||e}`);}
}
if(ko){console.error(`ITV EXCEL IMPORT: ${ko} KO`);process.exit(1);}
console.log('ITV EXCEL IMPORT: OK');
