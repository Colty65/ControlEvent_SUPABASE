/* ControlEvent v23_prod_r2 - única fuente canónica de asistencia.
   Evita duplicar cálculos entre contexto, tablas, PDF y redacción. */

function text(v){ return v == null ? '' : String(v); }
function trim(v){ return text(v).trim(); }
function num(v){ const n=Number(text(v).replace(',','.')); return Number.isFinite(n)?n:0; }
function arr(v){ return Array.isArray(v)?v:[]; }
function norm(v){ const s=text(v); return (s.normalize?s.normalize('NFD').replace(/[\u0300-\u036f]/g,''):s).toLowerCase().trim(); }
function key(v){ return norm(v).replace(/[^a-z0-9ñ]+/g,' ').replace(/\s+/g,' ').trim(); }
function excluded(name){ const n=norm(name); return !n || /^personas\b/.test(n) || /^grupo\b/.test(n) || /^pe[ñn]a\b/.test(n) || /^z\s*_?\s*de/.test(n) || /^z\s*dev/.test(n); }
function isPair(name){ return /\s+y\s+/i.test(trim(name)); }
function pairParts(name){ return trim(name).split(/\s+y\s+/i).map(trim).filter(Boolean); }
function rowEventId(row){ return trim(row?.eventId ?? row?.event_id ?? row?.eventoId ?? row?.evento_id); }
function rowPersonaId(row){ return trim(row?.personaId ?? row?.persona_id ?? row?.personId ?? row?.person_id); }
function rawNumber(row){ const raw=row?.numero ?? row?.Numero ?? row?.['Número'] ?? row?.personas ?? row?.cantidad; if(raw===undefined||raw===null||trim(raw)==='') return null; const n=Number(text(raw).replace(',','.')); return Number.isFinite(n)?n:null; }
function status(row){ return norm(row?.situacion ?? row?.Situacion ?? row?.estado ?? row?.Estado ?? row?.ingreso ?? row?.formaPago ?? ''); }
function explicitConfirmed(row){ return row?.asiste===true || row?.asistente===true || row?.confirmado===true || row?.confirmed===true; }
function zeroAttendanceConfirmed(row){ return explicitConfirmed(row) || /^(banco|efectivo|bizum|exento|exenta|invitado|invitada|confirmado|confirmada|asiste|si|sí|pagado|pagada)$/.test(status(row)); }
function isAttendanceRow(row){ const n=rawNumber(row); if(n===null || n<0) return false; if(n>0) return true; return zeroAttendanceConfirmed(row); }
function rowSize(row,name){ const n=rawNumber(row); if(n!==null && n>0) return n; return isPair(name)?Math.max(2,pairParts(name).length||2):1; }

function personMaps(state){
  const byId=new Map();
  arr(state?.personas).forEach(p=>{ const id=trim(p?.id??p?.ID); if(id) byId.set(id,p); });
  return byId;
}

function canonicalSocioCensus(state){
  const base=arr(state?.personas).map(row=>({
    row,
    id:trim(row?.id??row?.ID),
    name:trim(row?.nombre??row?.Nombre??row?.NOMBRE),
    rango:norm(row?.rango??row?.Rango??row?.RANGO)
  })).filter(x=>x.rango==='socio' && !excluded(x.name));
  const pairs=base.filter(x=>isPair(x.name)).map(x=>({kind:'pair',id:x.id,name:x.name,key:key(x.name),parts:pairParts(x.name),size:Math.max(2,pairParts(x.name).length||2)}));
  const out=[]; const seen=new Set();
  pairs.forEach(p=>{ if(!seen.has(p.key)){ seen.add(p.key); out.push(p); } });
  base.forEach(x=>{
    if(isPair(x.name)) return;
    const k=key(x.name);
    if(pairs.some(p=>p.parts.some(part=>key(part)===k))) return;
    if(seen.has(k)) return;
    seen.add(k); out.push({kind:'single',id:x.id,name:x.name,key:k,parts:[x.name],size:1});
  });
  return out.sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'}));
}

