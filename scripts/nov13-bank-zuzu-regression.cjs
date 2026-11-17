const fs=require('node:fs'),assert=require('node:assert/strict');
const bank=fs.readFileSync(new URL('../services/bank-reconciliation.service.js',`file://${__filename}`),'utf8');
const ui=fs.readFileSync(new URL('../public/app/features/v24-cuadre-banco.js',`file://${__filename}`),'utf8');
const ai=fs.readFileSync(new URL('../services/event-ai.service.js',`file://${__filename}`),'utf8');
for(const method of ['listBankIncomes','setIncomeLinks']){
 const body=bank.split(`export async function ${method}(`)[1].split('export async function ')[0];
 assert.equal((body.match(/selectPaged\(INCOME_LINKS_TABLE/g)||[]).length,1,`${method}: only event-scoped links`);
 assert.match(body,/query=>query\.eq\('event_id',event\.id\)/);
 assert.match(body,/eventPersonSnapshotRows/);
}
assert.match(bank,/manualConflicts=conflicts\.filter\(link=>!link\.automatic\)/);
assert.match(bank,/\.delete\(\)\.eq\('event_id',eventId\)\.in\('id',supersededAutoIds\)/);
assert.match(bank,/meaningfulTokens\(income\.personName\)/);
assert.match(ui,/Propuesta automática en otro movimiento/);
assert.match(ai,/contract_json:\{type:'string'\}/);
assert.match(ai,/return v6ValidateContract\(parsed\)/);
console.log('OK · 9 controles estructurales noviembre 2026');
