/* ControlEvent v4_0_exp FIX9.3.1 · PERSONAS históricas corregidas por EVENTO. */
(function(root){
  'use strict';
  if(root.__ceV25Fix93HistoricalPeople) return;
  root.__ceV25Fix93HistoricalPeople = true;

  const text=value=>value==null?'':String(value).trim();
  const num=value=>{const n=Number(String(value??0).replace(',','.'));return Number.isFinite(n)?n:0;};
  const upper=value=>text(value).toUpperCase();
  const state=()=>root.state||root.ControlEventApp?.state||root.appState||root.__CONTROL_EVENT_STATE__||{};
  const people=()=>Array.isArray(state().personas)?state().personas:[];
  const snapshots=()=>Array.isArray(state().eventPersonSnapshots)?state().eventPersonSnapshots:[];
  const events=()=>Array.isArray(state().eventos)?state().eventos:[];
  const personById=id=>people().find(row=>text(row?.id||row?.ID)===text(id))||{};
  const eventById=id=>events().find(row=>text(row?.id||row?.ID)===text(id))||{};

  function snapshotFor(eventId,personaId,row={}){
    const directName=text(row.personaNombreSnapshot||row.persona_nombre_snapshot||row.nombreSnapshot||row.personaNombre);
    const directRange=upper(row.personaRangoSnapshot||row.persona_rango_snapshot||row.rangoSnapshot||row.personaRango||row.rango);
    const snap=snapshots().find(item=>text(item.eventId||item.event_id)===text(eventId)&&text(item.personaId||item.persona_id)===text(personaId))||{};
    const current=personById(personaId);
    return {
      eventId:text(eventId),
      personaId:text(personaId),
      nombre:text(directName||snap.nombreSnapshot||snap.nombre_snapshot||current.nombre||current.Nombre||personaId),
      rango:upper(directRange||snap.rangoSnapshot||snap.rango_snapshot||current.rango||current.Rango||'SOCIO')||'SOCIO',
      current
    };
  }
  function enrich(row){
    if(!row||typeof row!=='object') return row;
    const eventId=text(row.eventId||row.event_id);
    const personaId=text(row.personaId||row.persona_id);
    const snap=snapshotFor(eventId,personaId,row);
    const event=eventById(eventId);
    const numero=num(row.numero);
    const obligatorio=snap.rango==='SOCIO'?numero*num(event.precio):0;
    const voluntario=num(row.importe??row.importeVoluntario);
    return {
      ...row,
      personaNombreSnapshot:snap.nombre,
      personaRangoSnapshot:snap.rango,
      personaNombre:snap.nombre,
      personaRango:snap.rango,
      rango:snap.rango,
      persona:{...snap.current,id:personaId,nombre:snap.nombre,rango:snap.rango,__historicalSnapshot:true},
      base:obligatorio,
      donation:voluntario,
      total:obligatorio+voluntario,
      __ceHistoricalPerson:true
    };
  }
  function hydrateState(){
    const st=state();
    if(!Array.isArray(st.colaboradores)) return;
    st.colaboradores=st.colaboradores.map(enrich);
  }
  function getGlobalCollabs(){
    try{if(typeof root.collabsForEvent==='function')return root.collabsForEvent;}catch(_){}
    try{return Function('return typeof collabsForEvent==="function"?collabsForEvent:null')();}catch(_){return null;}
  }
  function setGlobalCollabs(fn){
    try{root.collabsForEvent=fn;}catch(_){}
    try{Function('fn','collabsForEvent=fn')(fn);}catch(_){}
    try{if(root.ControlEventApp?.selectors)root.ControlEventApp.selectors.collabsForEvent=fn;}catch(_){}
  }
  function patchCollabs(){
    const old=getGlobalCollabs();
    if(typeof old!=='function'||old.__ceFix93HistoricalPeople) return;
    const wrapped=function(){return (old.apply(this,arguments)||[]).map(enrich);};
    wrapped.__ceFix93HistoricalPeople=true;
    wrapped.__ceFix93Previous=old;
    setGlobalCollabs(wrapped);
  }
  function apply(){hydrateState();patchCollabs();}

  root.ControlEventHistoricalPeople={version:'FIX9.3.1',snapshotFor,enrich,apply};
  [0,250,900,2200].forEach(ms=>setTimeout(apply,ms));
  root.addEventListener('controlevent:app-ready',apply);
  root.addEventListener('controlevent:state-loaded',apply);
  document.addEventListener('change',event=>{if(event.target?.id==='selectedEvent')setTimeout(apply,0);},true);
})(window);
