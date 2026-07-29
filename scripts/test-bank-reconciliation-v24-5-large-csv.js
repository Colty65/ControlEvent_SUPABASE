import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../services/bank-reconciliation.service.js',import.meta.url),'utf8');
function extractFunction(name){
  const plain=source.indexOf(`function ${name}(`);
  const exported=source.indexOf(`export function ${name}(`);
  const start=plain>=0?plain:exported;
  if(start<0) throw new Error(`No se encontró ${name}`);
  const brace=source.indexOf('{',start);
  let depth=0;
  for(let i=brace;i<source.length;i+=1){
    if(source[i]==='{') depth+=1;
    else if(source[i]==='}'){
      depth-=1;
      if(depth===0) return source.slice(start,i+1).replace(/^export\s+/,'');
    }
  }
  throw new Error(`Función incompleta: ${name}`);
}
const names=['text','num','cents','normalizeSpace','fail','splitSemicolon','parseDate','hashMovement','headerKey','parseBankCsv'];
const context={crypto,Date,Number,String,Array,Map,Set,Math,Error};
vm.createContext(context);
vm.runInContext(`${names.map(extractFunction).join('\n')}\nthis.parseBankCsv=parseBankCsv;`,context);

const lines=[
  'Cuenta;ES12 3456 7890 1234 5678 9012',
  'Fecha desde;01/01/2024',
  'Fecha hasta;29/07/2026',
  'Fecha de ejecución;Fecha valor;Descripción;Importe;Saldo'
];
let balance=10000;
const count=2500;
const es=value=>value.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2});
for(let index=0;index<count;index+=1){
  const date=new Date(Date.UTC(2024,0,1));
  date.setUTCDate(date.getUTCDate()+index%940);
  const dd=String(date.getUTCDate()).padStart(2,'0');
  const mm=String(date.getUTCMonth()+1).padStart(2,'0');
  const yyyy=date.getUTCFullYear();
  const amount=index%3===0?125.75:-42.35;
  balance=Math.round((balance+amount)*100)/100;
  lines.push(`${dd}/${mm}/${yyyy} 09:30;${dd}/${mm}/${yyyy};Movimiento prueba ${index+1};${es(amount)};${es(balance)}`);
}
const parsed=context.parseBankCsv(lines.join('\n'),'movimientos-enero-2024.csv');
assert.equal(parsed.movements.length,count);
assert.equal(parsed.dateFrom,'2024-01-01');
assert.equal(parsed.dateTo,'2026-07-29');
assert.equal(parsed.accountId,'ES1234567890123456789012');
assert.equal(parsed.warnings.length,0);
assert.equal(new Set(parsed.movements.map(row=>row.sourceHash)).size,count);
console.log(`OK v24_prod-05 CSV amplio: ${count} movimientos desde enero de 2024 procesados correctamente.`);
