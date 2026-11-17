const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const service=fs.readFileSync(path.resolve(__dirname,'../services/bank-reconciliation.service.js'),'utf8');
const start=service.indexOf('function buildEventLedger(movements){');
const end=service.indexOf('\nfunction eventFromDb(',start);
assert(start>=0&&end>start,'No se encuentra el motor de seguimiento del evento');
const ledger=vm.runInNewContext(`${service.slice(start,end)}; buildEventLedger`,{
  arr:value=>Array.isArray(value)?value:[],
  text:value=>String(value??''),
  cents:value=>Math.round((Number(value)||0)*100)/100,
  num:value=>Number(value)||0,
  Map
});
const movement=(id,day,amount,bankBalance,included=true,accountId='cuenta-1',eventAppliedAmount=amount)=>({id,executedAt:`${day}T10:00:00`,amount,bankBalance,included,accountId,eventAppliedAmount});

const six=[
  movement('1','2026-11-08',20,4382.64),
  movement('2','2026-11-09',20,4402.64),
  movement('3','2026-11-10',20,4422.64),
  movement('4','2026-11-11',20,4442.64),
  movement('5','2026-11-12',60,4502.64),
  movement('6','2026-11-13',60,4562.64)
];
const result=ledger([...six].reverse());
assert.equal(result.summary.openingBalance,0);
assert.equal(result.summary.bankOpeningReference,4362.64);
assert.deepEqual(Array.from(result.movements, row=>row.eventBalanceAfter),[20,40,60,80,140,200]);
assert.equal(result.summary.calculatedBalance,200);
assert.equal(result.summary.eventVariation,200);
assert.equal(result.movements[0].bankBalance,4382.64,'No se altera el saldo certificado por el banco');

const other=ledger([
  movement('a','2026-01-01',20,793.12),
  movement('b','2026-01-02',-10,783.12,false),
  movement('c','2026-01-03',-50,733.12,true,'cuenta-1',-30),
  movement('d','2026-01-04',5,105,true,'cuenta-2')
]);
assert.deepEqual(Array.from(other.movements,row=>row.eventBalanceAfter),[20,20,-10,-5]);
assert.equal(other.summary.includedNet,-5);
assert.equal(other.summary.calculatedBalance,-5);
assert.equal(other.summary.actualClosingBalance,838.12);
assert(service.includes('bankOpeningReference'),'Se conserva una referencia bancaria distinta del impacto');
const ui=fs.readFileSync(path.resolve(__dirname,'../public/app/features/v24-cuadre-banco.js'),'utf8');
assert(ui.includes('Impacto acumulado evento:'));
assert(ui.includes('Banco (saldo real):'));
console.log('OK: evento inicia en cero; 6 ingresos suman 200 €; inactivos, reparto entre eventos y multicuentas no contaminan el saldo; saldo real de cada movimiento intacto.');