export function buildCanonicalAttendance(state,eventIds=[]){
  const ids=arr(eventIds).map(trim).filter(Boolean);
  const people=personMaps(state);
  const census=canonicalSocioCensus(state);
  const events=new Map(arr(state?.eventos).map(e=>[trim(e?.id),trim(e?.titulo??e?.Titulo??e?.nombre??e?.id)]));
  const porEvento=[];
  ids.forEach(eventId=>{
    const incomes=arr(state?.colaboradores).filter(r=>rowEventId(r)===eventId);
    const rows=incomes.map(row=>{
      const personaId=rowPersonaId(row); const person=people.get(personaId)||{};
      const name=trim(person?.nombre??person?.Nombre??row?.nombre??row?.Nombre??row?.personaNombre??row?.colaborador??personaId);
      const rango=norm(person?.rango??person?.Rango??row?.rango??row?.Rango??row?.personaRango??'');
      return {row,personaId,name,key:key(name),rango,number:rawNumber(row),size:rowSize(row,name),confirmed:isAttendanceRow(row)};
    }).filter(x=>x.name&&!excluded(x.name));
    const socioRows=rows.filter(x=>x.rango==='socio'&&x.confirmed);
    const sociosAsistentes=[]; const sociosNoAsistentes=[];
    const matches=(item,row)=>(row.personaId&&item.id&&row.personaId===item.id)||row.key===item.key;
    const directPair=item=>socioRows.some(row=>matches(item,row)&&((row.number===0&&row.confirmed)||row.size>=item.size));
    const directSingle=(name,id='')=>{ const k=key(name); return socioRows.some(row=>(id&&row.personaId&&row.personaId===id)||row.key===k); };
    census.forEach(item=>{
      if(item.kind==='pair'){
        if(directPair(item)){ sociosAsistentes.push({nombre:item.name,personas:item.size,tipo:'pareja'}); return; }
        const present=[],missing=[];
        item.parts.forEach(part=>(directSingle(part)?present:missing).push(part));
        if(!present.length) sociosNoAsistentes.push({nombre:item.name,personas:item.size,tipo:'pareja'});
        else { present.forEach(nombre=>sociosAsistentes.push({nombre,personas:1,tipo:'individual'})); missing.forEach(nombre=>sociosNoAsistentes.push({nombre,personas:1,tipo:'individual'})); }
      } else if(directSingle(item.name,item.id)) sociosAsistentes.push({nombre:item.name,personas:1,tipo:'individual'});
      else sociosNoAsistentes.push({nombre:item.name,personas:1,tipo:'individual'});
    });
    const noSocioMap=new Map();
    rows.filter(x=>x.rango!=='socio'&&x.confirmed).forEach(row=>{
      const k=row.key||row.personaId; if(!k) return;
      const item={nombre:row.name,personas:Math.max(1,row.size),tipo:'no socio'};
      const old=noSocioMap.get(k); if(!old||item.personas>old.personas) noSocioMap.set(k,item);
    });
    const noSociosAsistentes=[...noSocioMap.values()].sort((a,b)=>a.nombre.localeCompare(b.nombre,'es',{sensitivity:'base'}));
    sociosAsistentes.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es',{sensitivity:'base'}));
    sociosNoAsistentes.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es',{sensitivity:'base'}));
    const sociosCensoPersonas=census.reduce((a,x)=>a+num(x.size),0);
    const sociosAsistentesPersonas=sociosAsistentes.reduce((a,x)=>a+num(x.personas),0);
    const sociosNoAsistentesPersonas=sociosNoAsistentes.reduce((a,x)=>a+num(x.personas),0);
    const noSociosAsistentesPersonas=noSociosAsistentes.reduce((a,x)=>a+num(x.personas),0);
    porEvento.push({
      Evento:events.get(eventId)||eventId,eventId,
      registrosIngreso:incomes.length,
      registrosSocios:rows.filter(x=>x.rango==='socio').length,
      registrosNoSocios:rows.filter(x=>x.rango!=='socio').length,
      sociosCensoPersonas,sociosAsistentesPersonas,noSociosAsistentesPersonas,
      totalAsistentesPersonas:sociosAsistentesPersonas+noSociosAsistentesPersonas,
      sociosNoAsistentesPersonas,
      sociosAsistentes,noSociosAsistentes,sociosNoAsistentes,
      criterio:'Cálculo único por personas. Parejas cuentan por sus integrantes; filas técnicas se excluyen. Numero>0 confirma asistencia. Numero=0 solo cuenta si la situación confirma asistencia/exención/invitación; una fila pendiente o vacía no convierte a nadie en asistente.'
    });
  });
  return {fuente:'ControlEvent - asistencia canónica única',regla:'socios asistentes + no socios asistentes = total de asistentes; registros de ingreso son filas administrativas',porEvento};
}

export function canonicalAttendanceFromContext(context){
  return arr(context?.asistenciaCanonica?.porEvento).map(row=>({
    Evento:trim(row.Evento),eventId:trim(row.eventId),registrosIngreso:num(row.registrosIngreso),registrosSocios:num(row.registrosSocios),registrosNoSocios:num(row.registrosNoSocios),
    totalSocios:num(row.sociosCensoPersonas),totalAsistentes:num(row.sociosAsistentesPersonas),totalNoSociosAsistentes:num(row.noSociosAsistentesPersonas),totalAsistentesPersonas:num(row.totalAsistentesPersonas),totalNoAsisten:num(row.sociosNoAsistentesPersonas),
    asistentes:arr(row.sociosAsistentes).map(x=>({name:trim(x.nombre),size:num(x.personas)||1,kind:trim(x.tipo)})),
    noSociosAsistentes:arr(row.noSociosAsistentes).map(x=>({name:trim(x.nombre),size:num(x.personas)||1,kind:trim(x.tipo)})),
    noAsisten:arr(row.sociosNoAsistentes).map(x=>({name:trim(x.nombre),size:num(x.personas)||1,kind:trim(x.tipo)})),
    criterio:trim(row.criterio||context?.asistenciaCanonica?.regla)
  }));
}
