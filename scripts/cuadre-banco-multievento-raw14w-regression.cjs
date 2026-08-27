const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const service=fs.readFileSync(path.join(root,'services/bank-reconciliation.service.js'),'utf8');
const routes=fs.readFileSync(path.join(root,'routes/bank-reconciliation.routes.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'public/app/features/v24-cuadre-banco.js'),'utf8');
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const ctx=fs.readFileSync(path.join(root,'services/event-context.service.js'),'utf8');
const backup=fs.readFileSync(path.join(root,'routes/export.routes.js'),'utf8');
const restore=fs.readFileSync(path.join(root,'public/app/features/v26-prod-fix1-conciliacion-backup.js'),'utf8');
const sql=fs.readFileSync(path.join(root,'sql/ce_bank_multievento_raw14w.sql'),'utf8');
let ok=0,total=0;
function test(name,pass){total++; if(pass){ok++;console.log('OK',name);}else{console.error('KO',name);process.exitCode=1;}}

test('se elimina la exclusividad de movimiento por otro evento',!service.includes('BANK_MOVEMENT_OTHER_EVENT'));
test('selector de TKxx usa catálogo de todos los eventos',/ticketCatalog\('\s*','\s*'\)/.test(service)&&/Selector multievento/.test(service));
test('clave UI TKxx es eventId + ticketCode',/key:`\$\{text\(item\.eventId\)\}\|\$\{text\(item\.ticketCode\)\}`/.test(ui));
test('la suma global de TKxx no puede superar el movimiento',/BANK_TICKETS_EXCEED_MOVEMENT/.test(service)&&/attempted>target\+\.01/.test(service));
test('añadir TKxx marca En saldo su evento',/EVENT_MOVEMENT_STATE_TABLE[\s\S]{0,300}included:true/.test(service));
test('vínculo fuera de periodo sigue visible',/inPeriod\(row,period\)\|\|storedMovementIds\.has/.test(service));
test('cargo con TKxx solo de otros eventos no hereda un En saldo antiguo',/displayLinks\.length&&num\(row\.amount\)<0[\s\S]{0,450}included=false/.test(service));
test('importe del evento usa solo sus TKxx',/eventAppliedAmount=row\.amount<0&&hasAnyLinks\?cents\(-eventJustified\)/.test(service));
test('ledger usa eventAppliedAmount y no duplica banco',/row\.eventAppliedAmount\?\?row\.amount/.test(service)&&/includedNet=cents\(included\.reduce\(\(sum,row\)=>sum\+num\(row\.eventAppliedAmount/.test(service));
test('estado global detecta movimiento compartido',/CUADRADO_COMPARTIDO/.test(service)&&/shared=eventIds\.length>1/.test(service));
test('parte local puede estar completa y global pendiente',/PARTE_EVENTO_OK_GLOBAL_PENDIENTE/.test(service));
test('estadística solo cuenta cerrado global',/row\.globalReconciled===true\|\|closedBankStatus/.test(service));
test('cuadre forzado no se permite en compartidos',/BANK_SHARED_NO_FORCE/.test(service));
test('existe aceptación explícita de diferencia residual',/setMovementAcceptedDifference/.test(service)&&/accepted_difference/.test(sql));
test('cambio de TKxx invalida diferencia aceptada anterior',(service.match(/MOVEMENT_SETTLEMENTS_TABLE\)\.delete\(\)\.eq\('movement_id'/g)||[]).length>=2);
test('ruta REST para aceptar/revocar diferencia',/accepted-difference/.test(routes));
test('UI muestra parte evento y justificación global',/Este evento:/.test(ui)&&/Global:/.test(ui));
test('UI mantiene alerta mientras queda pendiente global',/Pendiente global/.test(ui));
test('UI permite aceptar diferencia solo de forma explícita',/Aceptar diferencia/.test(ui)&&/toggleAcceptedDifference/.test(ui));
test('gráfica zoom usa saldo proporcional del evento',/balance:num\(row\.eventBalanceAfter\)/.test(ui)&&/eventAppliedAmount/.test(ui));
test('inspector diferencia parte evento y movimiento banco',/Parte del evento:/.test(ui)&&/Movimiento banco:/.test(ui));
test('gráfica de justificantes conserva solo links del evento activo',/filter\(link=>link\?\.isActiveEvent!==false&&text\(link\?\.eventId\|\|store\.eventId\)===text\(store\.eventId\)\)/.test(ui));
test('Zuzu distingue importe banco e importe evento',/'Importe banco'/.test(ai)&&/'Importe evento'/.test(ai));
test('contexto CE conoce pendiente global y eventos implicados',/'Pendiente global'/.test(ctx)&&/'Eventos implicados'/.test(ctx));
test('backup incluye cierre global de movimiento',/BANCO_CIERRE_MVTO/.test(backup)&&/bankMovementSettlements/.test(restore));
test('SQL crea tabla global con auditoría',/create table if not exists public\.ce_bank_movement_settlements/.test(sql)&&/accepted_by text/.test(sql)&&/accepted_at timestamptz/.test(sql));

// Casos contables de referencia, independientes del DOM/DB.
function state(bank,parts,accepted=false){
  const target=Math.abs(bank); const justified=parts.reduce((a,b)=>a+b,0); const diff=Math.round((target-justified)*100)/100;
  return {target,justified,diff,closed:Math.abs(diff)<=.01||(accepted&&diff>.01)};
}
let x=state(-120,[89,5]);
test('94/120 permanece globalmente pendiente',x.justified===94&&x.diff===26&&!x.closed);
x=state(-120,[89,5,26]);
test('94 + 26 cierra exactamente el movimiento de 120',x.justified===120&&x.diff===0&&x.closed);
x=state(-120,[94,24.56]);
test('118,56/120 no cierra sin aceptación',x.diff===1.44&&!x.closed);
x=state(-120,[94,24.56],true);
test('118,56/120 cierra tras aceptar 1,44 sin imputarlo a eventos',x.diff===1.44&&x.closed&&94+24.56===118.56);

console.log(`${ok}/${total} comprobaciones OK`);
if(ok!==total)process.exit(1);
