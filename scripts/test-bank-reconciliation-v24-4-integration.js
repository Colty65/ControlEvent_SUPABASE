import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

class FakeQuery {
  constructor(store, table){
    this.store=store; this.table=table; this.mode='select'; this.filters=[]; this.orderBy=null;
    this.payload=null; this.conflict=''; this.returning=false;
  }
  select(){ this.returning=true; return this; }
  order(field,{ascending=true}={}){ this.orderBy={field,ascending}; return this; }
  eq(field,value){ this.filters.push(row=>String(row?.[field]??'')===String(value??'')); return this; }
  in(field,values){ const set=new Set((values||[]).map(String)); this.filters.push(row=>set.has(String(row?.[field]??''))); return this; }
  insert(payload){ this.mode='insert'; this.payload=payload; return this; }
  upsert(payload,{onConflict=''}={}){ this.mode='upsert'; this.payload=payload; this.conflict=onConflict; return this; }
  update(payload){ this.mode='update'; this.payload=payload; return this; }
  delete(){ this.mode='delete'; return this; }
  _rows(){
    let rows=[...(this.store[this.table]||[])];
    for(const filter of this.filters) rows=rows.filter(filter);
    if(this.orderBy){
      const {field,ascending}=this.orderBy;
      rows.sort((a,b)=>String(a?.[field]??'').localeCompare(String(b?.[field]??''))*(ascending?1:-1));
    }
    return rows;
  }
  _newRows(){ return Array.isArray(this.payload)?this.payload:this.payload?[this.payload]:[]; }
  _execute(){
    const table=this.store[this.table]||(this.store[this.table]=[]);
    if(this.mode==='select') return {data:this._rows().map(row=>({...row})),error:null};
    if(this.mode==='insert'){
      const inserted=this._newRows().map(row=>({...row})); table.push(...inserted); return {data:this.returning?inserted.map(row=>({...row})):null,error:null};
    }
    if(this.mode==='upsert'){
      const keys=this.conflict.split(',').map(v=>v.trim()).filter(Boolean);
      const result=[];
      for(const incoming of this._newRows()){
        const index=keys.length?table.findIndex(row=>keys.every(key=>String(row?.[key]??'')===String(incoming?.[key]??''))):-1;
        if(index>=0) table[index]={...table[index],...incoming,updated_at:'2026-07-29T00:00:00Z'};
        else table.push({...incoming,created_at:'2026-07-29T00:00:00Z',updated_at:'2026-07-29T00:00:00Z'});
        result.push({...table[index>=0?index:table.length-1]});
      }
      return {data:this.returning?result:null,error:null};
    }
    if(this.mode==='update'){
      const matches=this._rows(); const ids=new Set(matches.map(row=>row)); const updated=[];
      for(let i=0;i<table.length;i+=1){
        if(ids.has(table[i])){ table[i]={...table[i],...this.payload,updated_at:'2026-07-29T00:00:00Z'}; updated.push({...table[i]}); }
      }
      return {data:this.returning?updated:null,error:null};
    }
    if(this.mode==='delete'){
      const matches=this._rows(); const ids=new Set(matches.map(row=>row));
      this.store[this.table]=table.filter(row=>!ids.has(row));
      return {data:null,error:null};
    }
    return {data:null,error:null};
  }
  range(from,to){ const result=this._execute(); result.data=(result.data||[]).slice(from,to+1); return Promise.resolve(result); }
  maybeSingle(){ const result=this._execute(); return Promise.resolve({data:(result.data||[])[0]||null,error:result.error}); }
  single(){ const result=this._execute(); return Promise.resolve({data:(result.data||[])[0]||null,error:result.error}); }
  then(resolve,reject){ return Promise.resolve(this._execute()).then(resolve,reject); }
}
class FakeDb {
  constructor(tables){ this.tables=tables; }
  from(table){ return new FakeQuery(this.tables,table); }
}

