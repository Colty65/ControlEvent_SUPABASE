/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #48. */
/* ==== v23.6.4: permisos GD/RW/RO, evento finalizado consultable, fotos solo visuales y TOTAL ESTIMADO ==== */
(function(){
  'use strict';
  const VERSION='ControlEvent v26.6';
  const VERSION_FILE='ControlEvent_v26_6';
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim();
  const up=v=>norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  function st(){try{return (typeof state!=='undefined'&&state)||window.state||{};}catch(_){return window.state||{};}}
  function role(){try{return up((typeof authUser!=='undefined'&&authUser&&authUser.nivel)||window.authUser?.nivel||'');}catch(_){return '';}}
  const isGD=()=>role()==='GD', isRW=()=>role()==='RW', isRO=()=>role()==='RO';
  function arr(n){const s=st();return Array.isArray(s[n])?s[n]:[];}
  function currentEvent(){try{return (typeof selectedEvent==='function'?selectedEvent():null)||arr('eventos').find(e=>String(e.id)===String(st().selectedEventId))||{};}catch(_){return arr('eventos').find(e=>String(e.id)===String(st().selectedEventId))||{};}}
  function isFinalized(){return up(currentEvent().situacion)==='FINALIZADO';}
  function setEnabled(el,on=true){if(!el)return;el.disabled=!on;el.readOnly=!on;el.classList.toggle('locked',!on);el.classList.toggle('ce-v225-ro-disabled',!on);el.style.pointerEvents=on?'auto':'none';el.style.opacity=on?'1':'';if(on){el.removeAttribute('aria-disabled');}else{el.setAttribute('aria-disabled','true');}}
  function show(el,on=true){if(!el)return;el.classList.toggle('hidden',!on);el.style.display=on?'':'none';el.style.visibility=on?'visible':'hidden';el.disabled=!on;el.style.pointerEvents=on?'auto':'none';el.style.opacity=on?'1':'';}
  function updateVersion(){try{document.title=VERSION;}catch(_){} document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||''))el.textContent=VERSION;});}

  function applyRoleAndFinalized(){
    const r=role();
    document.body.classList.toggle('ce-v235-gd',r==='GD');
    document.body.classList.toggle('ce-v235-rw',r==='RW');
    document.body.classList.toggle('ce-v235-ro',r==='RO');
    document.body.classList.toggle('ce-v235-finalizado',isFinalized());
    // ACCESOS solo GD.
    show($('mtAccesoBtn'),isGD());
    // Carga y descarga de datos solo GD, incluso si el evento está finalizado.
    ['btnOpenImport','btnExportSeed'].forEach(id=>show($(id),isGD()));
    document.querySelectorAll('.mobile-menu-action[data-target="btnOpenImport"],.mobile-menu-action[data-target="btnExportSeed"]').forEach(el=>show(el,isGD()));
    document.querySelectorAll('.mobile-menu-action[data-target="mtAccesoBtn"]').forEach(el=>show(el,isGD()));
    // EVENTOS editable para GD y RW.
    const canEvents=isGD()||isRW();
    ['mtEventosBtn','btnAddEvento','newEventoTitulo','newEventoPrecio','newEventoFechaIni','newEventoFechaFin','newEventoSituacion','newEventoDescripcion'].forEach(id=>setEnabled($(id),canEvents));
    document.querySelectorAll('#mtEventos input,#mtEventos select,#mtEventos textarea,#mtEventos button,[data-action^="edit-evento"],button[data-action="save-evento"],button[data-action="delete-evento"]').forEach(el=>setEnabled(el,canEvents));
    // Evento finalizado: navegar/visualizar sí, cambios de fotos no.
    if(isFinalized()){
      document.querySelectorAll('.locked,.app-lockable.locked').forEach(el=>{el.classList.remove('locked');el.style.pointerEvents='auto';el.style.opacity='1';el.style.filter='none';});
      document.querySelectorAll('#summaryTiendaTicket .ticket-actions button,#summaryTiendaTicket .ticket-actions input[type="file"],#summaryTiendaTicket .ce-photo-btn-v202,#summaryTiendaTicket [data-ce-delete-img="1"]').forEach(el=>{el.style.display='none';el.disabled=true;el.style.pointerEvents='none';});
      document.querySelectorAll('#summaryTiendaTicket img.ticket-thumb,img.ticket-thumb').forEach(img=>{img.style.display='inline-block';img.style.visibility='visible';img.style.pointerEvents='auto';img.style.opacity='1';});
    }
    if(isRO()){
      // RO en curso: no modificar fotos, pero sí ver miniaturas y abrirlas.
      document.querySelectorAll('#summaryTiendaTicket .ticket-actions button,#summaryTiendaTicket .ticket-actions input[type="file"],#summaryTiendaTicket .ce-photo-btn-v202,#summaryTiendaTicket [data-ce-delete-img="1"]').forEach(el=>{el.style.display='none';el.disabled=true;el.style.pointerEvents='none';});
      document.querySelectorAll('#summaryTiendaTicket img.ticket-thumb,img.ticket-thumb').forEach(img=>{img.style.display='inline-block';img.style.visibility='visible';img.style.pointerEvents='auto';img.style.opacity='1';});
    }
  }

  async function openAccessV235(){
    if(!isGD()){alert('Solo un usuario GD puede mantener ACCESOS.');return false;}
    const wrap=$('maintenanceWrapper'); if(wrap)wrap.classList.remove('hidden');
    document.querySelectorAll('#maintenanceWrapper > .card').forEach(c=>c.classList.add('hidden'));
    $('mtAcceso')?.classList.remove('hidden');
    $('mtAccesoBtn')?.classList.remove('hidden');
    document.querySelectorAll('.maintenance-tabs .tab').forEach(b=>b.classList.remove('active'));
    $('mtAccesoBtn')?.classList.add('active');
    try{if(typeof currentMaintTab!=='undefined')currentMaintTab='acceso';}catch(_){}
    try{if(typeof fetchAccessUsers==='function')await fetchAccessUsers();else if(typeof fetchAccessIfNeeded==='function')await fetchAccessIfNeeded();}catch(err){console.warn('No se pudo recargar ACCESOS',err);}
    try{if(typeof renderAcceso==='function')renderAcceso();}catch(err){console.error('Error renderizando ACCESOS',err);}
    applyRoleAndFinalized();
    return false;
  }
  try{window.openAccessMaintenance=openAccessV235; if(typeof openAccessMaintenance!=='undefined')openAccessMaintenance=openAccessV235;}catch(_){window.openAccessMaintenance=openAccessV235;}

  function openImportOnlyV235(){
    if(!isGD()){alert('Solo GD puede realizar carga inicial de datos.');return false;}
    const wrap=$('maintenanceWrapper'); if(wrap)wrap.classList.remove('hidden');
    document.querySelectorAll('#maintenanceWrapper > .card').forEach(c=>c.classList.add('hidden'));
    $('mtImportar')?.classList.remove('hidden');
    document.querySelectorAll('.maintenance-tabs .tab').forEach(b=>b.classList.remove('active'));
    return false;
  }

  function normalizeEstimatedTotals(){
    const root=$('summaryTiendaTicket'); if(!root)return;
    root.querySelectorAll('*').forEach(el=>{
      const txt=(el.textContent||'');
      const isDonation=/DONADO\s+(SOCIO|TIENDA|OTROS|NO\s*SOCIO)/i.test(txt) || /DONADO\s+(SOCIO|TIENDA|OTROS|NO\s*SOCIO)/i.test(el.getAttribute('data-ce-tip-v21')||'');
      if(!isDonation)return;
      ['data-ce-tip-v21','data-ce-tip','data-tip','title'].forEach(a=>{const v=el.getAttribute(a); if(v)el.setAttribute(a,v.replace(/\bTOTAL\b(?!\s+ESTIMADO)/gi,'TOTAL ESTIMADO'));});
      for(const n of Array.from(el.childNodes)){if(n.nodeType===3 && /\bTOTAL\b(?!\s+ESTIMADO)/i.test(n.nodeValue||''))n.nodeValue=n.nodeValue.replace(/\bTOTAL\b(?!\s+ESTIMADO)/gi,'TOTAL ESTIMADO');}
    });
  }

  // Interceptores mínimos de alta prioridad: no rompen la navegación, solo fuerzan permisos solicitados.
  document.addEventListener('click',function(ev){
    const t=ev.target;
    const acceso=t.closest?.('#mtAccesoBtn,.mobile-menu-action[data-target="mtAccesoBtn"],[data-action="open-acceso"]');
    if(acceso){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();openAccessV235();return false;}
    const imp=t.closest?.('#btnOpenImport,.mobile-menu-action[data-target="btnOpenImport"]');
    if(imp){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();openImportOnlyV235();return false;}
    const back=t.closest?.('#btnExportSeed,.mobile-menu-action[data-target="btnExportSeed"]');
    if(back){
      if(!isGD()){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();alert('Solo GD puede realizar descarga de datos.');return false;}
      // En GD no bloqueamos por evento finalizado: dejamos que la rutina original de backup se ejecute.
      return true;
    }
    const photo=t.closest?.('#summaryTiendaTicket .ticket-actions button,#summaryTiendaTicket input[type="file"],#summaryTiendaTicket .ce-photo-btn-v202,#summaryTiendaTicket [data-ce-delete-img="1"],button[onclick*="uploadTicketImage"],button[onclick*="removeTicketImage"],input.ticket-file-input');
    if(photo && (isFinalized()||isRO())){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();alert(isFinalized()?'Evento finalizado: solo se permite visualizar fotos.':'Usuario RO: solo puede visualizar fotos.');return false;}
  },true);
  document.addEventListener('change',function(ev){const t=ev.target;if(t&&t.matches?.('#summaryTiendaTicket input[type="file"],input.ticket-file-input')&&(isFinalized()||isRO())){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();t.value='';return false;}},true);

  ['uploadTicketImage','removeTicketImage','uploadTicketImageV164','removeTicketImageV164','uploadTicketImageV202','removeTicketImageV202'].forEach(name=>{
    try{const old=window[name]||(typeof eval(name)==='function'?eval(name):null); if(typeof old==='function'&&!old.__ce_v235){const w=function(){if(isFinalized()||isRO()){alert(isFinalized()?'Evento finalizado: solo se permite visualizar fotos.':'Usuario RO: solo puede visualizar fotos.');return false;} return old.apply(this,arguments);}; w.__ce_v235=true; window[name]=w; try{eval(name+'=window["'+name+'"]');}catch(_){}}}catch(_){ }
  });

  function applyAll(){updateVersion();applyRoleAndFinalized();normalizeEstimatedTotals();}
  const oldRender=typeof render==='function'?render:null;
  if(oldRender&&!oldRender.__ce_v235){const w=function(){const r=oldRender.apply(this,arguments);setTimeout(applyAll,80);return r;};w.__ce_v235=true;try{render=w;window.render=w;}catch(_){}}
  const oldSummary=typeof renderResumen==='function'?renderResumen:null;
  if(oldSummary&&!oldSummary.__ce_v235){const w=function(){const r=oldSummary.apply(this,arguments);setTimeout(applyAll,80);return r;};w.__ce_v235=true;try{renderResumen=w;window.renderResumen=w;}catch(_){}}
  ['DOMContentLoaded','load'].forEach(evt=>window.addEventListener(evt,()=>{setTimeout(applyAll,150);setTimeout(applyAll,800);},false));
  document.addEventListener('click',()=>setTimeout(applyAll,120),false);
  applyAll(); setTimeout(applyAll,800);
})();
