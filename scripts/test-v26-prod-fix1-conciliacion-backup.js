import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root=new URL('../',import.meta.url);
const read=relative=>fs.readFileSync(new URL(relative,root),'utf8');

class FakeQuery{
  constructor(store,table){this.store=store;this.table=table;this.mode='select';this.filters=[];this.orderBy=[];this.payload=null;this.conflict='';this.returning=false;}
  select(){this.returning=true;return this;}
  order(field,{ascending=true}={}){this.orderBy.push({field,ascending});return this;}
  eq(field,value){this.filters.push(row=>String(row?.[field]??'')===String(value??''));return this;}
  in(field,values){const set=new Set((values||[]).map(String));this.filters.push(row=>set.has(String(row?.[field]??'')));return this;}
  insert(payload){this.mode='insert';this.payload=payload;return this;}
  upsert(payload,{onConflict=''}={}){this.mode='upsert';this.payload=payload;this.conflict=onConflict;return this;}
  update(payload){this.mode='update';this.payload=payload;return this;}
  delete(){this.mode='delete';return this;}
  _rows(){let rows=[...(this.store[this.table]||[])];for(const fn of this.filters)rows=rows.filter(fn);if(this.orderBy.length)rows.sort((a,b)=>{for(const {field,ascending} of this.orderBy){const cmp=String(a?.[field]??'').localeCompare(String(b?.[field]??''));if(cmp)return cmp*(ascending?1:-1);}return 0;});return rows;}
  _newRows(){return Array.isArray(this.payload)?this.payload:this.payload?[this.payload]:[];}
  _execute(){const table=this.store[this.table]||(this.store[this.table]=[]);if(this.mode==='select')return{data:this._rows().map(r=>({...r})),error:null};if(this.mode==='insert'){const rows=this._newRows().map(r=>({...r}));table.push(...rows);return{data:this.returning?rows:null,error:null};}if(this.mode==='upsert'){const keys=this.conflict.split(',').map(v=>v.trim()).filter(Boolean);const out=[];for(const incoming of this._newRows()){const idx=keys.length?table.findIndex(r=>keys.every(k=>String(r?.[k]??'')===String(incoming?.[k]??''))):-1;if(idx>=0)table[idx]={...table[idx],...incoming};else table.push({...incoming});out.push({...table[idx>=0?idx:table.length-1]});}return{data:this.returning?out:null,error:null};}if(this.mode==='delete'){const matches=new Set(this._rows());this.store[this.table]=table.filter(r=>!matches.has(r));return{data:null,error:null};}return{data:null,error:null};}
  range(from,to){const r=this._execute();r.data=(r.data||[]).slice(from,to+1);return Promise.resolve(r);}
  maybeSingle(){const r=this._execute();return Promise.resolve({data:(r.data||[])[0]||null,error:r.error});}
  single(){return this.maybeSingle();}
  then(resolve,reject){return Promise.resolve(this._execute()).then(resolve,reject);}
}
class FakeDb{constructor(tables){this.tables=tables;}from(table){return new FakeQuery(this.tables,table);}}

