const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const index=read('public/index.html');
const ui=read('public/app/features/v4-0-exp-liquidaciones-compras.js');
const service=read('services/purchase-settlements.service.js');
const routes=read('routes/purchase-settlements.routes.js');
const server=read('server/app.js');
const sql=read('sql/ControlEvent_SQL_V4_0_EXP_LIQUIDACIONES_COMPRAS.sql');
const backupServer=read('routes/export.routes.js');
const backupUi=read('public/app/features/v26-prod-fix1-conciliacion-backup.js');
let ok=0,ko=0;
function check(name,cond){if(cond){console.log('OK ',name);ok++;}else{console.log('KO ',name);ko++;}}
function has(s,...parts){return parts.every(p=>s.includes(p));}

check('botón Liquidaciones existe',index.includes('id="btnPurchaseSettlements"'));
check('botón va después de Responsables/PDF',index.indexOf('id="btnPurchaseSettlements"')>index.indexOf('id="btnComprasResponsables"'));
check('feature Liquidaciones cargada',index.includes('v4-0-exp-liquidaciones-compras.js'));
check('ruta Liquidaciones registrada en servidor',has(server,"purchase-settlements.routes.js","app.use('/api', purchaseSettlementsRoutes)"));
check('GET listado',routes.includes("router.get('/purchase-settlements'"));
check('POST movimiento',routes.includes("router.post('/purchase-settlements/movements'"));
check('PUT movimiento',routes.includes("router.put('/purchase-settlements/movements/:id'"));
check('DELETE movimiento',routes.includes("router.delete('/purchase-settlements/movements/:id'"));
check('POST cierre',routes.includes("router.post('/purchase-settlements/close'"));
check('PATCH reapertura',routes.includes("router.patch('/purchase-settlements/:id/reopen'"));
check('RO solo lectura backend',has(service,"['GD','RW'].includes(clean.nivel)",'Los usuarios RO solo pueden consultar Liquidaciones'));
check('GD/RW pueden escribir UI',ui.includes("['GD','RW'].includes(role())"));
check('responsable caja debe ser SOCIO',has(service,"cash.range !== 'SOCIO'",'debe ser SOCIO'));
check('destino debe ser responsable de compra',has(service,'purchaseResponsibleIds','COUNTERPARTY_NOT_PURCHASE_RESPONSIBLE'));
check('Colty por defecto',has(ui,"upper(p.name)==='COLTY'",'defaultCashId'));
check('fecha por defecto Europe/Madrid',has(ui,"timeZone:'Europe/Madrid'",'type="date"'));
check('DEBE/HABER desde caja Peña',has(ui,'DEBE · sale dinero','HABER · entra dinero'));
check('observaciones libres',ui.includes('ceLiqObs'));
check('Añadir transacción',has(ui,'ceLiqAdd','Añadir'));
check('selección TKxx no liquidado',has(service,'existingByCode','TICKET_ALREADY_USED'));
check('excluye TKxx conciliado Banco',has(service,'ce_bank_ticket_links','TICKET_BANK_RECONCILED'));
check('Liquidaciones no escriben conciliación bancaria',!routes.includes('bank-ticket-links') && !routes.includes('bank/movements'));
check('una liquidación no mezcla parejas',service.includes('PURCHASE_SETTLEMENT_MIXED_PAIR'));
check('cerradas requieren reapertura',has(service,'PURCHASE_SETTLEMENT_MOVEMENT_CLOSED','reopenPurchaseSettlement'));
check('reapertura solo escritor',/reopenPurchaseSettlement[\s\S]{0,300}requireWriter\(actor\)/.test(service));
check('histórico muestra cierre',has(ui,'Histórico de liquidaciones','closedAt'));
check('preview antes del cierre',has(ui,'Documento previo de liquidación','Confirmar, cerrar y emitir PDF'));
check('PDF imprimible',has(ui,"window.print()",'LIQUIDACIÓN DE COMPRAS'));
check('PDF declara independencia Banco',ui.includes('no crea ni modifica vínculos de conciliación bancaria'));
check('SQL cabecera',sql.includes('create table if not exists public.ce_purchase_settlements'));
check('SQL movimientos',sql.includes('create table if not exists public.ce_purchase_cash_movements'));
check('SQL TKxx',sql.includes('create table if not exists public.ce_purchase_settlement_tickets'));
check('SQL único TK por evento',has(sql,'unique index if not exists uq_ce_purchase_settlement_ticket_event_code','event_id, ticket_code'));
check('SQL estados ABIERTA/CERRADA',has(sql,"status in ('ABIERTA','CERRADA')",'closed_at'));
check('BACKUP hoja cabeceras',backupServer.includes("addRows('LIQUIDACIONES'"));
check('BACKUP hoja movimientos',backupServer.includes("addRows('LIQUIDACION_MVTOS'"));
check('BACKUP hoja TKxx',backupServer.includes("addRows('LIQUIDACION_TK'"));
check('RESTORE detecta hojas válidas',has(backupUi,'purchaseSettlementsPresent','sheetHasHeaders'));
check('RESTORE borra hijos antes de cabecera',backupServer.indexOf("deleteRowsByPk('ce_purchase_settlement_tickets'")<backupServer.indexOf("deleteRowsByPk('ce_purchase_settlements'"));
check('RESTORE upsert cabecera antes de hijos',backupServer.indexOf("counts.purchaseSettlements=await upsertChunks")<backupServer.indexOf("counts.purchaseCashMovements=await upsertChunks") && backupServer.indexOf("counts.purchaseCashMovements=await upsertChunks")<backupServer.indexOf("counts.purchaseSettlementTickets=await upsertChunks"));

// Ejecuta únicamente la aritmética real del servicio, sin importar Supabase.
try{
  const start=service.indexOf('const text =');
  const end=service.indexOf('async function selectAll');
  if(start<0||end<0) throw new Error('No se encontró bloque aritmético');
  let block=service.slice(start,end).replace('export function computePurchaseSettlementTotals','function computePurchaseSettlementTotals');
  const sandbox={};vm.createContext(sandbox);vm.runInContext(`${block}\nthis.computePurchaseSettlementTotals=computePurchaseSettlementTotals;`,sandbox);
  const calc=sandbox.computePurchaseSettlementTotals;
  const a=calc([{direction:'DEBE',amount:200},{direction:'HABER',amount:13}],[{amount:187}]);
  const b=calc([],[{amount:187}]);
  const c=calc([{direction:'DEBE',amount:200}],[{amount:187}]);
  check('fórmula 200 DEBE - 13 HABER - 187 TK = 0',a.balance===0&&a.kind==='CUADRADA');
  check('persona adelanta 187 => Peña debe 187',b.balance===-187&&b.amount===187);
  check('adelanto 200 y TK187 => persona devuelve 13',c.balance===13&&c.amount===13);
}catch(err){console.log('KO  aritmética real:',err.message);ko+=3;}

console.log(`\nLIQUIDACIONES COMPRAS: ${ok} OK · ${ko} KO`);
process.exitCode=ko?1:0;