const tables={
  ce_eventos:[
    {id:'E1',titulo:'Evento de prueba',descripcion:'Prueba',fecha_ini:'2026-07-01',fecha_fin:'2026-07-03',situacion:'En curso'},
    {id:'E2',titulo:'Otro evento',fecha_ini:'2026-08-01',fecha_fin:'2026-08-02',situacion:'En curso'}
  ],
  ce_bank_movements:[
    {id:'M0',account_id:'A',account_label:'Cuenta Peña',executed_at:'2026-06-30T09:00:00',value_date:'2026-06-30',description:'Abono anterior',amount:50,bank_balance:1000,included:true,source_hash:'H0',created_at:'2026-06-30'},
    {id:'M1',account_id:'A',account_label:'Cuenta Peña',executed_at:'2026-07-01T09:00:00',value_date:'2026-07-01',description:'Compra evento',amount:-100,bank_balance:900,included:true,source_hash:'H1',created_at:'2026-07-01'},
    {id:'M2',account_id:'A',account_label:'Cuenta Peña',executed_at:'2026-07-02T09:00:00',value_date:'2026-07-02',description:'Ingresos socios',amount:200,bank_balance:1100,included:true,source_hash:'H2',created_at:'2026-07-02'},
    {id:'M3',account_id:'A',account_label:'Cuenta Peña',executed_at:'2026-07-03T09:00:00',value_date:'2026-07-03',description:'Compra menor',amount:-50,bank_balance:1050,included:true,source_hash:'H3',created_at:'2026-07-03'},
    {id:'M4',account_id:'A',account_label:'Cuenta Peña',executed_at:'2026-07-04T09:00:00',value_date:'2026-07-04',description:'Cargo posterior',amount:-25,bank_balance:1025,included:true,source_hash:'H4',created_at:'2026-07-04'}
  ],
  ce_bank_ticket_links:[
    {id:'L1',movement_id:'M1',event_id:'E1',ticket_code:'TK01',ticket_amount_snapshot:100,forced_square:false,created_at:'2026-07-01'}
  ],
  ce_bank_event_settings:[
    {event_id:'E1',date_from:'2026-07-01',date_to:'2026-07-03',updated_at:'2026-07-01'}
  ],
  ce_bank_event_movement_state:[
    {event_id:'E1',movement_id:'M2',included:false,updated_at:'2026-07-02'}
  ],
  ce_bank_import_batches:[],
  ce_compras:[
    {id:'C1',event_id:'E1',ticket_donacion:'TK01',unidades:1,precio:100,tienda_id:'T1',responsable_id:'P1',created_at:'2026-07-01'},
    {id:'C2',event_id:'E1',ticket_donacion:'TK02',unidades:1,precio:50,tienda_id:'T1',responsable_id:'P1',created_at:'2026-07-02'},
    {id:'C3',event_id:'E2',ticket_donacion:'TK01',unidades:1,precio:75,tienda_id:'T1',responsable_id:'P1',created_at:'2026-08-01'}
  ],
  ce_tiendas:[{id:'T1',nombre:'Tienda',created_at:'2026-01-01'}],
  ce_personas:[{id:'P1',nombre:'Responsable',created_at:'2026-01-01'}]
};

globalThis.__bankFakeDb=new FakeDb(tables);
const original=fs.readFileSync(new URL('../services/bank-reconciliation.service.js',import.meta.url),'utf8');
const patched=original.replace("import { getSupabaseAdmin } from '../lib/supabase.js';","const getSupabaseAdmin = () => globalThis.__bankFakeDb;");
const temp=path.join(os.tmpdir(),`bank-reconciliation-${process.pid}-${Date.now()}.mjs`);
fs.writeFileSync(temp,patched);
const service=await import(`${pathToFileURL(temp).href}?v=${Date.now()}`);

let data=await service.listBankReconciliation({eventId:'E1',accountId:'A'});
assert.deepEqual(data.movements.map(row=>row.id),['M3','M2','M1']);
assert.equal(data.movements.some(row=>row.id==='M2'&&row.amount>0),true,'El abono debe mostrarse');
assert.equal(data.movements.find(row=>row.id==='M2').included,false,'La exclusión debe ser propia del evento');
assert.equal(data.summary.openingBalance,1000);
assert.equal(data.summary.calculatedBalance,850);
assert.equal(data.summary.actualClosingBalance,1050);
assert.equal(data.summary.latestBankBalance,1025,'El saldo certificado debe usar el último movimiento global de la cuenta');
assert.equal(data.ticketSummary.linked,1);
assert.equal(data.ticketSummary.total,2);

await service.deleteTicketLink('L1','E1');
data=await service.listBankReconciliation({eventId:'E1',accountId:'A'});
assert.equal(data.movements.some(row=>row.id==='M1'),true,'El movimiento debe seguir visible al desvincular el último TKxx');
assert.equal(data.movements.find(row=>row.id==='M1').links.length,0);

await service.setMovementIncluded('M2','E1',true,{identificacion:'RW01'});
data=await service.listBankReconciliation({eventId:'E1',accountId:'A'});
assert.equal(data.summary.calculatedBalance,1050);
assert.equal(tables.ce_bank_movements.find(row=>row.id==='M2').included,true,'No se debe alterar el valor global heredado');

await service.setBankEventPeriod('E1','2026-07-02','2026-07-04',{identificacion:'RW01'});
data=await service.listBankReconciliation({eventId:'E1',accountId:'A'});
assert.deepEqual(data.movements.map(row=>row.id),['M4','M3','M2']);
assert.equal(data.summary.openingBalance,900);
assert.equal(data.summary.calculatedBalance,1025);
assert.deepEqual(data.period.dateFrom,'2026-07-02');
assert.deepEqual(data.period.dateTo,'2026-07-04');

fs.unlinkSync(temp);
console.log('OK integración v26_prod_1.2-04: periodo persistente, abonos, desvinculación, inclusión por evento y saldos.');