const tables={
  ce_eventos:[{id:'E1',titulo:'Evento cerrado',fecha_ini:'2026-07-01',fecha_fin:'2026-07-03',situacion:'Finalizado'}],
  ce_bank_movements:[
    {id:'M0',account_id:'A',account_label:'Cuenta Peña',executed_at:'2026-06-30T09:00:00',value_date:'2026-06-30',description:'Anterior',amount:50,bank_balance:1000,included:true,source_hash:'H0'},
    {id:'M1',account_id:'A',account_label:'Cuenta Peña',executed_at:'2026-07-01T09:00:00',value_date:'2026-07-01',description:'Compra',amount:-100,bank_balance:900,included:true,source_hash:'H1'},
    {id:'M2',account_id:'A',account_label:'Cuenta Peña',executed_at:'2026-07-02T09:00:00',value_date:'2026-07-02',description:'Abono excluido',amount:200,bank_balance:1100,included:true,source_hash:'H2'},
    {id:'M3',account_id:'A',account_label:'Cuenta Peña',executed_at:'2026-07-03T09:00:00',value_date:'2026-07-03',description:'Cargo',amount:-50,bank_balance:1050,included:true,source_hash:'H3'}
  ],
  ce_bank_ticket_links:[{id:'L1',movement_id:'M1',event_id:'E1',ticket_code:'TK01',ticket_amount_snapshot:100,forced_square:true,created_at:'2026-07-01'}],
  ce_bank_event_settings:[{event_id:'E1',date_from:'2026-07-01',date_to:'2026-07-03'}],
  ce_bank_event_movement_state:[{event_id:'E1',movement_id:'M2',included:false}],
  ce_bank_import_batches:[{id:'B1',source_filename:'enero.csv',account_id:'A',account_label:'Cuenta Peña',parsed_count:4,inserted_count:4,duplicate_count:0,warning_count:0}],
  ce_compras:[{id:'C1',event_id:'E1',ticket_donacion:'TK01',unidades:1,precio:100}],
  ce_tiendas:[],ce_personas:[]
};
globalThis.__bankFakeDbV25=new FakeDb(tables);
const original=read('services/bank-reconciliation.service.js');
const patched=original.replace("import { getSupabaseAdmin } from '../lib/supabase.js';","const getSupabaseAdmin=()=>globalThis.__bankFakeDbV25;");
const tmp=path.join(os.tmpdir(),`ce-v25-bank-${process.pid}-${Date.now()}.mjs`);fs.writeFileSync(tmp,patched);
const service=await import(`${pathToFileURL(tmp).href}?v=${Date.now()}`);
const view=await service.listBankReconciliation({eventId:'E1',accountId:'A'});
assert.equal(view.readOnly,true);
assert.deepEqual(view.movements.map(r=>r.id),['M3','M1'],'Un evento Finalizado solo debe mostrar movimientos En saldo');
assert.equal(view.movements.some(r=>r.id==='M2'),false);
assert.equal(view.summary.openingBalance,1000,'El saldo inicial debe calcularse con todo el período aunque haya movimientos no incluidos');
assert.equal(view.summary.calculatedBalance,850);
assert.equal(view.ticketSummary.linked,1);
assert.equal(view.movements.find(r=>r.id==='M1')?.forcedSquare,true);
const eventExport=await service.exportBankData({accountId:'TODOS',eventId:'E1'});
assert.deepEqual(eventExport.movements.map(r=>r.id),['M3','M1'],'INFOEVENTO solo debe recibir movimientos En saldo del evento');
assert.equal(eventExport.movements.find(r=>r.id==='M1')?.justificationStatus,'CUADRADO_FORZADO');
assert.equal(eventExport.movements.some(r=>r.id==='M2'),false,'Un movimiento inactivo del evento no puede salir en INFOEVENTO');
const raw=await service.exportBankData({accountId:'TODOS'});
assert.equal(raw.movements.length,4);
assert.equal(raw.links.length,1);
assert.equal(raw.batches.length,1);
assert.equal(raw.eventSettings.length,1);
assert.equal(raw.movementStates.length,1);
fs.unlinkSync(tmp);

const progress=read('public/app/features/v16-hotfix5-logo-avance-ligero.js');
assert.match(progress,/CONCILIACIÓN BANCARIA/);
assert.match(progress,/TKxx conciliados:/);
assert.match(progress,/ticketSummary/);
const info=read('public/app/legacy/legacy-bundle-after-modules-v30.7.js');
assert.match(info,/filter\(movement=>movement\?\.included===true\)/);
assert.match(info,/CUADRADO_FORZADO/);
assert.match(info,/Movimiento positivo conciliado/);
const exportRoute=read('routes/export.routes.js');
for(const sheet of ['ACCESOS','META_BBDD','BANCO_IMPORTACIONES','BANCO_MVTOS','BANCO_TK_LINKS','BANCO_PERIODOS','BANCO_ESTADO_MVTO','HITOS','LG']) assert.ok(exportRoute.includes(`'${sheet}'`),`Falta la hoja ${sheet}`);
assert.match(exportRoute,/\/export\/restore-extended/);
const ai=read('services/event-ai.service.js');
for(const table of ['ce_bank_import_batches','ce_bank_movements','ce_bank_ticket_links','ce_bank_event_settings','ce_bank_event_movement_state','ce_hitos','ce_lg']) assert.ok(ai.includes(table),`Zuzu no conoce ${table}`);
assert.match(ai,/asksBroadEvent/);
const ui=read('public/app/features/v26-prod-fix1-conciliacion-backup.js');
assert.match(ui,/ceV25PinnedGraphTip/);
assert.match(ui,/closeBankNow/);
assert.match(ui,/CE_COMPRAS_BBDD/);
assert.match(ui,/EVENTO_CODIGO/);
assert.match(ui,/eventCodeToId/);
assert.match(ui,/accessUsers/);
assert.match(ui,/META_BBDD/);
assert.match(ui,/BACKUP con alcance TODOS/);
const backupClient=read('public/modules/excel/backup.js');
for(const sheet of ['BANCO_IMPORTACIONES','BANCO_MVTOS','BANCO_TK_LINKS','BANCO_PERIODOS','BANCO_ESTADO_MVTO','HITOS','LG']) assert.ok(backupClient.includes(sheet),`Fallback sin ${sheet}`);
const index=read('public/index.html');
assert.match(index,/v26-prod-fix1-conciliacion-backup\.js/);

console.log('OK v26_prod FIX1: avance, INFOEVENTO, cierre, globos, Zuzu, BACKUP integral y Finalizado En saldo.');
