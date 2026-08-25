const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const service=fs.readFileSync(path.join(root,'services/bank-reconciliation.service.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'public/app/features/v24-cuadre-banco.js'),'utf8');
const routes=fs.readFileSync(path.join(root,'routes/bank-reconciliation.routes.js'),'utf8');
let ok=0;
function test(name,cond){if(!cond){console.error('KO',name);process.exitCode=1;}else{ok++;console.log('OK',name);}}

test('importación conserva eventId del evento en mantenimiento',/JSON\.stringify\(\{eventId:store\.eventId,filename:file\.name,csvText\}\)/.test(ui));
test('la ruta de importación bloquea evento Finalizado',/router\.post\('\/bank-reconciliation\/import'[\s\S]*?assertBankEventWritable\(eventIdFrom\(req\)\)/.test(routes));
test('el servicio vuelve a blindar Finalizado sin tocar su foto',/if\(event\.finalized\) fail\(`El evento/.test(service)&&/La importación no puede alterar su Cuadre Banco/.test(service));
test('fecha final automática nunca retrocede',/const nextDateTo=maxDate\(\[validIsoDate\(previous\?\.dateTo\),importedLatest\]\)/.test(service));
test('fecha inicial existente permanece inalterada',/const nextDateFrom=validIsoDate\(previous\?\.dateFrom\)\|\|/.test(service));
test('nuevos movimientos se marcan explícitamente fuera de saldo',/included:false,updated_by:`AUTO_IMPORT_REVISION:/.test(service));
test('al ampliar periodo también se desactivan candidatos recién visibles',/if\(!wasVisible\) newlyVisibleIds\.add/.test(service));
test('no se pisa una decisión previa del usuario',/!explicitIds\.has\(id\)/.test(service));
test('no se pisa una conciliación TKxx o ingreso ya existente',/!alreadyReconciledIds\.has\(id\)/.test(service));
test('la Fecha final se aplica con el mismo flujo que el botón Aplicar fechas',/const appliedPeriod=await setBankEventPeriod\(selectedEvent,nextPeriod\.dateFrom,nextPeriod\.dateTo,autoActor,selectedAccount\)/.test(service));
test('la vista de evento En curso usa estado específico antes que global',/included=eventInclusionExplicit\?stateByMovement\.get\(row\.id\):row\.included/.test(service));
test('Finalizado solo muestra su foto persistida',/event\.finalized\s*\? accountMovements\.filter\(row=>storedMovementIds\.has/.test(service));
test('tras importar se muestran TODOS y más joven primero para revisar',/if\(reviewCount>0\)\{store\.filter='TODOS';store\.search='';store\.sort='DESC';\}/.test(ui));
test('la UI adopta la Fecha final aplicada por backend',/if\(autoPeriod\?\.dateTo\) store\.dateTo=text\(autoPeriod\.dateTo\)/.test(ui));
test('el aviso explica que los nuevos quedan fuera del saldo',/quedan inicialmente FUERA DEL SALDO para revisión/.test(ui));
console.log(`${ok}/15 comprobaciones OK`);
