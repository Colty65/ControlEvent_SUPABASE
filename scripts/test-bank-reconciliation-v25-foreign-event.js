import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

class Query{
  constructor(store,table){this.store=store;this.table=table;this.filters=[];this.orderBy=null;this.mode='select';this.payload=null;this.returning=false;this.conflict='';}
  select(){this.returning=true;return this;}
  eq(field,value){this.filters.push(row=>String(row?.[field]??'')===String(value??''));return this;}
  in(field,values){const set=new Set((values||[]).map(String));this.filters.push(row=>set.has(String(row?.[field]??'')));return this;}
  order(field,{ascending=true}={}){this.orderBy={field,ascending};return this;}
  insert(payload){this.mode='insert';this.payload=payload;return this;}
  upsert(payload,{onConflict=''}={}){this.mode='upsert';this.payload=payload;this.conflict=onConflict;return this;}
  update(payload){this.mode='update';this.payload=payload;return this;}
  delete(){this.mode='delete';return this;}
  rows(){let rows=[...(this.store[this.table]||[])];for(const f of this.filters)rows=rows.filter(f);if(this.orderBy){const {field,ascending}=this.orderBy;rows.sort((a,b)=>String(a?.[field]??'').localeCompare(String(b?.[field]??''))*(ascending?1:-1));}return rows;}
  execute(){
    const table=this.store[this.table]||(this.store[this.table]=[]);
    if(this.mode==='select')return {data:this.rows().map(r=>({...r})),error:null};
    if(this.mode==='insert'){const rows=(Array.isArray(this.payload)?this.payload:[this.payload]).map(r=>({...r,id:r.id||`I${Date.now()}`}));table.push(...rows);return {data:this.returning?rows:null,error:null};}
    if(this.mode==='upsert'){const keys=this.conflict.split(',').filter(Boolean);const result=[];for(const incoming of (Array.isArray(this.payload)?this.payload:[this.payload])){let i=table.findIndex(r=>keys.every(k=>String(r[k])===String(incoming[k])));if(i<0){table.push({...incoming});i=table.length-1;}else table[i]={...table[i],...incoming};result.push({...table[i]});}return {data:this.returning?result:null,error:null};}
    if(this.mode==='update'){const matched=new Set(this.rows());const out=[];for(let i=0;i<table.length;i++)if(matched.has(table[i])){table[i]={...table[i],...this.payload};out.push({...table[i]});}return {data:this.returning?out:null,error:null};}
    if(this.mode==='delete'){const matched=new Set(this.rows());this.store[this.table]=table.filter(r=>!matched.has(r));return {data:null,error:null};}
    return {data:null,error:null};
  }
  range(from,to){const r=this.execute();r.data=(r.data||[]).slice(from,to+1);return Promise.resolve(r);}
  maybeSingle(){const r=this.execute();return Promise.resolve({data:(r.data||[])[0]||null,error:r.error});}
  single(){const r=this.execute();return Promise.resolve({data:(r.data||[])[0]||null,error:r.error});}
  then(resolve,reject){return Promise.resolve(this.execute()).then(resolve,reject);}
}
class Db{constructor(tables){this.tables=tables;}from(table){return new Query(this.tables,table);}}

const tables={
  ce_eventos:[
    {id:'E1',titulo:'Evento actual',fecha_ini:'2026-07-01',fecha_fin:'2026-07-05',situacion:'En curso'},
    {id:'E2',titulo:'Evento anterior',fecha_ini:'2026-06-01',fecha_fin:'2026-06-05',situacion:'Finalizado'}
  ],
  ce_bank_movements:[
    {id:'M1',account_id:'A',account_label:'Cuenta Peña',executed_at:'2026-07-02T10:00:00',value_date:'2026-07-02',description:'Compra del evento anterior',amount:-80,bank_balance:920,included:true,source_hash:'H1',created_at:'2026-07-02'}
  ],
  ce_bank_ticket_links:[
    {id:'L2',movement_id:'M1',event_id:'E2',ticket_code:'TK09',ticket_amount_snapshot:80,forced_square:false,created_at:'2026-06-05'}
  ],
  ce_bank_event_settings:[{event_id:'E1',date_from:'2026-07-01',date_to:'2026-07-05'}],
  ce_bank_event_movement_state:[],ce_bank_import_batches:[],
  ce_compras:[{id:'C1',event_id:'E1',ticket_donacion:'TK01',unidades:1,precio:80,tienda_id:'T1',responsable_id:'P1'}],
  ce_tiendas:[{id:'T1',nombre:'Tienda'}],ce_personas:[{id:'P1',nombre:'Responsable'}]
};

globalThis.__bankFakeDb=new Db(tables);
const original=fs.readFileSync(new URL('../services/bank-reconciliation.service.js',import.meta.url),'utf8');
const patched=original.replace("import { getSupabaseAdmin } from '../lib/supabase.js';","const getSupabaseAdmin=()=>globalThis.__bankFakeDb;");
const temp=path.join(os.tmpdir(),`bank-foreign-${process.pid}-${Date.now()}.mjs`);fs.writeFileSync(temp,patched);
const service=await import(`${pathToFileURL(temp).href}?v=${Date.now()}`);

const data=await service.listBankReconciliation({eventId:'E1',accountId:'A'});
assert.equal(data.movements.length,1);
const movement=data.movements[0];
assert.equal(movement.included,false,'Un movimiento de otro evento debe entrar inactivo');
assert.equal(movement.linkedToOtherEvent,true);
assert.equal(movement.inclusionLocked,true);
assert.equal(movement.justificationStatus,'OTRO_EVENTO');
assert.equal(movement.displayLinks[0].ticketCode,'TK09');
assert.equal(movement.displayLinks[0].eventTitle,'Evento anterior');
assert.equal(movement.displayLinks[0].isActiveEvent,false);

await assert.rejects(()=>service.setMovementIncluded('M1','E1',true,{identificacion:'RW'}),error=>error?.code==='BANK_MOVEMENT_OTHER_EVENT');
await assert.rejects(()=>service.addTicketLink('M1',{eventId:'E1',ticketCode:'TK01'},{identificacion:'RW'}),error=>error?.code==='BANK_MOVEMENT_OTHER_EVENT');
fs.unlinkSync(temp);
console.log('OK v25_prod FIX3 integración: movimiento de otro evento visible con TKxx, título e inactivo/bloqueado.');
