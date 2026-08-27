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
test('movimiento global nuevo nace fuera de saldo',/RAW14H[\s\S]{0,500}included:false,[\s\S]{0,250}source_hash:row\.sourceHash/.test(service));
test('evento seleccionado recibe estado específico EN SALDO',/AUTO_IMPORT_EVENTO_SELECCIONADO[\s\S]{0,250}included:true|included:true[\s\S]{0,250}AUTO_IMPORT_EVENTO_SELECCIONADO/.test(service));
test('solo fresh recibe la presunción activa del evento seleccionado',/const insertedIds=new Set\(arr\(insertedRows\)/.test(service)&&/const selectedOnRows=\[\.\.\.insertedIds\]/.test(service));
test('otros eventos En curso heredan global OFF si no tienen estado propio',/included=row\.included/.test(service)&&/otro evento En curso[\s\S]{0,160}global FALSE/i.test(service));
test('Finalizado solo muestra su foto persistida',/event\.finalized\s*\? accountMovements\.filter\(row=>storedMovementIds\.has/.test(service));
test('la Fecha final se aplica con el mismo flujo que Aplicar fechas',/const appliedPeriod=await setBankEventPeriod\(selectedEvent,nextPeriod\.dateFrom,nextPeriod\.dateTo,autoActor,selectedAccount\)/.test(service));
test('estado EN SALDO del evento seleccionado se escribe antes de aplicar periodo',service.indexOf('AUTO_IMPORT_EVENTO_SELECCIONADO')<service.indexOf('const appliedPeriod=await setBankEventPeriod'));
test('backend informa cuántos nuevos quedaron activos',/insertedDefaultedOn:Number\(activeEventUpdate\.insertedDefaultedOn\|\|0\)/.test(service));
test('UI muestra todos y más joven primero para revisar',/if\(reviewCount>0\)\{store\.filter='TODOS';store\.search='';store\.sort='DESC';\}/.test(ui));
test('UI adopta Fecha final aplicada por backend',/if\(autoPeriod\?\.dateTo\) store\.dateTo=text\(autoPeriod\.dateTo\)/.test(ui));
test('aviso explica que el evento de carga parte EN SALDO',/quedan inicialmente EN SALDO en este evento/.test(ui));
test('aviso explica que otros En curso parten fuera',/demás eventos En curso estos movimientos parten FUERA DEL SALDO/.test(ui));
test('no se añade SQL ni se altera esquema para el cambio',!service.includes('ALTER TABLE')&&!service.includes('CREATE TABLE'));
console.log(`${ok}/18 comprobaciones OK`);
