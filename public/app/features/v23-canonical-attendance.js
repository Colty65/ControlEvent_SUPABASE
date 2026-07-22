/* ControlEvent v23_prod_r1 - asistencia canónica compartida en navegador.
   Una única regla para AVANCE DEL EVENTO y cualquier vista cliente:
   - parejas cuentan por personas;
   - filas técnicas no cuentan;
   - Numero>0 confirma;
   - Numero=0 solo confirma con estado explícito de asistencia/exención/invitación. */
(function(root){
  'use strict';
  if(root.ControlEventCanonicalAttendance) return;
  const text=v=>v==null?'':String(v);
  const trim=v=>text(v).trim();
  const num=v=>{ const n=Number(text(v).replace(',','.')); return Number.isFinite(n)?n:0; };
  const arr=v=>Array.isArray(v)?v:[];
  const norm=v=>{ const s=text(v); return (s.normalize?s.normalize('NFD').replace(/[\u0300-\u036f]/g,''):s).toLowerCase().trim(); };
  const key=v=>norm(v).replace(/[^a-z0-9ñ]+/g,' ').replace(/\s+/g,' ').trim();
  const excluded=name=>{ const n=norm(name); return !n||/^personas\b/.test(n)||/^grupo\b/.test(n)||/^pe[ñn]a\b/.test(n)||/^z\s*_?\s*de/.test(n)||/^z\s*dev/.test(n); };
  const isPair=name=>/\s+y\s+/i.test(trim(name));
  const parts=name=>trim(name).split(/\s+y\s+/i).map(trim).filter(Boolean);
  const eventIdOf=row=>trim(row?.eventId??row?.event_id??row?.eventoId??row?.evento_id);
  const personIdOf=row=>trim(row?.personaId??row?.persona_id??row?.personId??row?.person_id);
  const rawNumber=row=>{ const raw=row?.numero??row?.Numero??row?.['Número']??row?.personas??row?.cantidad; if(raw===undefined||raw===null||trim(raw)==='') return null; const n=Number(text(raw).replace(',','.')); return Number.isFinite(n)?n:null; };
  const status=row=>norm(row?.situacion??row?.Situacion??row?.estado??row?.Estado??row?.ingreso??row?.formaPago??'');
  const explicitConfirmed=row=>row?.asiste===true||row?.asistente===true||row?.confirmado===true||row?.confirmed===true;
  const zeroConfirmed=row=>explicitConfirmed(row)||/^(banco|efectivo|bizum|exento|exenta|invitado|invitada|confirmado|confirmada|asiste|si|sí|pagado|pagada)$/.test(status(row));
  const confirmed=row=>{ const n=rawNumber(row); if(n===null||n<0) return false; return n>0||(n===0&&zeroConfirmed(row)); };
  const rowSize=(row,name)=>{ const n=rawNumber(row); if(n!==null&&n>0) return n; return isPair(name)?Math.max(2,parts(name).length||2):1; };

  function peopleMap(state){ const m=new Map(); arr(state?.personas).forEach(p=>{ const id=trim(p?.id??p?.ID); if(id)m.set(id,p); }); return m; }
  function census(state){
    const base=arr(state?.personas).map(row=>({row,id:trim(row?.id??row?.ID),name:trim(row?.nombre??row?.Nombre??row?.NOMBRE),rango:norm(row?.rango??row?.Rango??row?.RANGO)})).filter(x=>x.rango==='socio'&&!excluded(x.name));
    const pairs=base.filter(x=>isPair(x.name)).map(x=>({kind:'pair',id:x.id,name:x.name,key:key(x.name),parts:parts(x.name),size:Math.max(2,parts(x.name).length||2)}));
    const out=[],seen=new Set();
    pairs.forEach(p=>{ if(!seen.has(p.key)){seen.add(p.key);out.push(p);} });
    base.forEach(x=>{ if(isPair(x.name))return; const k=key(x.name); if(pairs.some(p=>p.parts.some(part=>key(part)===k))||seen.has(k))return; seen.add(k);out.push({kind:'single',id:x.id,name:x.name,key:k,parts:[x.name],size:1}); });
    return out.sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'}));
  }
  function calculate(state,eventId){
    const id=trim(eventId); const people=peopleMap(state); const socioCensus=census(state);
    const incomes=arr(state?.colaboradores).filter(row=>eventIdOf(row)===id);
    const rows=incomes.map(row=>{ const personaId=personIdOf(row),person=people.get(personaId)||{}; const name=trim(person?.nombre??person?.Nombre??row?.nombre??row?.Nombre??row?.personaNombre??row?.colaborador??personaId); const rango=norm(person?.rango??person?.Rango??row?.rango??row?.Rango??row?.personaRango??''); return {row,personaId,name,key:key(name),rango,number:rawNumber(row),size:rowSize(row,name),confirmed:confirmed(row)}; }).filter(x=>x.name&&!excluded(x.name));
    const socioRows=rows.filter(x=>x.rango==='socio'&&x.confirmed);
    const matches=(item,row)=>(row.personaId&&item.id&&row.personaId===item.id)||row.key===item.key;
    const directPair=item=>socioRows.some(row=>matches(item,row)&&((row.number===0&&row.confirmed)||row.size>=item.size));
    const directSingle=(name,pid='')=>{ const k=key(name); return socioRows.some(row=>(pid&&row.personaId&&row.personaId===pid)||row.key===k); };
    const sociosAsistentes=[],sociosNoAsistentes=[];
    socioCensus.forEach(item=>{
      if(item.kind==='pair'){
        if(directPair(item)){sociosAsistentes.push({name:item.name,size:item.size,group:true});return;}
        const present=[],missing=[]; item.parts.forEach(part=>(directSingle(part)?present:missing).push(part));
        if(!present.length)sociosNoAsistentes.push({name:item.name,size:item.size,group:true});
        else{present.forEach(name=>sociosAsistentes.push({name,size:1,group:false}));missing.forEach(name=>sociosNoAsistentes.push({name,size:1,group:false}));}
      }else if(directSingle(item.name,item.id))sociosAsistentes.push({name:item.name,size:1,group:false});
      else sociosNoAsistentes.push({name:item.name,size:1,group:false});
    });
    const noSocioMap=new Map();
    rows.filter(x=>x.rango!=='socio'&&x.confirmed).forEach(row=>{ const k=row.key||row.personaId;if(!k)return;const item={name:row.name,size:Math.max(1,row.size),group:false};const old=noSocioMap.get(k);if(!old||item.size>old.size)noSocioMap.set(k,item); });
    const noSociosAsistentes=[...noSocioMap.values()];
    [sociosAsistentes,sociosNoAsistentes,noSociosAsistentes].forEach(list=>list.sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'})));
    const totalSocios=socioCensus.reduce((a,x)=>a+num(x.size),0);
    const totalAs=sociosAsistentes.reduce((a,x)=>a+num(x.size),0);
    const totalNo=sociosNoAsistentes.reduce((a,x)=>a+num(x.size),0);
    const totalNoSocios=noSociosAsistentes.reduce((a,x)=>a+num(x.size),0);
    return {eventId:id,registrosIngreso:incomes.length,asistentes:sociosAsistentes,noAsisten:sociosNoAsistentes,noSocios:noSociosAsistentes,total:totalSocios,totalAs,totalNo,totalNoSocios,totalAsistentes:totalAs+totalNoSocios,criterio:'Numero>0 confirma; Numero=0 solo con estado explícito. Parejas cuentan por personas y se excluyen filas técnicas.'};
  }
  root.ControlEventCanonicalAttendance={version:'v23_prod_r1',calculate};
})(window);
