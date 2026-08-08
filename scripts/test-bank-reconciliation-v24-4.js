import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../services/bank-reconciliation.service.js',import.meta.url),'utf8');
function extractFunction(name){
  const start=source.indexOf(`function ${name}(`);
  if(start<0) throw new Error(`No se encontró ${name}`);
  const brace=source.indexOf('{',start);
  let depth=0;
  for(let i=brace;i<source.length;i+=1){
    if(source[i]==='{') depth+=1;
    else if(source[i]==='}'){
      depth-=1;
      if(depth===0) return source.slice(start,i+1);
    }
  }
  throw new Error(`Función incompleta: ${name}`);
}
const names=['text','arr','num','cents','fail','dateOnly','validIsoDate','minDate','maxDate','normalizePeriod','defaultPeriod','inPeriod','buildEventLedger'];
const context={Date,Number,String,Array,Map,Math,Error};
vm.createContext(context);
vm.runInContext(`${names.map(extractFunction).join('\n')}\nthis.bank={normalizePeriod,defaultPeriod,inPeriod,buildEventLedger};`,context);
const bank=context.bank;

const movements = [
  {id:'m1',accountId:'A',executedAt:'2026-07-01T09:00:00',amount:100,bankBalance:1100,included:true},
  {id:'m2',accountId:'A',executedAt:'2026-07-02T09:00:00',amount:-50,bankBalance:1050,included:true},
  {id:'m3',accountId:'A',executedAt:'2026-07-03T09:00:00',amount:200,bankBalance:1250,included:false},
  {id:'m4',accountId:'A',executedAt:'2026-07-04T09:00:00',amount:-70,bankBalance:1180,included:true}
];
const ledger=bank.buildEventLedger(movements);
assert.equal(ledger.summary.openingBalance,1000);
assert.equal(ledger.summary.income,100);
assert.equal(ledger.summary.expense,120);
assert.equal(ledger.summary.includedNet,-20);
assert.equal(ledger.summary.calculatedBalance,980);
assert.equal(ledger.summary.eventVariation,-20);
assert.equal(ledger.summary.actualClosingBalance,1180);
assert.deepEqual(Array.from(ledger.movements,row=>row.eventBalanceAfter),[1100,1050,1050,980]);

const debitOpening=bank.buildEventLedger([
  {id:'d1',accountId:'A',executedAt:'2026-07-01T09:00:00',amount:-125.5,bankBalance:874.5,included:true}
]);
assert.equal(debitOpening.summary.openingBalance,1000);
assert.equal(debitOpening.summary.calculatedBalance,874.5);

const event={startDate:'2026-07-05',endDate:'2026-07-10'};
const period=bank.defaultPeriod(event,[
  {executedAt:'2026-07-01T10:00:00'},
  {executedAt:'2026-07-15T10:00:00'}
],movements);
assert.deepEqual({...period},{dateFrom:'2026-07-01',dateTo:'2026-07-15'});
assert.equal(bank.inPeriod({executedAt:'2026-07-01T00:00:00'},period),true);
assert.equal(bank.inPeriod({executedAt:'2026-07-15T23:59:00'},period),true);
assert.equal(bank.inPeriod({executedAt:'2026-06-30T23:59:00'},period),false);
assert.deepEqual({...bank.normalizePeriod('2026-07-01','2026-07-31')},{dateFrom:'2026-07-01',dateTo:'2026-07-31'});
assert.throws(()=>bank.normalizePeriod('2026-08-01','2026-07-31'),/no puede ser posterior/);

console.log('OK v26_prod-04: periodo inclusivo, abonos/cargos, exclusión por evento y saldo inicial/final.');
