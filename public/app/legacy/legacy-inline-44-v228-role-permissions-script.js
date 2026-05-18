/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #44. */
/* ==== v22.8: criterios de opciones y permisos por nivel GD/RW/RO ==== */
(function(){
  const VERSION='ControlEvent v26.6';
  const VERSION_FILE='ControlEvent_v26_6';
  function $(id){return document.getElementById(id)}
  function role(){try{return String((typeof authUser!=='undefined'&&authUser&&authUser.nivel)||'').toUpperCase();}catch(_){return '';}}
  function isGD(){return role()==='GD'}
  function isRW(){return role()==='RW'}
  function isRO(){return role()==='RO'}
  function ev(){try{return (typeof selectedEvent==='function'&&selectedEvent()) || (typeof state!=='undefined' && state.eventos||[]).find(e=>String(e.id)===String(state.selectedEventId)) || null;}catch(_){return null;}}
  function isFinalized(){return String(ev()?.situacion||'').toUpperCase()==='FINALIZADO';}
  function show(el,yes){if(!el)return; el.classList.toggle('hidden-by-role-v228',!yes); if(yes){el.style.removeProperty('display');}else{el.style.setProperty('display','none','important');}}
  function setDisabled(el,yes){if(!el)return; el.disabled=!!yes; if(yes)el.setAttribute('aria-disabled','true'); else el.removeAttribute('aria-disabled');}
  function setBodyRole(){
    document.body.classList.toggle('ce-role-gd',isGD());
    document.body.classList.toggle('ce-role-rw',isRW());
    document.body.classList.toggle('ce-role-ro',isRO());
    document.body.classList.toggle('ce-event-finalized',isFinalized());
    document.body.classList.toggle('ce-event-not-finalized',!isFinalized());
  }
  function hideMobileTarget(target,visible){document.querySelectorAll(`.mobile-menu-action[data-target="${target}"]`).forEach(el=>show(el,visible));}
  function ensureRoInfo(){
    const body=$('comprasSummaryBody'); if(!body)return;
    let box=$('ceRoInfoV228');
    if(isRO()){
      if(!box){box=document.createElement('div'); box.id='ceRoInfoV228'; box.className='ce-ro-info-v228'; box.textContent='Modo consulta: este usuario puede consultar Resumen, Cálculos por agrupación y Gráficas. No puede añadir, modificar ni eliminar datos ni fotos.'; body.insertBefore(box,body.firstChild);} 
    }else if(box){box.remove();}
  }
  function switchToAllowedForRO(){
    if(!isRO())return;
    try{
      const resumen=$('tabResumen'), graficas=$('tabGraficas');
      const currentResumen=resumen&&!resumen.classList.contains('hidden');
      const currentGraficas=graficas&&!graficas.classList.contains('hidden');
      if(!currentResumen && !currentGraficas){
        if(typeof currentMainTab!=='undefined') currentMainTab='resumen';
        if(typeof render==='function') render();
      }
      const body=$('comprasSummaryBody'); if(body) body.classList.remove('hidden');
      const btn=$('toggleComprasSummary'); if(btn) btn.setAttribute('aria-expanded','true');
    }catch(_){ }
  }
  function applyRoleVisibility(){
    setBodyRole();
    const ro=isRO(), rw=isRW(), gd=isGD();
    // Menú principal de pestañas
    show($('tabIngresosBtn'), !ro);
    show($('tabDonacionesBtn'), !ro);
    show($('tabComprasBtn'), !ro);
    show($('tabResumenBtn'), gd||rw||ro);
    show($('tabGraficasBtn'), gd||rw||ro);
    // Pestañas/contenedores si un render antiguo los deja visibles
    if(ro){ show($('tabIngresos'),false); show($('tabDonaciones'),false); show($('tabCompras'),false); }
    // Herramientas del pie
    show($('btnExportExcel'), (gd||rw||ro) && (!ro || isFinalized()));
    setDisabled($('btnExportExcel'), ro && !isFinalized());
    show($('btnOpenImport'), gd);
    show($('btnExportSeed'), gd);
    show($('btnToggleMaintenance'), gd||rw);
    // Mantenimiento ACCESOS solo GD. RW mantiene el resto de tablas, incluido EVENTOS.
    show($('mtAccesoBtn'), gd);
    if(!gd){ show($('mtAccesos'),false); show($('mtAcceso'),false); }
    // Menú móvil
    ['tabIngresosBtn','tabDonacionesBtn','tabComprasBtn'].forEach(t=>hideMobileTarget(t,!ro));
    hideMobileTarget('tabResumenBtn',gd||rw||ro);
    hideMobileTarget('tabGraficasBtn',gd||rw||ro);
    hideMobileTarget('btnExportExcel',(gd||rw||ro) && (!ro || isFinalized()));
    hideMobileTarget('btnToggleMaintenance',gd||rw);
    hideMobileTarget('btnOpenImport',gd);
    hideMobileTarget('btnExportSeed',gd);
    // RO: resumen/graficas solo consulta. Oculta botones de foto, aunque por si aparecen hay bloqueo por captura.
    if(ro){
      document.querySelectorAll('#summaryTiendaTicket .ticket-actions button,#summaryTiendaTicket input[type="file"],#summaryTiendaTicket .ce-photo-btn-v202,#summaryTiendaTicket [data-ce-delete-img]').forEach(el=>{el.style.setProperty('display','none','important');});
    }
    ensureRoInfo();
    switchToAllowedForRO();
  }
  function block(msg,ev){try{ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();}catch(_){ } if(msg) alert(msg); return false;}
  document.addEventListener('click',function(evnt){
    const t=evnt.target; if(!t||!t.closest)return;
    const blockedRWorRO=t.closest('#btnOpenImport,#btnExportSeed,#btnStartImport,#importWorkbookFile,#importTicketFiles,#ceBackupOkV181,.mobile-menu-action[data-target="btnOpenImport"],.mobile-menu-action[data-target="btnExportSeed"]');
    if(blockedRWorRO && (isRO()||isRW())) return block((isRO()?'Usuario RO':'Usuario RW')+': no autorizado para carga ni descarga de datos.',evnt);
    const access=t.closest('#mtAccesoBtn,.mobile-menu-action[data-target="mtAccesoBtn"],[data-action="open-acceso"],[data-action="save-acceso"],[data-action="delete-acceso"],#btnAddAcceso,#newAccesoIdentificacion,#newAccesoClave,#newAccesoNivel');
    if(access && !isGD()) return block('No autorizado: el mantenimiento de ACCESOS solo está disponible para usuarios GD.',evnt);
    if(isRO()){
      const deniedTab=t.closest('#tabIngresosBtn,#tabDonacionesBtn,#tabComprasBtn,#btnToggleMaintenance,.mobile-menu-action[data-target="tabIngresosBtn"],.mobile-menu-action[data-target="tabDonacionesBtn"],.mobile-menu-action[data-target="tabComprasBtn"],.mobile-menu-action[data-target="btnToggleMaintenance"]');
      if(deniedTab) return block('Usuario RO: solo consulta de Resumen, Cálculos por agrupación, Gráficas y Excel INFOEVENTO si el evento está finalizado.',evnt);
      const excel=t.closest('#btnExportExcel,.mobile-menu-action[data-target="btnExportExcel"]');
      if(excel && !isFinalized()) return block('Usuario RO: solo puede descargar INFOEVENTO cuando el evento está Finalizado.',evnt);
      const photo=t.closest('#summaryTiendaTicket .ticket-actions button,#summaryTiendaTicket input[type="file"],#summaryTiendaTicket .ce-photo-btn-v202,#summaryTiendaTicket [data-ce-delete-img],button[onclick*="uploadTicketImage"],button[onclick*="removeTicketImage"]');
      if(photo) return block('Usuario RO: modo consulta. No puede añadir ni eliminar fotos.',evnt);
    }
  },true);
  document.addEventListener('change',function(evnt){
    const t=evnt.target; if(!t||!t.closest)return;
    if((isRO()||isRW()) && t.closest('#importWorkbookFile,#importTicketFiles')) return block((isRO()?'Usuario RO':'Usuario RW')+': no autorizado para carga de datos.',evnt);
    if(isRO() && t.closest('#summaryTiendaTicket input[type="file"],input.ticket-file-input')) return block('Usuario RO: modo consulta. No puede añadir fotos.',evnt);
  },true);
  function guardPhotoFns(){
    ['uploadTicketImage','removeTicketImage','uploadTicketImageV164','removeTicketImageV164','uploadTicketImageV202','removeTicketImageV202'].forEach(name=>{
      try{const fn=window[name]; if(typeof fn==='function' && !fn.__v228Guard){const wrapped=function(){if(isRO()){alert('Usuario RO: modo consulta. No puede añadir ni eliminar fotos.'); return false;} return fn.apply(this,arguments);}; wrapped.__v228Guard=true; window[name]=wrapped;}}catch(_){ }
    });
  }
  function refreshVersion(){
    try{document.title=VERSION;}catch(_){ }
    try{document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||'')) el.textContent=VERSION;});}catch(_){ }
    try{const proto=HTMLAnchorElement.prototype; if(!proto.click.__v228Wrapped){const prev=proto.click; const w=function(){try{if(this.download)this.download=String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig,VERSION_FILE);}catch(_){ } return prev.apply(this,arguments);}; w.__v228Wrapped=true; proto.click=w;}}catch(_){ }
  }
  function applyAll(){refreshVersion(); guardPhotoFns(); applyRoleVisibility();}
  const oldRender=typeof render==='function'?render:null;
  if(oldRender && !oldRender.__v228RoleWrapped){
    const wrapped=function(){const r=oldRender.apply(this,arguments); setTimeout(applyAll,30); setTimeout(applyAll,300); return r;};
    wrapped.__v228RoleWrapped=true; render=wrapped; window.render=render;
  }
  ['DOMContentLoaded','load'].forEach(evt=>window.addEventListener(evt,()=>{setTimeout(applyAll,50);setTimeout(applyAll,500);},false));
  setInterval(applyAll,1800);
  applyAll();
})();
