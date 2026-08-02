/* ControlEvent v25_prod FIX9.1.2 · Cuadre Banco: histórico completo, franja del evento, zoom y visor de justificantes. */
(function(root){
  'use strict';
  if(root.__ceV24BankReconciliation) return;
  root.__ceV24BankReconciliation = true;

  const VERSION = 'v25_prod';
  const $ = id => document.getElementById(id);
  const text = value => value == null ? '' : String(value).trim();
  const arr = value => Array.isArray(value) ? value : [];
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const num = value => { const n=Number(value); return Number.isFinite(n)?n:0; };
  const money = value => num(value).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
  const cssEscape = value => root.CSS?.escape ? root.CSS.escape(String(value)) : String(value).replace(/[\"']/g,'\\$&');
  const auth = () => root.ControlEventApp?.authUser || root.authUser || root.__CONTROL_EVENT_USER__ || {};
  const state = () => root.ControlEventApp?.state || root.appState || root.__CONTROL_EVENT_STATE__ || {};
  const level = () => text(auth()?.nivel || auth()?.Nivel).toUpperCase();
  function selectedEventSnapshot(){
    const id=activeEventId();
    const currentState=state()||{};
    const events=arr(currentState.eventos||currentState.events||currentState.eventList);
    let event=events.find(item=>text(item?.id||item?.ID)===id)||null;
    if(!event&&typeof root.selectedEvent==='function'){
      try{event=root.selectedEvent()||null;}catch(_){event=null;}
    }
    return event||{};
  }
  function selectedEventFinalized(){
    const event=selectedEventSnapshot();
    const status=text(event.situacion||event.estado||event.status||event.SITUACION||event.ESTADO).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
    if(status) return status==='FINALIZADO';
    return document.body.classList.contains('ce-event-finalized');
  }
  const hasBankRole = () => ['GD','RW'].includes(level()) || (level()==='RO'&&selectedEventFinalized());
  const activeEventId = () => text($('selectedEvent')?.value || state().selectedEventId || state().eventoSeleccionadoId || root.selectedEventId);
  const actor = () => {
    const user=auth()||{};
    return {nivel:level(),identificacion:text(user.identificacion||user.Identificacion),nombre:text(user.nombre||user.Nombre)};
  };
  const actorHeader = () => encodeURIComponent(JSON.stringify(actor()));
  const store = {
    loading:false, importing:false, refreshing:false, data:null, eventId:'', accountId:'', filter:'TODOS', search:'',
    ticketMovement:null, tickets:[], ticketOriginalLinks:[], incomeMovement:null, incomes:[], openGestureAt:0, lastAction:'', lastActionAt:0, readOnly:false,
    lastBodyScroll:0, pendingFocusId:'', noticeLocked:false, sort:'DESC', dateFrom:'', dateTo:'',
    page:1, pageSize:60, dataRevision:0, filteredCacheKey:'', filteredCacheRows:[], searchTimer:0, renderFrame:0,
    loadSeq:0, loadController:null, totalPages:1, balanceChartOpen:false
  };
  const TIP_ATTRS = ['title','data-ce-tip-v21','data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip','data-v181-tip','data-tip','data-ce-tip-layout-v21','data-tip-bg-v21'];

  async function api(path, options={}){
    const response=await fetch(path,{cache:'no-store',...options,headers:{'Content-Type':'application/json','X-ControlEvent-Feature':'cuadre-banco-v24-periodo-evento','X-ControlEvent-Actor':actorHeader(),...(options.headers||{})}});
    let payload={};
    try{ payload=await response.json(); }catch(_){ payload={}; }
    if(!response.ok){
      const fallback=response.status===413?'El CSV es demasiado grande para enviarlo de una sola vez. Descarga periodos más cortos del banco e impórtalos consecutivamente.':`Error ${response.status} en Cuadre Banco`;
      const error=new Error(payload?.error||fallback);
      error.status=response.status; error.code=payload?.code||''; throw error;
    }
    return payload;
  }
  function formatDate(value, includeTime=true){
    const raw=text(value).replace('T',' ');
    const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/);
    if(!m) return raw||'—';
    return `${m[3]}/${m[2]}/${m[1]}${includeTime&&m[4]?` ${m[4]}:${m[5]}`:''}`;
  }
  function statusInfo(row){
    if(row.justificationStatus==='CUADRADO_FORZADO') return {className:'forced',label:'Cuadrado de forma forzada'};
    if(row.justificationStatus==='CUADRADO') return {className:'ok',label:'Cuadrado'};
    if(row.justificationStatus==='PENDIENTE') return {className:'pending',label:`Faltan ${money(Math.max(0,row.difference))}`};
    if(row.justificationStatus==='EXCESO') return {className:'excess',label:`Exceso ${money(Math.abs(row.difference))}`};
    if(row.justificationStatus==='SIN_JUSTIFICAR') return {className:'none',label:'Sin justificar'};
    if(row.justificationStatus==='OTRO_EVENTO'){
      const events=arr(row.foreignEvents).join(', ')||'otro evento';
      const state=row.foreignJustificationStatus==='CUADRADO_FORZADO'?'Cuadre forzado':(row.foreignJustificationStatus==='CUADRADO'?'Cuadrado':'Conciliado');
      return {className:'other-event',label:`${state} en ${events}`};
    }
    return {className:'na',label:'Ingreso / abono'};
  }
  function trafficInfo(summary={}){
    if(summary.traffic==='GREEN') return {className:'green',label:'Todos los TKxx justificados'};
    if(summary.traffic==='ORANGE') return {className:'orange',label:'Justificación parcial'};
    return {className:'red',label:'Justificación insuficiente'};
  }
  function incomeTrafficInfo(summary={}){
    if(summary.traffic==='GREEN') return {className:'green',label:'Ingresos conciliados'};
    if(summary.traffic==='ORANGE') return {className:'orange',label:'Conciliación parcial'};
    return {className:'red',label:'Ingresos pendientes'};
  }
  function incomeStatusInfo(row){
    const status=text(row?.incomeJustificationStatus);
    if(status==='CUADRADO') return {className:'ok',label:'Cuadrado'};
    if(status==='PENDIENTE') return {className:'pending',label:`Faltan ${money(Math.max(0,row.incomeDifference))}`};
    if(status==='EXCESO') return {className:'excess',label:`Exceso ${money(Math.abs(num(row.incomeDifference)))}`};
    if(status==='FUERA_SALDO') return {className:'na',label:'Fuera del saldo'};
    return {className:'none',label:'Sin justificar'};
  }
  function purgeTooltip(node){
    if(!node) return;
    [node,...Array.from(node.querySelectorAll?.('*')||[])].forEach(el=>TIP_ATTRS.forEach(attr=>{try{el.removeAttribute(attr);}catch(_){}}));
    ['ceTooltipV21','ceTooltipV196','ceTooltipV1952','ceTooltipV190','ceTooltipV181'].forEach(id=>{const tip=$(id);if(tip)tip.style.display='none';});
  }
  function prepareEntry(node){
    if(!node) return;
    purgeTooltip(node);
    node.classList.add('ce-bank-entry');
    node.setAttribute('aria-label','Abrir Cuadre Banco');
    node.setAttribute('aria-controls','ceBankOverlay');
    node.setAttribute('data-ce-no-tooltip','1');
    node.onclick = function(event){ return root.ceOpenCuadreBanco ? root.ceOpenCuadreBanco(event) : false; };
  }
  function stopEvent(event){
    try{ event?.preventDefault?.(); event?.stopPropagation?.(); event?.stopImmediatePropagation?.(); }catch(_){ }
  }
  function actionAllowed(key,wait=420){
    const now=Date.now();
    if(store.lastAction===key && now-store.lastActionAt<wait) return false;
    store.lastAction=key; store.lastActionAt=now; return true;
  }
  function ensureInteractive(){
    const overlay=$('ceBankOverlay'); if(!overlay) return;
    const selectors=['.ce-bank-window','.ce-bank-command-deck','.ce-bank-command-primary','.ce-bank-command-fields','.ce-bank-period-deck','#ceBankClose','#ceBankImport','#ceBankRefresh','#ceBankAccount','#ceBankFilter','#ceBankSort','#ceBankSearch','#ceBankDateFrom','#ceBankDateTo','#ceBankApplyPeriod','#ceBankPrevPage','#ceBankNextPage'];
    [overlay,...selectors.map(selector=>overlay.querySelector(selector))].filter(Boolean).forEach(node=>{
      try{ node.style.setProperty('pointer-events','auto','important'); node.style.setProperty('touch-action','manipulation','important'); }catch(_){ }
    });
    const command=overlay.querySelector('.ce-bank-command-deck');
    if(command){
      command.style.setProperty('position','relative','important');
      command.style.setProperty('z-index','40','important');
      command.style.setProperty('isolation','isolate','important');
    }
    // Los tooltips heredados no pueden quedar como una lámina transparente encima de
    // la botonera bancaria.
    ['ceTooltipV21','ceTooltipV196','ceTooltipV1952','ceTooltipV190','ceTooltipV181','ceBudgetLiteTooltipV307'].forEach(id=>{
      const tip=$(id); if(tip&&!tip.contains(document.activeElement)){try{tip.style.pointerEvents='none';}catch(_){}}
    });
  }
  function mutationBlocked(message='Este evento está Finalizado. Cuadre Banco está disponible en modo de solo lectura.'){
    if(!store.readOnly) return false;
    notice(message,'warning',true);
    return true;
  }
  function installDom(){
    let desktop=$('btnOpenBankReconciliation');
    if(!desktop){
      const footer=document.querySelector('.footer .footer-inner');
      const maintenance=$('btnToggleMaintenance');
      if(footer){
        desktop=document.createElement('button');
        desktop.type='button'; desktop.id='btnOpenBankReconciliation'; desktop.className='iconbtn outline ce-bank-entry hidden';
        desktop.innerHTML='<img class="footer-img" alt="Cuadre Banco" src="./assets/icons/cuadre-banco.svg">';
        footer.insertBefore(desktop,maintenance||null);
      }
    }
    prepareEntry(desktop);
    if(!$('ceBankOverlay')){
      const overlay=document.createElement('div');
      overlay.id='ceBankOverlay'; overlay.className='ce-bank-overlay hidden';
      overlay.innerHTML=`<section class="ce-bank-window" role="dialog" aria-modal="true" aria-labelledby="ceBankTitle">
        <div class="ce-bank-ambient" aria-hidden="true"><span></span><span></span><span></span></div>
        <header class="ce-bank-header">
          <div class="ce-bank-brand-orbit"><img src="./assets/icons/cuadre-banco.svg" alt=""><i></i></div>
          <div class="ce-bank-title-block">
            <div class="ce-bank-eyebrow"><span>CONTROL FINANCIERO</span><b><i></i> CONCILIACIÓN POR EVENTO</b></div>
            <h2 id="ceBankTitle">Cuadre Banco</h2>
          </div>
          <div class="ce-bank-header-event-center">
            <div id="ceBankEventHeadline" class="ce-bank-event-headline"><strong>Selecciona un evento</strong></div>
            <p id="ceBankEventPeriod">Periodo bancario pendiente</p>
          </div>
          <div class="ce-bank-traffic-group">
            <div id="ceBankTraffic" class="ce-bank-traffic red"><span class="ce-bank-traffic-light"><i></i><i></i><i></i></span><div><b>0 / 0 TKxx</b><small>Sin datos</small></div></div>
            <div id="ceBankIncomeTraffic" class="ce-bank-traffic ce-bank-income-traffic red"><span class="ce-bank-traffic-light"><i></i><i></i><i></i></span><div><b>0 / 0 ingresos</b><small>Sin datos</small></div></div>
          </div>
          <button type="button" id="ceBankClose" class="ce-bank-close" aria-label="Cerrar Cuadre Banco"><span>×</span></button>
        </header>
        <div id="ceBankReadOnly" class="ce-bank-readonly hidden"><b>EVENTO FINALIZADO</b><span>Consulta completa disponible; altas, bajas y cambios están bloqueados.</span></div>
        <div class="ce-bank-command-deck">
          <div class="ce-bank-command-primary">
            <label id="ceBankImport" class="ce-bank-import-btn" role="button" tabindex="0" aria-label="Cargar CSV bancario"><span>↑</span><b>Cargar CSV</b><small>Añade solo movimientos nuevos</small><input id="ceBankCsvFile" class="ce-bank-file-native" type="file" accept=".csv,text/csv,.txt" aria-label="Seleccionar CSV bancario"></label>
            <button type="button" id="ceBankRefresh" class="ce-bank-refresh-btn" aria-label="Volver a leer los movimientos y conciliaciones del servidor" title="Recarga desde el servidor los movimientos y asociaciones"><span>↻</span><b>Recargar datos</b></button>
          </div>
          <div class="ce-bank-command-fields">
            <label><span>Cuenta bancaria</span><select id="ceBankAccount"></select></label>
            <label><span>Vista de control</span><select id="ceBankFilter"><option value="TODOS">Todos los movimientos</option><option value="INCLUIDOS">Incluidos en saldo</option><option value="EXCLUIDOS">Fuera del saldo</option><option value="PENDIENTES">Pendientes de justificar</option><option value="CUADRADOS">Cuadrados</option><option value="FORZADOS">Cuadrados forzados</option></select></label>
            <label><span>Orden temporal</span><select id="ceBankSort"><option value="DESC">Más joven → más antiguo</option><option value="ASC">Más antiguo → más joven</option></select></label>
            <label class="ce-bank-search"><span>Buscar movimiento</span><div><i>⌕</i><input id="ceBankSearch" autocomplete="off" placeholder="Fecha, concepto, importe, saldo o TKxx"></div></label>
          </div>
        </div>
        <div class="ce-bank-period-deck">
          <div id="ceBankSummary" class="ce-bank-summary"></div>
          <div class="ce-bank-period-fields">
            <label><span>Fecha inicio bancaria</span><input id="ceBankDateFrom" type="date"></label>
            <label><span>Fecha final bancaria</span><input id="ceBankDateTo" type="date"></label>
            <button type="button" id="ceBankApplyPeriod"><span>✓</span><b>Aplicar fechas</b></button>
          </div>
        </div>
        <div id="ceBankNotice" class="ce-bank-notice hidden"></div>
        <div class="ce-bank-ledger-caption"><b>Movimientos bancarios</b><b>TICKETS DE COMPRA O DE INGRESO JUSTIFICANTES DEL MVTO BANCARIO</b></div>
        <div class="ce-bank-resultbar"><span id="ceBankResultCount">Preparando movimientos…</span><div><button type="button" id="ceBankPrevPage" aria-label="Página anterior">‹</button><b id="ceBankPageLabel">Página 1 de 1</b><button type="button" id="ceBankNextPage" aria-label="Página siguiente">›</button></div></div>
        <main id="ceBankBody" class="ce-bank-body" tabindex="0" aria-label="Movimientos bancarios del evento"></main>
        <div id="ceBankBalanceChartOverlay" class="ce-bank-balance-chart-overlay hidden" aria-hidden="true"></div>
        <div id="ceBankTicketModal" class="ce-bank-ticket-overlay hidden"></div>
      </section>`;
      document.body.appendChild(overlay);
      bindInterfaceControls(overlay);
    }
    installCommandFirewall();
    installCommandCapture();
    ensureInteractive();
    wireCommandControls();
    installMobileEntry();
    document.querySelectorAll('.ce-bank-entry').forEach(prepareEntry);
    applyRole();
  }
  function installMobileEntry(){
    const drawer=$('ceMobileDrawer');
    if(!drawer) return;
    let btn=drawer.querySelector('[data-ce-open-bank="1"]');
    if(!btn){
      const grids=Array.from(drawer.querySelectorAll('.mobile-menu-grid'));
      const tools=grids.find(grid=>grid.querySelector('[data-target="btnExportExcel"],[data-target="btnExportSeed"],[data-target="btnOpenImport"]')) || grids[1] || grids[0];
      if(!tools) return;
      btn=document.createElement('button');
      btn.type='button'; btn.className='mobile-menu-action ce-bank-entry hidden'; btn.dataset.ceOpenBank='1'; btn.innerHTML='<span class="mi">🏦</span>Cuadre Banco';
      tools.appendChild(btn);
    }
    prepareEntry(btn);
  }
  function installCommandFirewall(){
    // FIX3: no se interceptan eventos en window/capture. El cortafuegos anterior detenía
    // pointerdown antes de que select, input y el selector de ficheros alcanzaran su destino,
    // por eso solo parecían responder los calendarios. Los controles se gestionan directamente
    // en el diálogo y pueden usar de nuevo su comportamiento nativo.
    if(root.__ceBankCommandFirewallInstalled) return;
    root.__ceBankCommandFirewallInstalled=true;
  }

  function applyCommandValue(target){
    if(!target) return;
    if(target.id==='ceBankAccount'){
      const next=text(target.value)||'TODOS';
      if(store.accountId===next) return;
      store.accountId=next; store.page=1; invalidateMovementCache();
      load({force:true}).then(focusBody);
      return;
    }
    if(target.id==='ceBankFilter'){
      const next=text(target.value)||'TODOS';
      // En un evento finalizado solo se muestran los movimientos elegidos En saldo.
      store.filter=store.readOnly?'INCLUIDOS':next;
      target.value=store.filter; store.page=1; invalidateMovementCache(); scheduleBodyRender(true);
      return;
    }
    if(target.id==='ceBankSort'){
      store.sort=target.value==='ASC'?'ASC':'DESC'; store.page=1; invalidateMovementCache(); scheduleBodyRender(true);
      return;
    }
    if(target.id==='ceBankSearch'){
      store.search=target.value||''; store.page=1; invalidateMovementCache();
      clearTimeout(store.searchTimer);
      store.searchTimer=setTimeout(()=>scheduleBodyRender(false),140);
    }
  }
  function wireCommandControls(){
    const account=$('ceBankAccount'), filter=$('ceBankFilter'), sort=$('ceBankSort'), search=$('ceBankSearch');
    [account,sort,search].filter(Boolean).forEach(node=>{
      node.disabled=false; node.removeAttribute('disabled'); node.setAttribute('aria-disabled','false');
      if(node===search){node.readOnly=false;node.removeAttribute('readonly');node.tabIndex=0;}
    });
    if(filter){
      filter.disabled=!!store.readOnly;
      filter.setAttribute('aria-disabled',store.readOnly?'true':'false');
      filter.value=store.readOnly?'INCLUIDOS':store.filter;
    }
    if(account){account.onchange=event=>applyCommandValue(event.currentTarget||event.target);}
    if(filter){filter.onchange=event=>applyCommandValue(event.currentTarget||event.target);}
    if(sort){sort.onchange=event=>applyCommandValue(event.currentTarget||event.target);}
    if(search){
      search.oninput=event=>applyCommandValue(event.currentTarget||event.target);
      search.onsearch=event=>applyCommandValue(event.currentTarget||event.target);
    }
    const refresh=$('ceBankRefresh');
    if(refresh){
      refresh.disabled=!!store.refreshing;
      refresh.setAttribute('aria-busy',store.refreshing?'true':'false');
    }
  }
  function installCommandCapture(){
    if(root.__ceBankCommandCaptureInstalled) return;
    root.__ceBankCommandCaptureInstalled=true;
    // Se ejecuta en window antes que los manejadores heredados de ControlEvent.
    // De esta forma un render o una captura antigua no puede anular select/búsqueda.
    root.addEventListener('pointerdown',event=>{
      const target=event.target;
      if(!$('ceBankOverlay')||$('ceBankOverlay').classList.contains('hidden')) return;
      if(target?.id==='ceBankSearch'){
        try{target.focus({preventScroll:true});}catch(_){try{target.focus();}catch(__){}}
        return;
      }
      if(target?.matches?.('#ceBankAccount,#ceBankFilter,#ceBankSort')){
        if(target.disabled) return;
        try{target.focus({preventScroll:true});}catch(_){try{target.focus();}catch(__){}}
      }
    },true);
    root.addEventListener('change',event=>{
      if(event.target?.matches?.('#ceBankAccount,#ceBankFilter,#ceBankSort')) applyCommandValue(event.target);
    },true);
    root.addEventListener('input',event=>{
      if(event.target?.id==='ceBankSearch') applyCommandValue(event.target);
    },true);
    root.addEventListener('click',event=>{
      const refresh=event.target?.closest?.('#ceBankRefresh');
      if(!refresh||!$('ceBankOverlay')||$('ceBankOverlay').classList.contains('hidden')) return;
      stopEvent(event);
      refreshBankData();
    },true);
  }

  function bindInterfaceControls(overlay){
    if(!overlay || overlay.dataset.ceBankBound==='1') return;
    overlay.dataset.ceBankBound='1';
    const closeButton=$('ceBankClose');
    const hardClose=event=>{stopEvent(event);close(true);};
    closeButton?.addEventListener('pointerup',hardClose,true);
    closeButton?.addEventListener('click',hardClose,true);
    closeButton?.addEventListener('touchend',hardClose,{capture:true,passive:false});
    $('ceBankCsvFile')?.addEventListener('change',importCsv);
    $('ceBankImport')?.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&!store.readOnly&&!store.importing){event.preventDefault();$('ceBankCsvFile')?.click();}});
    wireCommandControls();
    $('ceBankPrevPage')?.addEventListener('click',event=>{stopEvent(event);changePage(store.page-1);});
    $('ceBankNextPage')?.addEventListener('click',event=>{stopEvent(event);changePage(store.page+1);});
    $('ceBankApplyPeriod')?.addEventListener('click',event=>{stopEvent(event);if(actionAllowed('period',350))savePeriod();});
    ['ceBankDateFrom','ceBankDateTo'].forEach(id=>$(id)?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();savePeriod();}}));
    overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
  }
  function applyRole(){
    const show=hasBankRole();
    document.querySelectorAll('.ce-bank-entry').forEach(node=>{
      node.classList.toggle('hidden',!show); node.style.display=show?'':'none'; node.disabled=!show; node.setAttribute('aria-hidden',show?'false':'true');
    });
    if(!show && !$('ceBankOverlay')?.classList.contains('hidden')) close();
  }
  function notice(message,type='',lock=false){
    const node=$('ceBankNotice'); if(!node) return;
    if(!message && store.noticeLocked) return;
    store.noticeLocked=!!(message&&lock);
    node.textContent=message||'';
    node.className=`ce-bank-notice${message?'':' hidden'}${type?` ${type}`:''}`;
  }
  function invalidateMovementCache(){
    store.filteredCacheKey=''; store.filteredCacheRows=[];
  }
  function scheduleBodyRender(focusAfter=false){
    if(store.renderFrame) cancelAnimationFrame(store.renderFrame);
    store.renderFrame=requestAnimationFrame(()=>{
      store.renderFrame=0;
      renderBody();
      if(focusAfter) focusBody();
    });
  }
  function clampPage(page,totalPages=store.totalPages){
    const max=Math.max(1,Number(totalPages)||1);
    return Math.min(max,Math.max(1,Number(page)||1));
  }
  function changePage(page,{toEnd=false}={}){
    const next=clampPage(page);
    if(next===store.page && !toEnd) return;
    store.page=next;
    renderBody();
    const body=$('ceBankBody');
    if(body) body.scrollTop=toEnd?body.scrollHeight:0;
    focusBody();
  }
  function currentEventReady(){
    const id=activeEventId();
    if(!id){ alert('Selecciona un evento antes de abrir Cuadre Banco.'); return '';
    }
    return id;
  }
  async function open(){
    installDom();
    if(!hasBankRole()){ alert(level()==='RO'?'Los usuarios RO solo pueden consultar Cuadre Banco cuando el evento está Finalizado.':'Cuadre Banco no está disponible para este usuario.'); return false; }
    const eventId=currentEventReady(); if(!eventId) return false;
    if(store.eventId!==eventId){ store.eventId=eventId; store.accountId=''; store.filter='TODOS'; store.search=''; store.sort='DESC'; store.dateFrom=''; store.dateTo=''; store.page=1; store.data=null; invalidateMovementCache(); }
    const overlay=$('ceBankOverlay');
    ensureInteractive(); overlay.classList.remove('hidden');
    requestAnimationFrame(()=>{overlay.classList.add('visible');ensureInteractive();});
    document.body.classList.add('ce-bank-open'); document.body.style.overflow='hidden';
    await load({force:false});
    focusBody();
    return false;
  }
  function close(immediate=false){
    closeBalanceChart(true);
    closeBankTicketPhoto();
    const overlay=$('ceBankOverlay');
    overlay?.classList.remove('visible'); $('ceBankTicketModal')?.classList.add('hidden');
    if(immediate) overlay?.classList.add('hidden'); else setTimeout(()=>overlay?.classList.add('hidden'),160);
    document.body.classList.remove('ce-bank-open'); document.body.style.overflow='';
  }
  function queryString(force=false){
    const params=new URLSearchParams();
    params.set('eventId',store.eventId);
    if(store.accountId) params.set('accountId',store.accountId);
    if(force) params.set('_',Date.now());
    return params.toString();
  }
  async function load({force=false,preserveNotice=false,preserveMovementId='',preserveScroll=false}={}){
    const body=$('ceBankBody');
    if(preserveScroll&&body) store.lastBodyScroll=body.scrollTop;
    store.pendingFocusId=preserveMovementId||'';
    const seq=++store.loadSeq;
    try{ store.loadController?.abort?.(); }catch(_){ }
    const controller=typeof AbortController!=='undefined'?new AbortController():null;
    store.loadController=controller;
    store.loading=true;
    $('ceBankOverlay')?.classList.add('ce-bank-loading-data');
    if(!preserveNotice){store.noticeLocked=false;notice('');}
    if(!store.data && !preserveMovementId && body) body.innerHTML='<div class="ce-bank-empty"><span class="ce-bank-loader"></span><strong>Sincronizando la cronología del evento…</strong><span>Los controles superiores continúan disponibles.</span></div>';
    try{
      const data=await api(`/api/bank-reconciliation?${queryString(force)}`,controller?{signal:controller.signal}:{});
      if(seq!==store.loadSeq) return;
      store.data=data;
      store.dataRevision+=1;
      invalidateMovementCache();
      store.accountId=data.selectedAccount||store.accountId;
      store.readOnly=data.readOnly===true;
      if(store.readOnly && store.filter==='TODOS') store.filter='INCLUIDOS';
      store.dateFrom=text(data?.period?.dateFrom); store.dateTo=text(data?.period?.dateTo);
      render();
      requestAnimationFrame(()=>restorePosition(preserveMovementId,preserveScroll));
    }catch(error){
      if(error?.name==='AbortError'||seq!==store.loadSeq) return;
      if(!store.data){
        $('ceBankSummary').innerHTML='';
        if(body) body.innerHTML=`<div class="ce-bank-empty error"><strong>No se pudo abrir Cuadre Banco.</strong><span>${esc(error.message)}</span></div>`;
      }
      notice(error.message,'error',true);
      if(error.code==='BANK_SCHEMA_MISSING') notice('Ejecuta en Supabase el fichero ControlEvent_SQL_V24_PROD_CUADRE_BANCO.sql actualizado.','warning',true);
    }finally{
      if(seq===store.loadSeq){
        store.loading=false;
        store.loadController=null;
        $('ceBankOverlay')?.classList.remove('ce-bank-loading-data');
      }
    }
  }
  function restorePosition(movementId,preserveScroll){
    const body=$('ceBankBody'); if(!body) return;
    if(movementId){
      let row=body.querySelector(`[data-movement-id="${cssEscape(movementId)}"]`);
      if(!row && (store.filter!=='TODOS'||text(store.search))){
        store.filter='TODOS'; store.search=''; store.page=1; invalidateMovementCache();
        if($('ceBankFilter')) $('ceBankFilter').value='TODOS';
        if($('ceBankSearch')) $('ceBankSearch').value='';
        renderBody();
        row=body.querySelector(`[data-movement-id="${cssEscape(movementId)}"]`);
      }
      if(!row){
        const rows=filteredMovements();
        const index=rows.findIndex(item=>String(item.id)===String(movementId));
        if(index>=0){
          store.page=Math.floor(index/store.pageSize)+1;
          renderBody();
          row=body.querySelector(`[data-movement-id="${cssEscape(movementId)}"]`);
        }
      }
      if(row){ row.scrollIntoView({block:'center',behavior:'auto'}); row.classList.add('ce-bank-returned'); setTimeout(()=>row.classList.remove('ce-bank-returned'),1800); }
      store.pendingFocusId='';
    }else{
      store.pendingFocusId='';
      if(preserveScroll) body.scrollTop=store.lastBodyScroll;
    }
  }
  function render(){
    const data=store.data||{accounts:[],movements:[],summary:{},event:{},ticketSummary:{},period:{}};
    const account=$('ceBankAccount');
    const accountOptions=['<option value="TODOS">Todas las cuentas</option>',...arr(data.accounts).map(item=>`<option value="${esc(item.id)}">${esc(item.label||item.id)}</option>`)].join('');
    account.innerHTML=accountOptions||'<option value="">Sin movimientos</option>';
    account.value=store.accountId||'TODOS';
    $('ceBankFilter').value=store.filter;
    $('ceBankSort').value=store.sort;
    $('ceBankSearch').value=store.search;
    $('ceBankDateFrom').value=store.dateFrom;
    $('ceBankDateTo').value=store.dateTo;
    const s=data.summary||{}; const event=data.event||{}; const tickets=data.ticketSummary||{}; const incomes=data.incomeSummary||{}; const period=data.period||{}; const traffic=trafficInfo(tickets); const incomeTraffic=incomeTrafficInfo(incomes);
    const finalClass=num(s.calculatedBalance)<0?'negative':'positive';
    const variationClass=num(s.eventVariation)<0?'negative':'positive';
    const headline=$('ceBankEventHeadline');
    headline.className=`ce-bank-event-headline ${event.finalized?'finalized':'in-progress'}`;
    headline.innerHTML=`<strong>${esc(event.title||'Evento')}</strong><span>${esc(event.status||'En curso')}</span>`;
    $('ceBankEventPeriod').textContent=`Periodo bancario: ${formatDate(store.dateFrom,false)} — ${formatDate(store.dateTo,false)} · fechas inclusivas`;
    const trafficNode=$('ceBankTraffic');
    trafficNode.className=`ce-bank-traffic ${traffic.className}`;
    trafficNode.innerHTML=`<span class="ce-bank-traffic-light"><i></i><i></i><i></i></span><div><b>${num(tickets.linked)} / ${num(tickets.total)} TKxx</b><small>${esc(traffic.label)} · ${num(tickets.percentage)}%</small></div>`;
    const incomeTrafficNode=$('ceBankIncomeTraffic');
    if(incomeTrafficNode){
      incomeTrafficNode.className=`ce-bank-traffic ce-bank-income-traffic ${incomeTraffic.className}`;
      incomeTrafficNode.innerHTML=`<span class="ce-bank-traffic-light"><i></i><i></i><i></i></span><div><b>${num(incomes.reconciled)} / ${num(incomes.total)} ingresos</b><small>${esc(incomeTraffic.label)} · ${num(incomes.percentage)}%</small></div>`;
    }
    $('ceBankReadOnly').classList.toggle('hidden',!store.readOnly);
    $('ceBankOverlay')?.classList.toggle('ce-bank-readonly-mode',store.readOnly);
    if(store.readOnly){store.filter='INCLUIDOS';if($('ceBankFilter'))$('ceBankFilter').value='INCLUIDOS';}
    wireCommandControls();
    const importButton=$('ceBankImport'); const importInput=$('ceBankCsvFile'); const importDisabled=(store.readOnly===true)||store.importing; if(importInput) importInput.disabled=importDisabled; if(importButton){importButton.setAttribute('aria-disabled',importDisabled?'true':'false');importButton.classList.toggle('disabled',importDisabled);importButton.classList.toggle('busy',store.importing);importButton.tabIndex=importDisabled?-1:0;}
    ['ceBankDateFrom','ceBankDateTo','ceBankApplyPeriod'].forEach(id=>{const node=$(id);if(node){node.disabled=store.readOnly;node.setAttribute('aria-disabled',store.readOnly?'true':'false');}});
    const bankIncome=num(s.income);
    const cashIncome=num(s.cashIncome);
    const economicVariation=Number.isFinite(Number(s.economicVariation))?num(s.economicVariation):bankIncome+cashIncome-num(s.expense);
    const flowMax=Math.max(Math.abs(bankIncome),Math.abs(cashIncome),Math.abs(num(s.expense)),1);
    const incomePct=Math.round(Math.abs(bankIncome)/flowMax*100);
    const cashIncomePct=Math.round(Math.abs(cashIncome)/flowMax*100);
    const expensePct=Math.round(Math.abs(num(s.expense))/flowMax*100);
    const objective=economicVariation>=0?'El evento deja más recursos que al comenzar':'El evento reduce los recursos de partida';
    $('ceBankSummary').innerHTML=`
      <article class="ce-bank-kpi ce-bank-kpi-opening"><span>Saldo bancario inicial del evento</span><strong>${money(s.openingBalance)}</strong><small>Saldo anterior al movimiento más antiguo del periodo</small><div class="ce-bank-kpi-formula">Saldo posterior − importe (en un cargo se suma su valor absoluto)</div></article>
      <article class="ce-bank-kpi ce-bank-kpi-hero ${finalClass}"><div class="ce-bank-kpi-copy"><span>Saldo final calculado del evento</span><strong>${money(s.calculatedBalance)}</strong><small>${num(s.includedCount)} movimientos aplicados · ${num(s.excludedCount)} inactivos</small></div></article>
      <article class="ce-bank-kpi ce-bank-kpi-flow ce-bank-kpi-chart-trigger" role="button" tabindex="0" data-ce-bank-open-balance-chart="1" aria-label="Ver gráfica temporal de la evolución del saldo"><span>Entradas y salidas incluidas</span><div class="ce-bank-flow-row income"><b>Abonos Banco</b><i><u style="width:${incomePct}%"></u></i><strong>${money(bankIncome)}</strong></div><div class="ce-bank-flow-row cash"><b>Abonos efectivo</b><i><u style="width:${cashIncomePct}%"></u></i><strong>${money(cashIncome)}</strong></div><div class="ce-bank-flow-row expense"><b>Cargos</b><i><u style="width:${expensePct}%"></u></i><strong>${money(s.expense)}</strong></div><small class="${economicVariation<0?'negative':'positive'}">Variación económica ${money(economicVariation)} · ${esc(objective)}</small><em class="ce-bank-chart-hint">Ver evolución temporal ↗</em></article>
      <article class="ce-bank-kpi ce-bank-kpi-bank"><span>Saldo certificado por el banco</span><strong>${money(s.latestBankBalance)}</strong><small>Último movimiento global ${formatDate(s.latestAt)}</small><div class="ce-bank-actual-period">Saldo real al final del periodo: <b>${money(s.actualClosingBalance)}</b></div></article>`;
    if(num(period.linkedOutsidePeriodCount)>0){
      notice(`Hay ${num(period.linkedOutsidePeriodCount)} movimiento(s) con TKxx asociados fuera del periodo bancario seleccionado. Amplía las fechas para revisarlos.`,'warning',false);
    }else if(tickets.allJustified){
      notice('');
    }else if(store.readOnly){
      notice('El evento está Finalizado: se permite consultar, buscar, filtrar y revisar asociaciones, pero no modificarlas.','warning',false);
    }else if(!store.noticeLocked){ notice(''); }
    renderBody();
    wireCommandControls();
    if(store.balanceChartOpen) renderBalanceChart();
  }
  function parseMoment(value){
    const raw=text(value);
    if(!raw) return 0;
    const parsed=Date.parse(raw.includes('T')?raw:raw.replace(' ','T'));
    return Number.isFinite(parsed)?parsed:0;
  }
  function balanceChartRows(){
    return arr(store.data?.balanceTimeline).filter(row=>parseMoment(row.executedAt)>0).sort((a,b)=>parseMoment(a.executedAt)-parseMoment(b.executedAt)||String(a.id).localeCompare(String(b.id)));
  }
  function buildBalanceSeries(){
    const rows=balanceChartRows();
    if(!rows.length) return [];
    const allAccounts=!store.accountId||store.accountId==='TODOS';
    if(!allAccounts){
      const first=rows[0];
      const opening=num(first.bankBalance)-num(first.amount);
      return [{time:parseMoment(first.executedAt)-1,balance:opening,opening:true},...rows.map(row=>({time:parseMoment(row.executedAt),balance:num(row.bankBalance),movement:row}))];
    }
    const grouped=new Map();
    for(const row of rows){
      const key=text(row.accountId)||'SIN_CUENTA';
      if(!grouped.has(key)) grouped.set(key,[]);
      grouped.get(key).push(row);
    }
    const balances=new Map();
    for(const [key,items] of grouped){
      const first=items[0];
      balances.set(key,num(first.bankBalance)-num(first.amount));
    }
    const total=()=>[...balances.values()].reduce((sum,value)=>sum+num(value),0);
    const series=[{time:parseMoment(rows[0].executedAt)-1,balance:total(),opening:true}];
    for(const row of rows){
      balances.set(text(row.accountId)||'SIN_CUENTA',num(row.bankBalance));
      series.push({time:parseMoment(row.executedAt),balance:total(),movement:row});
    }
    return series;
  }
  function chartAccountLabel(){
    if(!store.accountId||store.accountId==='TODOS') return 'Todas las cuentas';
    const account=arr(store.data?.accounts).find(item=>text(item.id)===text(store.accountId));
    return text(account?.label||account?.id||store.accountId);
  }
  function chartDate(value){
    const d=new Date(value);
    return Number.isFinite(d.getTime())?d.toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'}):'—';
  }
  function chartDateFull(value){
    const d=new Date(value);
    return Number.isFinite(d.getTime())?d.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';
  }
  function chartAmount(value){ return money(value); }
  function monthName(value){
    const date=new Date(value);
    if(!Number.isFinite(date.getTime())) return '—';
    const names=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${names[date.getMonth()]}-${String(date.getFullYear()).slice(-2)}`;
  }
  function monthlyTicks(minTime,maxTime){
    const start=new Date(minTime); const end=new Date(maxTime);
    if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())) return [];
    const cursor=new Date(start.getFullYear(),start.getMonth(),1,0,0,0,0);
    const last=new Date(end.getFullYear(),end.getMonth(),1,0,0,0,0);
    const ticks=[];
    while(cursor<=last){
      const raw=cursor.getTime();
      ticks.push({time:Math.max(minTime,Math.min(maxTime,raw)),label:monthName(raw)});
      cursor.setMonth(cursor.getMonth()+1);
    }
    const unique=[];
    for(const tick of ticks){
      if(!unique.some(item=>Math.abs(item.time-tick.time)<1000)) unique.push(tick);
    }
    return unique.length?unique:[{time:minTime,label:monthName(minTime)}];
  }
  function closeBalanceChart(){
    const overlay=$('ceBankBalanceChartOverlay');
    if(!overlay) return;
    store.balanceChartOpen=false;
    overlay.classList.remove('visible');
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden','true');
    overlay.querySelectorAll('.ce-bank-balance-hover-marker').forEach(node=>node.classList.add('hidden'));
  }
  function eventDisplayData(){
    const snapshot=selectedEventSnapshot();
    const current=store.data?.event||{};
    const title=text(current.title||current.descripcion||snapshot.descripcion||snapshot.titulo||snapshot.nombre||'Evento actual');
    const finalized=selectedEventFinalized();
    return {title,status:finalized?'Finalizado':'En curso',statusClass:finalized?'finalized':'active'};
  }
  function eventMediaData(eventId='',fallbackTitle=''){
    const targetId=text(eventId||store.eventId);
    if(!targetId||targetId===text(store.eventId)){
      const current=eventDisplayData();
      return {...current,title:text(fallbackTitle||current.title)};
    }
    const currentState=state()||{};
    const events=arr(currentState.eventos||currentState.events||currentState.eventList);
    const found=events.find(item=>text(item?.id||item?.ID)===targetId)||{};
    const title=text(fallbackTitle||found.descripcion||found.titulo||found.nombre||found.title||'Evento');
    const raw=text(found.situacion||found.estado||found.status||found.SITUACION||found.ESTADO).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
    const finalized=raw==='FINALIZADO';
    return {title,status:finalized?'Finalizado':'En curso',statusClass:finalized?'finalized':'active'};
  }
  function eventMediaHeader(info){
    const data=info||eventDisplayData();
    return `<div class="ce-bank-photo-event"><b>${esc(data.title||'Evento')}</b><span class="${esc(data.statusClass||'active')}">${esc(data.status||'En curso')}</span></div>`;
  }
  function chartDomain(values,padding=.08){
    let min=Math.min(...values),max=Math.max(...values);
    if(!Number.isFinite(min)||!Number.isFinite(max)) return {min:0,max:1};
    if(min===max){min-=1;max+=1;return {min,max};}
    const span=Math.max(1,max-min);
    return {min:min-span*padding,max:max+span*padding};
  }
  function chartPane(config){
    const {id,title,subtitle,status,statusClass,series,eventIds,minTime,maxTime,width,height,shadeStart,shadeEnd,shade,zoom,showEventPoints=true}=config;
    const left=64,right=20,top=18,bottom=48;
    const plotW=width-left-right,plotH=height-top-bottom;
    const safeMinTime=minTime===maxTime?minTime-43200000:minTime;
    const safeMaxTime=minTime===maxTime?maxTime+43200000:maxTime;
    const domain=chartDomain(series.map(point=>point.balance),zoom?.10:.07);
    const x=time=>left+(time-safeMinTime)/(safeMaxTime-safeMinTime)*plotW;
    const y=value=>top+(domain.max-value)/(domain.max-domain.min)*plotH;
    const path=series.map((point,index)=>`${index?'L':'M'} ${x(point.time).toFixed(2)} ${y(point.balance).toFixed(2)}`).join(' ');
    const yTicks=Array.from({length:zoom?4:5},(_,index)=>domain.max-(domain.max-domain.min)*index/(zoom?3:4));
    const yGrid=yTicks.map(value=>`<g><line x1="${left}" y1="${y(value).toFixed(2)}" x2="${left+plotW}" y2="${y(value).toFixed(2)}"></line><text x="${left-10}" y="${(y(value)+4).toFixed(2)}" text-anchor="end">${esc(money(value))}</text></g>`).join('');
    const xGrid=monthlyTicks(safeMinTime,safeMaxTime).map(tick=>`<g class="ce-bank-month-tick"><line x1="${x(tick.time).toFixed(2)}" y1="${top}" x2="${x(tick.time).toFixed(2)}" y2="${top+plotH}"></line><text x="${x(tick.time).toFixed(2)}" y="${top+plotH+24}" text-anchor="middle">${esc(tick.label)}</text></g>`).join('');
    const startEnd=`<g class="ce-bank-chart-range-labels"><text x="${left}" y="${top+plotH+42}" text-anchor="start">${esc(chartDateFull(safeMinTime))}</text><text x="${left+plotW}" y="${top+plotH+42}" text-anchor="end">${esc(chartDateFull(safeMaxTime))}</text></g>`;
    const highlight=shade&&Number.isFinite(shadeStart)&&Number.isFinite(shadeEnd)
      ?`<rect class="ce-bank-balance-highlight" x="${Math.max(left,x(Math.min(shadeStart,shadeEnd))).toFixed(2)}" y="${top}" width="${Math.max(6,Math.min(left+plotW,x(Math.max(shadeStart,shadeEnd)))-Math.max(left,x(Math.min(shadeStart,shadeEnd)))).toFixed(2)}" height="${plotH.toFixed(2)}"></rect>`:'';
    const movementPoints=series.filter(point=>point.movement);
    const eventPoints=showEventPoints?movementPoints.filter(point=>eventIds.has(String(point.movement.id))).map(point=>{
      const amount=num(point.movement.amount);
      return `<circle class="ce-bank-balance-event-point ${amount<0?'negative':'positive'}" cx="${x(point.time).toFixed(2)}" cy="${y(point.balance).toFixed(2)}" r="6.5" tabindex="0" role="button" data-ce-bank-balance-point="1" data-movement-id="${esc(point.movement.id)}" aria-label="${esc(formatDate(point.movement.executedAt))}, ${esc(money(amount))}"></circle>`;
    }).join(''):'';
    const statusHtml=status?`<span class="ce-bank-balance-pane-status ${esc(statusClass)}">${esc(status)}</span>`:'';
    const html=`<section class="ce-bank-balance-pane ${zoom?'zoom':''}" data-pane-id="${esc(id)}"><div class="ce-bank-balance-pane-head"><div><strong>${esc(title)}</strong><span>${esc(subtitle)}</span></div>${statusHtml}</div><div class="ce-bank-balance-plot"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}"><g class="ce-bank-balance-grid">${yGrid}${xGrid}${startEnd}</g>${highlight}<path class="ce-bank-balance-line subtle" d="${path}"></path><g>${eventPoints}</g><g class="ce-bank-balance-hover-marker hidden"><line x1="0" y1="${top}" x2="0" y2="${top+plotH}"></line><circle cx="0" cy="0" r="4.5"></circle></g></svg></div></section>`;
    return {html,meta:{id,width,height,left,right,top,bottom,points:movementPoints.map(point=>({cx:x(point.time),cy:y(point.balance),point}))}};
  }
  function resetBalanceInspector(){
    const inspector=$('ceBankBalanceInspector');
    if(!inspector) return;
    inspector.className='ce-bank-balance-inspector hidden-info';
    inspector.innerHTML='';
  }
  function updateBalanceInspector(point){
    const inspector=$('ceBankBalanceInspector');
    const movement=point?.movement;
    if(!inspector||!movement) return;
    const amount=num(movement.amount);
    inspector.className=`ce-bank-balance-inspector ${amount<0?'negative':'positive'}`;
    inspector.innerHTML=`<span>INFORMACIÓN DEL MOVIMIENTO</span><strong>${esc(formatDate(movement.executedAt))}</strong><div><b class="${amount<0?'negative':'positive'}">${esc(chartAmount(amount))}</b><em>Saldo ${esc(chartAmount(point.balance))}</em></div><small>${esc(movement.description||'Movimiento bancario')}</small>`;
  }
  function wireBalancePane(pane,meta){
    const svg=pane?.querySelector('svg');
    const marker=pane?.querySelector('.ce-bank-balance-hover-marker');
    if(!svg||!meta?.points?.length) return;
    const points=meta.points;
    const svgPosition=(clientX,clientY)=>{
      try{
        const point=svg.createSVGPoint();
        point.x=clientX; point.y=clientY;
        return point.matrixTransform(svg.getScreenCTM().inverse());
      }catch(_){
        const rect=svg.getBoundingClientRect();
        return {x:(clientX-rect.left)*(meta.width/rect.width),y:(clientY-rect.top)*(meta.height/rect.height)};
      }
    };
    const locate=(clientX,clientY)=>{
      const position=svgPosition(clientX,clientY);
      const target=Math.max(meta.left,Math.min(meta.width-meta.right,position.x));
      let low=0,high=points.length-1;
      while(low<high){const mid=Math.floor((low+high)/2);if(points[mid].cx<target)low=mid+1;else high=mid;}
      const right=points[low]; const leftPoint=points[Math.max(0,low-1)];
      const nearestPoint=!leftPoint||Math.abs(right.cx-target)<Math.abs(leftPoint.cx-target)?right:leftPoint;
      let curveY=nearestPoint.cy;
      if(leftPoint&&right&&right.cx!==leftPoint.cx&&target>=leftPoint.cx&&target<=right.cx){
        const ratio=(target-leftPoint.cx)/(right.cx-leftPoint.cx);
        curveY=leftPoint.cy+(right.cy-leftPoint.cy)*ratio;
      }
      return {item:nearestPoint,cursorX:target,curveY};
    };
    const show=(selection)=>{
      if(!selection?.item) return;
      updateBalanceInspector(selection.item.point);
      if(marker){
        marker.classList.remove('hidden');
        const line=marker.querySelector('line'); const dot=marker.querySelector('circle');
        line?.setAttribute('x1',selection.cursorX.toFixed(2)); line?.setAttribute('x2',selection.cursorX.toFixed(2));
        dot?.setAttribute('cx',selection.cursorX.toFixed(2)); dot?.setAttribute('cy',selection.curveY.toFixed(2));
      }
    };
    svg.addEventListener('pointermove',event=>show(locate(event.clientX,event.clientY)));
    svg.addEventListener('pointerleave',()=>{marker?.classList.add('hidden');resetBalanceInspector();});
    pane.querySelectorAll('[data-ce-bank-balance-point="1"]').forEach(circle=>{
      circle.addEventListener('click',event=>openBalanceMovementMedia(circle.dataset.movementId,event));
      circle.addEventListener('focus',()=>{
        const found=points.find(item=>String(item.point.movement?.id)===String(circle.dataset.movementId));
        if(found) show({item:found,cursorX:found.cx,curveY:found.cy});
      });
      circle.addEventListener('blur',()=>{marker?.classList.add('hidden');resetBalanceInspector();});
    });
  }
  function wireBalanceChartClose(overlay){
    const closeButton=overlay?.querySelector('[data-ce-bank-close-balance-chart]');
    if(!closeButton) return;
    const closeNow=event=>{stopEvent(event);closeBalanceChart();};
    closeButton.addEventListener('pointerdown',closeNow,true);
    closeButton.addEventListener('click',closeNow,true);
  }
  function renderBalanceChart(){
    const overlay=$('ceBankBalanceChartOverlay');
    if(!overlay) return;
    const series=buildBalanceSeries();
    const includedRows=arr(store.data?.movements).filter(row=>Boolean(row.included));
    const eventIds=new Set(includedRows.map(row=>String(row.id)));
    const accountLabel=chartAccountLabel();
    if(!series.length){
      overlay.innerHTML=`<section class="ce-bank-balance-chart-card" role="dialog" aria-modal="true" aria-labelledby="ceBankBalanceChartTitle"><header><div><span>EVOLUCIÓN TEMPORAL DEL SALDO</span><h3 id="ceBankBalanceChartTitle">${esc(accountLabel)}</h3></div><button type="button" data-ce-bank-close-balance-chart aria-label="Cerrar gráfica">×</button></header><div class="ce-bank-balance-chart-empty"><strong>No hay movimientos bancarios históricos para esta cuenta.</strong><span>Selecciona otra cuenta que tenga movimientos cargados.</span></div></section>`;
      wireBalanceChartClose(overlay);
      return;
    }
    const allTimes=series.map(point=>point.time);
    const minTime=Math.min(...allTimes),maxTime=Math.max(...allTimes);
    const eventStart=includedRows.length?Math.min(...includedRows.map(row=>parseMoment(row.executedAt))):minTime;
    const eventEnd=includedRows.length?Math.max(...includedRows.map(row=>parseMoment(row.executedAt))):maxTime;
    let zoomSeries=series.filter(point=>point.time>=eventStart&&point.time<=eventEnd);
    if(!zoomSeries.length) zoomSeries=series.filter(point=>point.movement&&eventIds.has(String(point.movement.id)));
    if(!zoomSeries.length) zoomSeries=series.slice(-Math.min(20,series.length));
    const firstValue=series[0].balance,lastValue=series[series.length-1].balance,variation=lastValue-firstValue;
    const firstMovement=series.find(point=>point.movement)?.movement;
    const lastMovement=[...series].reverse().find(point=>point.movement)?.movement;
    const historicalRange=firstMovement&&lastMovement?`${formatDate(firstMovement.executedAt,false)} — ${formatDate(lastMovement.executedAt,false)}`:'Histórico completo';
    const eventData=eventDisplayData();
    const zoomPane=chartPane({id:'zoom',title:eventData.title,subtitle:`Desde ${chartDateFull(eventStart)} hasta ${chartDateFull(eventEnd)} · Zoom completo del evento`,status:eventData.status,statusClass:eventData.statusClass,series:zoomSeries,eventIds,minTime:eventStart,maxTime:eventEnd,width:1500,height:310,shade:false,zoom:true,showEventPoints:true});
    const historyPane=chartPane({id:'history',title:'Histórico completo de la cuenta',subtitle:`Desde ${chartDateFull(minTime)} hasta ${chartDateFull(maxTime)} · La franja amarilla identifica el intervalo En saldo del evento`,series,eventIds,minTime,maxTime,width:1500,height:285,shadeStart:eventStart,shadeEnd:eventEnd,shade:includedRows.length>0,zoom:false,showEventPoints:false});
    overlay.innerHTML=`<section class="ce-bank-balance-chart-card refined vertical-layout" role="dialog" aria-modal="true" aria-labelledby="ceBankBalanceChartTitle"><header class="ce-bank-balance-main-head"><div class="ce-bank-balance-title"><span>EVOLUCIÓN TEMPORAL DEL SALDO</span><h3 id="ceBankBalanceChartTitle">${esc(accountLabel)}</h3><p>${esc(historicalRange)}</p></div><aside id="ceBankBalanceInspector" class="ce-bank-balance-inspector hidden-info"></aside><button type="button" data-ce-bank-close-balance-chart aria-label="Cerrar gráfica">×</button></header><div class="ce-bank-balance-chart-stats"><div><span>Saldo inicial histórico</span><strong>${money(firstValue)}</strong></div><div><span>Saldo final histórico</span><strong>${money(lastValue)}</strong></div><div class="${variation<0?'negative':'positive'}"><span>Variación histórica</span><strong>${variation>=0?'+':''}${money(variation)}</strong></div><div><span>Movimientos En saldo señalados</span><strong>${includedRows.length}</strong></div></div><div class="ce-bank-balance-stack">${historyPane.html}${zoomPane.html}</div><footer><span><i class="blue"></i>Saldo histórico</span><span><i class="amber"></i>Intervalo del evento</span><span><i class="green"></i>Abono del evento</span><span><i class="red"></i>Cargo del evento</span><small>Los movimientos ajenos al evento forman la línea, pero no llevan punto.</small></footer></section>`;
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden','false');
    overlay.querySelectorAll('.ce-bank-balance-pane').forEach(pane=>wireBalancePane(pane,pane.dataset.paneId==='zoom'?zoomPane.meta:historyPane.meta));
    wireBalanceChartClose(overlay);
  }

  function openBalanceChart(event){
    stopEvent(event);
    const overlay=$('ceBankBalanceChartOverlay');
    if(!overlay||!store.data) return;
    store.balanceChartOpen=true;
    renderBalanceChart();
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden','false');
    requestAnimationFrame(()=>overlay.classList.add('visible'));
  }

  function filteredMovements(){
    const cacheKey=[store.dataRevision,store.filter,text(store.search).toLowerCase(),store.sort].join('|');
    if(store.filteredCacheKey===cacheKey) return store.filteredCacheRows;
    let rows=arr(store.data?.movements);
    if(store.filter==='INCLUIDOS') rows=rows.filter(row=>row.included);
    else if(store.filter==='EXCLUIDOS') rows=rows.filter(row=>!row.included);
    else if(store.filter==='PENDIENTES') rows=rows.filter(row=>row.amount<0?!['CUADRADO','CUADRADO_FORZADO'].includes(row.justificationStatus):row.incomeJustificationStatus!=='CUADRADO');
    else if(store.filter==='CUADRADOS') rows=rows.filter(row=>row.amount<0?['CUADRADO','CUADRADO_FORZADO'].includes(row.justificationStatus):row.incomeJustificationStatus==='CUADRADO');
    else if(store.filter==='FORZADOS') rows=rows.filter(row=>row.justificationStatus==='CUADRADO_FORZADO');
    const q=text(store.search).toLowerCase();
    if(q) rows=rows.filter(row=>[
      row.description,row.amount,row.bankBalance,row.eventBalanceAfter,formatDate(row.executedAt),formatDate(row.valueDate,false),
      ...arr(row.displayLinks||row.links).flatMap(link=>[link.ticketCode,link.eventTitle,link.ticketAmount,...arr(link.stores),...arr(link.responsibles)]),
      ...arr(row.incomeLinks).flatMap(link=>[link.personName,link.amount,link.paymentMethod])
    ].join(' ').toLowerCase().includes(q));
    rows=[...rows].sort((a,b)=>{
      const cmp=String(a.executedAt).localeCompare(String(b.executedAt))||String(a.id).localeCompare(String(b.id));
      return store.sort==='ASC'?cmp:-cmp;
    });
    store.filteredCacheKey=cacheKey;
    store.filteredCacheRows=rows;
    return rows;
  }
  function updatePager(total,start,end){
    store.totalPages=Math.max(1,Math.ceil(total/store.pageSize));
    store.page=clampPage(store.page,store.totalPages);
    const count=$('ceBankResultCount');
    const label=$('ceBankPageLabel');
    const prev=$('ceBankPrevPage');
    const next=$('ceBankNextPage');
    if(count) count.textContent=total?`Mostrando ${start+1}–${end} de ${total} movimiento(s)`:'No hay movimientos en esta vista';
    if(label) label.textContent=`Página ${store.page} de ${store.totalPages}`;
    if(prev) prev.disabled=store.page<=1;
    if(next) next.disabled=store.page>=store.totalPages;
  }
  function renderBody(){
    const body=$('ceBankBody'); if(!body) return;
    const rows=filteredMovements();
    store.totalPages=Math.max(1,Math.ceil(rows.length/store.pageSize));
    if(store.pendingFocusId){
      const index=rows.findIndex(row=>String(row.id)===String(store.pendingFocusId));
      if(index>=0) store.page=Math.floor(index/store.pageSize)+1;
    }
    store.page=clampPage(store.page,store.totalPages);
    const start=(store.page-1)*store.pageSize;
    const end=Math.min(rows.length,start+store.pageSize);
    const pageRows=rows.slice(start,end);
    updatePager(rows.length,start,end);
    if(!pageRows.length){ body.innerHTML='<div class="ce-bank-empty"><strong>No hay movimientos en esta vista.</strong><span>Prueba otro filtro, cambia la búsqueda o amplía las fechas.</span></div>'; return; }
    body.innerHTML=pageRows.map((row,index)=>{
      const status=row.amount>=0?incomeStatusInfo(row):statusInfo(row); const amountClass=row.amount<0?'negative':'positive';
      const displayLinks=arr(row.displayLinks||row.links);
      const activeLinks=displayLinks.filter(link=>link.isActiveEvent!==false);
      const incomeLinks=arr(row.incomeLinks);
      const target=row.amount>=0?Math.max(0,num(row.incomeTargetAmount||row.amount)):Math.max(0,num(row.targetAmount));
      const justified=row.amount>=0?Math.max(0,num(row.incomeJustifiedAmount)):(row.linkedToOtherEvent?Math.max(0,num(row.foreignJustifiedAmount)):Math.max(0,num(row.justifiedAmount)));
      const progress=target?Math.min(100,Math.round(justified/target*100)):0;
      const rowLocked=store.readOnly||row.inclusionLocked===true;
      const disabled=rowLocked?'disabled aria-disabled="true"':'';
      const actionDisabled=store.readOnly?'disabled aria-disabled="true"':'';
      const orderedLinks=displayLinks.slice().sort((a,b)=>
        String(a.eventTitle||'').localeCompare(String(b.eventTitle||''),'es')||
        (Number(String(a.ticketCode||'').replace(/\D/g,''))||0)-(Number(String(b.ticketCode||'').replace(/\D/g,''))||0)||
        String(a.ticketCode||'').localeCompare(String(b.ticketCode||''),'es')
      );
      const links=orderedLinks.map(link=>{
        const removable=link.isActiveEvent!==false&&!store.readOnly;
        return `<span class="ce-bank-ticket-chip ${link.forcedSquare?'forced':''} ${link.isActiveEvent===false?'foreign':''}" role="button" tabindex="0" data-ce-bank-view-ticket="1" data-event-id="${esc(link.eventId||store.eventId)}" data-ticket-code="${esc(link.ticketCode)}" data-event-title="${esc(link.eventTitle)}" title="Ver foto de ${esc(link.ticketCode)} · ${esc(link.eventTitle)} · ${money(link.ticketAmount)}"><i>TK</i><b>${esc(link.ticketCode)}</b><span>${esc(link.eventTitle)}</span><strong>${money(link.ticketAmount)}</strong><em aria-hidden="true">📷</em>${removable?`<button type="button" data-ce-bank-remove-link="${esc(link.id)}" data-movement-id="${esc(row.id)}" aria-label="Quitar ${esc(link.ticketCode)}">×</button>`:''}</span>`;
      }).join('');
      const incomeChips=incomeLinks.map(link=>`<span class="ce-bank-income-chip ${link.imageUrl?'has-photo':''} ${link.manual?'manual':''}" ${link.imageUrl?`role="button" tabindex="0" data-ce-bank-view-income="1" data-image-src="${esc(link.imageUrl)}" data-income-id="${esc(link.id)}" data-person-name="${esc(link.personName)}" title="Ver justificante de ingreso de ${esc(link.personName)}"`:''}><i>ING</i><b>${esc(link.personName)}</b><strong>${money(link.amount)}</strong>${link.imageUrl?`<img src="${esc(link.imageUrl)}" alt="Justificante de ${esc(link.personName)}">`:'<em aria-hidden="true">📷</em>'}</span>`).join('');
      const forceControl=row.amount<0&&!row.linkedToOtherEvent&&activeLinks.length&&(Math.abs(num(row.difference))>.01||row.forcedSquare)
        ?`<label class="ce-bank-force-square ${row.forcedSquare?'checked':''}"><input type="checkbox" data-ce-bank-forced="${esc(row.id)}" ${row.forcedSquare?'checked':''} ${actionDisabled}><span>✓</span><b>Cuadrar de manera forzada</b><small>Aceptar la diferencia de ${money(Math.abs(num(row.difference)))}</small></label>`:'';
      const includeLabel=row.inclusionLocked?'Otro evento':(row.included?'En saldo':'Inactivo');
      const justificationTitle=row.amount>=0?'Trazabilidad del INGRESO':(row.linkedToOtherEvent?'Conciliado en otro evento':'Trazabilidad de la COMPRA');
      const amountSummary=`<small class="ce-bank-justify-amounts">${money(justified)} de ${money(target)}</small>`;
      const addAction=row.amount<0&&!row.linkedToOtherEvent
        ?`<button type="button" class="ce-bank-add-ticket" data-ce-bank-add-ticket="${esc(row.id)}" ${actionDisabled}><span>↔</span><b>Revisar / modificar TKxx</b></button>`
        :'';
      const incomeAction=row.amount>=0&&row.included
        ?`<button type="button" class="ce-bank-add-ticket ce-bank-edit-income" data-ce-bank-edit-income="${esc(row.id)}" ${actionDisabled}><span>↔</span><b>${row.incomeAssociationMode==='MANUAL'?'Cambiar justificación del INGRESO':'Revisar justificación del INGRESO'}</b></button>`
        :'';
      const emptyText=row.linkedToOtherEvent?'Este movimiento está justificado en otro evento.':'Todavía no hay TKxx asociados a este movimiento.';
      const incomeEmpty=row.included?'No se ha encontrado un ingreso bancario del evento que coincida con este abono.':'Este abono está fuera del saldo del evento.';
      return `<article class="ce-bank-movement ${row.included?'included':'excluded'} ${amountClass} ${row.linkedToOtherEvent?'belongs-other-event':''}" data-movement-id="${esc(row.id)}" style="--ce-bank-progress:${progress}%">
        <div class="ce-bank-ledger-node"><span>${String(start+index+1).padStart(2,'0')}</span><i></i></div>
        <div class="ce-bank-movement-main">
          <label class="ce-bank-include ${row.inclusionLocked?'locked':''}" title="${row.inclusionLocked?'Este movimiento ya está conciliado en otro evento.':''}"><input type="checkbox" data-ce-bank-included="${esc(row.id)}" ${row.included?'checked':''} ${disabled}><span><i></i></span><b>${includeLabel}</b></label>
          <div class="ce-bank-date"><strong>${formatDate(row.executedAt)}</strong><small>Valor ${formatDate(row.valueDate,false)}</small></div>
          <div class="ce-bank-description"><div><span>${row.amount<0?'SALIDA':'ENTRADA'}</span><strong>${esc(row.description)}</strong></div></div>
          <div class="ce-bank-amount ${amountClass}"><small>${row.amount<0?'CARGO':'ABONO'}</small><strong>${money(row.amount)}</strong><span>Banco: <b>${money(row.bankBalance)}</b></span><span class="ce-bank-event-running">Evento: <b>${money(row.eventBalanceAfter)}</b>${row.included?'':' · sin aplicar'}</span></div>
        </div>
        <div class="ce-bank-justification ${status.className}">
          <div class="ce-bank-justify-left">
            <div class="ce-bank-justify-head"><span class="ce-bank-justify-icon">${row.amount<0?'⌁':'↗'}</span><div class="ce-bank-justify-copy"><div class="ce-bank-justify-title-row"><strong>${justificationTitle}</strong><span class="ce-bank-status ${status.className}">${esc(status.label)}</span></div>${amountSummary}</div></div>
            <div class="ce-bank-progress-track"><i></i><span>${progress}% justificado</span></div>
          </div>
          <div class="ce-bank-justify-right">
            <div class="ce-bank-ticket-list ${row.amount>=0?'ce-bank-income-list':''}">${row.amount<0?(links||`<span class="ce-bank-no-tickets">${emptyText}</span>`):(incomeChips||`<span class="ce-bank-no-tickets">${incomeEmpty}</span>`)}</div>
            <div class="ce-bank-justify-actions">${row.amount<0?`${addAction}${forceControl}`:incomeAction}</div>
          </div>
        </div>
      </article>`;
    }).join('');
  }

  async function refreshBankData(event){
    stopEvent(event);
    if(store.importing||store.refreshing) return false;
    store.refreshing=true;
    const button=$('ceBankRefresh');
    const label=button?.querySelector('b');
    const original='Recargar datos';
    const focusedMovement=document.activeElement?.closest?.('[data-movement-id]')?.dataset?.movementId||'';
    try{ store.loadController?.abort?.(); }catch(_){ }
    if(button){button.disabled=true;button.setAttribute('aria-busy','true');button.classList.add('busy');}
    if(label) label.textContent='Recargando…';
    try{
      await load({force:true,preserveScroll:true,preserveNotice:true,preserveMovementId:focusedMovement});
      const stamp=new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
      if(label) label.textContent='Datos actualizados';
      notice(`Datos recargados desde el servidor a las ${stamp}.`,'ok',false);
    }catch(error){
      notice(error?.message||'No se pudieron actualizar los movimientos.','error',true);
      if(label) label.textContent='Error al recargar';
    }finally{
      window.setTimeout(()=>{
        store.refreshing=false;
        if(label) label.textContent=original;
        if(button){button.disabled=false;button.removeAttribute('aria-busy');button.classList.remove('busy');}
      },1100);
    }
    return false;
  }

  function imageValue(value){
    if(!value) return '';
    if(typeof value==='string') return text(value);
    return text(value.url||value.public_url||value.publicUrl||value.pathname||value.path||value.storage_path||value.dataUrl||value.src||'');
  }
  function ticketImageFromBag(images,eventId,ticketCode){
    const token=text(ticketCode).toUpperCase().replace(/\s+/g,'');
    let best={score:-1,src:''};
    Object.entries(images||{}).forEach(([key,value])=>{
      const src=imageValue(value); if(!src) return;
      const decoded=(()=>{try{return decodeURIComponent(String(key));}catch(_){return String(key);}})();
      const rest=decoded.startsWith(eventId+'|')?decoded.slice(eventId.length+1):decoded;
      const normalized=rest.toUpperCase().replace(/\s+/g,'');
      let score=-1;
      if(normalized===token) score=1000;
      else if(normalized.endsWith('|'+token)||normalized.startsWith(token+'|')) score=850;
      else if(normalized.includes(token)) score=600;
      if(score>best.score) best={score,src};
    });
    return best.src;
  }
  function closeBankTicketPhoto(){ $('ceBankTicketPhoto')?.remove(); }
  function openBankIncomePhoto(chip,event){
    stopEvent(event);
    const src=text(chip?.dataset?.imageSrc);
    const person=text(chip?.dataset?.personName||'Ingreso');
    if(!src) return;
    const eventInfo=eventMediaData(store.eventId,store.data?.event?.title);
    closeBankTicketPhoto();
    const viewer=document.createElement('div');
    viewer.id='ceBankTicketPhoto'; viewer.className='ce-bank-photo-overlay';
    viewer.innerHTML=`<div class="ce-bank-photo-card" role="dialog" aria-modal="true" aria-label="Justificante de ingreso de ${esc(person)}"><div class="ce-bank-photo-head"><div><span>JUSTIFICANTE DE INGRESO</span><strong>${esc(person)}</strong>${eventMediaHeader(eventInfo)}</div><button type="button" data-ce-bank-photo-close aria-label="Cerrar foto">×</button></div><img class="ce-bank-photo-image" src="${esc(src)}" alt="Justificante de ingreso de ${esc(person)}"></div>`;
    $('ceBankOverlay')?.appendChild(viewer);
  }
  async function openBankTicketPhoto(chip,event){
    stopEvent(event);
    const eventId=text(chip?.dataset?.eventId||store.eventId);
    const ticketCode=text(chip?.dataset?.ticketCode);
    const eventTitle=text(chip?.dataset?.eventTitle||store.data?.event?.title);
    const eventInfo=eventMediaData(eventId,eventTitle);
    if(!eventId||!ticketCode) return;
    closeBankTicketPhoto();
    const viewer=document.createElement('div');
    viewer.id='ceBankTicketPhoto'; viewer.className='ce-bank-photo-overlay';
    viewer.innerHTML=`<div class="ce-bank-photo-card" role="dialog" aria-modal="true" aria-label="Foto ${esc(ticketCode)}"><div class="ce-bank-photo-head"><div><span>FOTO DEL TICKET</span><strong>${esc(ticketCode)}</strong>${eventMediaHeader(eventInfo)}</div><button type="button" data-ce-bank-photo-close aria-label="Cerrar foto">×</button></div><div class="ce-bank-photo-loading"><span class="ce-bank-loader"></span><b>Cargando foto del ticket…</b></div></div>`;
    $('ceBankOverlay')?.appendChild(viewer);
    try{
      const response=await fetch(`/api/ticket-images?eventId=${encodeURIComponent(eventId)}`,{cache:'no-store'});
      const json=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(json.error||`HTTP ${response.status}`);
      const src=ticketImageFromBag(json.images||{},eventId,ticketCode);
      const card=viewer.querySelector('.ce-bank-photo-card');
      if(!card||!viewer.isConnected) return;
      card.querySelector('.ce-bank-photo-loading')?.remove();
      card.insertAdjacentHTML('beforeend',src?`<img class="ce-bank-photo-image" src="${esc(src)}" alt="Foto ${esc(ticketCode)}">`:`<div class="ce-bank-photo-empty"><b>No hay foto adjunta para ${esc(ticketCode)}.</b><span>El ticket está conciliado, pero no se ha encontrado una imagen en este evento.</span></div>`);
    }catch(error){
      const loading=viewer.querySelector('.ce-bank-photo-loading');
      if(loading) loading.innerHTML=`<b>No se pudo cargar la foto.</b><span>${esc(error?.message||error)}</span>`;
    }
  }

  async function balanceTicketImages(eventId){
    if(!store.balanceTicketImages) store.balanceTicketImages={};
    const key=text(eventId);
    if(store.balanceTicketImages[key]) return store.balanceTicketImages[key];
    const response=await fetch(`/api/ticket-images?eventId=${encodeURIComponent(key)}`,{cache:'no-store'});
    const json=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(json.error||`HTTP ${response.status}`);
    store.balanceTicketImages[key]=json.images||{};
    return store.balanceTicketImages[key];
  }
  function balanceMediaViewer({badge,title,caption='',items=[],loading=false,empty='No hay imágenes disponibles.',eventInfo=null}){
    closeBankTicketPhoto();
    const viewer=document.createElement('div');
    viewer.id='ceBankTicketPhoto'; viewer.className='ce-bank-photo-overlay';
    const body=loading
      ?`<div class="ce-bank-photo-loading"><span class="ce-bank-loader"></span><b>Cargando justificantes…</b></div>`
      :items.length
        ?`<div class="ce-bank-photo-gallery count-${items.length}">${items.map(item=>`<figure class="ce-bank-photo-figure ${item.src?'':'without-image'}"><figcaption><strong>${esc(item.title)}</strong><span>${esc(item.subtitle||'')}</span></figcaption>${item.src?`<img class="ce-bank-photo-image" src="${esc(item.src)}" alt="${esc(item.title)}">`:`<div class="ce-bank-photo-empty"><b>Sin imagen adjunta</b><span>${esc(item.empty||'No se ha encontrado la fotografía de este justificante.')}</span></div>`}</figure>`).join('')}</div>`
        :`<div class="ce-bank-photo-empty"><b>${esc(empty)}</b></div>`;
    viewer.innerHTML=`<div class="ce-bank-photo-card ce-bank-photo-card-gallery" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="ce-bank-photo-head"><div><span>${esc(badge)}</span><strong>${esc(title)}</strong>${caption?`<em>${esc(caption)}</em>`:''}${eventMediaHeader(eventInfo||eventDisplayData())}</div><button type="button" data-ce-bank-photo-close aria-label="Cerrar visor">×</button></div>${body}</div>`;
    $('ceBankOverlay')?.appendChild(viewer);
    return viewer;
  }
  async function openBalanceMovementMedia(movementId,event){
    stopEvent(event);
    const movement=arr(store.data?.movements).find(row=>String(row.id)===String(movementId));
    if(!movement) return;
    const caption=`${formatDate(movement.executedAt)} · ${money(movement.amount)}`;
    const eventInfo=eventMediaData(store.eventId,store.data?.event?.title);
    if(num(movement.amount)>=0){
      const items=arr(movement.incomeLinks).map(link=>({title:text(link.personName||'Ingreso'),subtitle:money(link.amount),src:text(link.imageUrl),empty:'Este ingreso no tiene fotografía adjunta.'}));
      balanceMediaViewer({badge:'JUSTIFICANTES DE INGRESO',title:text(movement.description||'Abono bancario'),caption,items,empty:'Este abono no tiene justificantes de ingreso asociados.',eventInfo});
      return;
    }
    const links=arr(movement.displayLinks||movement.links).slice().sort((a,b)=>(Number(String(a.ticketCode||'').replace(/\D/g,''))||0)-(Number(String(b.ticketCode||'').replace(/\D/g,''))||0));
    balanceMediaViewer({badge:'TICKETS JUSTIFICANTES',title:text(movement.description||'Cargo bancario'),caption,loading:true,eventInfo});
    if(!links.length){
      $('ceBankTicketPhoto')?.remove();
      balanceMediaViewer({badge:'TICKETS JUSTIFICANTES',title:text(movement.description||'Cargo bancario'),caption,items:[],empty:'Este cargo no tiene TKxx asociados.',eventInfo});
      return;
    }
    try{
      const eventIds=[...new Set(links.map(link=>text(link.eventId||store.eventId)).filter(Boolean))];
      const bags={};
      await Promise.all(eventIds.map(async id=>{bags[id]=await balanceTicketImages(id);}));
      const items=links.map(link=>{
        const eventId=text(link.eventId||store.eventId);
        const code=text(link.ticketCode||'TKxx');
        return {title:code,subtitle:`${text(link.eventTitle||store.data?.event?.title||'Evento')} · ${money(link.ticketAmount)}`,src:ticketImageFromBag(bags[eventId]||{},eventId,code),empty:`No se ha encontrado la fotografía de ${code}.`};
      });
      $('ceBankTicketPhoto')?.remove();
      balanceMediaViewer({badge:'TICKETS JUSTIFICANTES',title:text(movement.description||'Cargo bancario'),caption,items,eventInfo});
    }catch(error){
      $('ceBankTicketPhoto')?.remove();
      balanceMediaViewer({badge:'TICKETS JUSTIFICANTES',title:text(movement.description||'Cargo bancario'),caption,items:[],empty:error?.message||'No se pudieron cargar las fotografías.',eventInfo});
    }
  }

  async function savePeriod(){
    if(mutationBlocked()) return;
    const dateFrom=text($('ceBankDateFrom')?.value); const dateTo=text($('ceBankDateTo')?.value);
    if(!dateFrom||!dateTo){notice('Indica las dos fechas del periodo bancario.','warning',true);return;}
    if(dateFrom>dateTo){notice('La fecha de inicio bancaria no puede ser posterior a la fecha final.','warning',true);return;}
    const button=$('ceBankApplyPeriod'); if(button) button.disabled=true;
    try{
      await api('/api/bank-reconciliation/event-period',{method:'PATCH',body:JSON.stringify({eventId:store.eventId,dateFrom,dateTo})});
      store.dateFrom=dateFrom; store.dateTo=dateTo;
      notice(`Periodo bancario aplicado: ${formatDate(dateFrom,false)} — ${formatDate(dateTo,false)}.`,'ok',true);
      await load({force:true,preserveNotice:true});
    }catch(error){notice(error.message,'error',true);}
    finally{if(button) button.disabled=store.readOnly;}
  }
  async function importCsv(event){
    if(store.importing||mutationBlocked()) return;
    const input=event?.target||$('ceBankCsvFile'); const file=input?.files?.[0]; if(!file) return;
    if(!/\.(csv|txt)$/i.test(file.name)){ alert('Selecciona un fichero CSV.'); try{input.value='';}catch(_){ } return; }
    if(file.size>30*1024*1024){ notice('El CSV supera 30 MB. Descárgalo desde el banco en varios periodos y cárgalos consecutivamente.','warning',true); try{input.value='';}catch(_){ } return; }
    store.importing=true;
    const button=$('ceBankImport'); const fileInput=$('ceBankCsvFile');
    if(fileInput) fileInput.disabled=true;
    if(button){button.classList.add('busy','disabled');button.setAttribute('aria-busy','true');button.setAttribute('aria-disabled','true');button.tabIndex=-1;}
    notice(`Leyendo ${file.name} (${Math.max(1,Math.round(file.size/1024))} KB)…`);
    try{
      const csvText=await file.text();
      // Cede un frame al navegador para que el aviso se pinte antes de enviar ficheros grandes.
      await new Promise(resolve=>requestAnimationFrame(resolve));
      notice(`Importando ${file.name}… No cierres esta ventana.`);
      const result=await api('/api/bank-reconciliation/import',{method:'POST',body:JSON.stringify({eventId:store.eventId,filename:file.name,csvText})});
      store.accountId=result.accountId||store.accountId;
      store.page=1;
      invalidateMovementCache();
      const importedPeriod=result.dateFrom&&result.dateTo?` · periodo del fichero ${formatDate(result.dateFrom,false)}–${formatDate(result.dateTo,false)}`:'';
      const outsideCurrentPeriod=(result.dateFrom&&store.dateFrom&&result.dateFrom<store.dateFrom)||(result.dateTo&&store.dateTo&&result.dateTo>store.dateTo);
      const visibilityHint=outsideCurrentPeriod?' Los movimientos están cargados; amplía las fechas bancarias del evento para verlos.':'';
      notice(`CSV incorporado: ${result.inserted} movimiento(s) nuevo(s), ${result.duplicates} repetido(s) omitido(s)${arr(result.warnings).length?` y ${result.warnings.length} aviso(s)`:''}${importedPeriod}.${visibilityHint}`,'ok',true);
      await load({force:true,preserveNotice:true});
    }catch(error){ notice(error.message,'error',true); }
    finally{
      try{input.value='';}catch(_){ }
      store.importing=false;
      if(fileInput) fileInput.disabled=store.readOnly;
      if(button){button.classList.remove('busy');button.classList.toggle('disabled',store.readOnly);button.removeAttribute('aria-busy');button.setAttribute('aria-disabled',store.readOnly?'true':'false');button.tabIndex=store.readOnly?-1:0;}
    }
  }
  async function toggleIncluded(id,included,input){
    if(mutationBlocked()){input.checked=!included;return;}
    input.disabled=true;
    try{ await api(`/api/bank-reconciliation/movements/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({eventId:store.eventId,included})}); await load({force:true,preserveMovementId:id}); }
    catch(error){ input.checked=!included; notice(error.message,'error',true); }
    finally{input.disabled=false;}
  }
  async function toggleForced(id,forced,input){
    if(mutationBlocked()){input.checked=!forced;return;}
    input.disabled=true;
    try{ await api(`/api/bank-reconciliation/movements/${encodeURIComponent(id)}/forced`,{method:'PATCH',body:JSON.stringify({eventId:store.eventId,forced})}); await load({force:true,preserveMovementId:id}); }
    catch(error){ input.checked=!forced; notice(error.message,'error',true); }
    finally{input.disabled=false;}
  }
  async function openTicketPicker(movementId){
    if(mutationBlocked()) return;
    const row=arr(store.data?.movements).find(item=>String(item.id)===String(movementId));
    if(!row||num(row.amount)>=0) return;
    store.ticketMovement=movementId;
    store.ticketOriginalLinks=arr(row.displayLinks||row.links).filter(link=>link.isActiveEvent!==false).map(link=>({id:text(link.id),ticketCode:text(link.ticketCode)}));
    const originalCodes=new Set(store.ticketOriginalLinks.map(link=>link.ticketCode));
    const modal=$('ceBankTicketModal'); modal.classList.remove('hidden');
    const eventTitle=store.data?.event?.title||'evento activo';
    modal.innerHTML=`<div class="ce-bank-ticket-modal ce-bank-ticket-edit-modal"><div class="ce-bank-ticket-modal-head"><div class="ce-bank-ticket-modal-icon">TK</div><div><span>JUSTIFICANTES DEL MOVIMIENTO</span><h3>Revisar o modificar TKxx</h3><p>Marca todos los TKxx de «${esc(eventTitle)}» que justifican ${money(Math.abs(num(row.amount)))}.</p></div><button type="button" data-ce-bank-close-tickets aria-label="Cerrar">×</button></div><label class="ce-bank-ticket-search"><i>⌕</i><input id="ceBankTicketSearch" autocomplete="off" placeholder="Buscar por TKxx, tienda o responsable"></label><div id="ceBankTicketChoices" class="ce-bank-ticket-choices ce-bank-ticket-edit-choices"><div class="ce-bank-empty"><span class="ce-bank-loader"></span><strong>Cargando TKxx del evento…</strong></div></div><div class="ce-bank-ticket-edit-footer"><div><span>Seleccionado</span><strong id="ceBankTicketSelectedTotal">${money(0)}</strong><small>Objetivo: ${money(Math.abs(num(row.amount)))}</small></div><button type="button" class="outline" data-ce-bank-close-tickets>Cancelar</button><button type="button" data-ce-bank-save-tickets>Guardar cambios</button></div></div>`;
    modal.querySelectorAll('[data-ce-bank-close-tickets]').forEach(button=>button.addEventListener('click',()=>{modal.classList.add('hidden');store.ticketMovement=null;store.ticketOriginalLinks=[];restorePosition(movementId,false);}));
    const input=$('ceBankTicketSearch'); input.addEventListener('input',()=>renderTicketChoices(input.value));
    try{
      const params=new URLSearchParams({movementId,eventId:store.eventId});
      const result=await api(`/api/bank-reconciliation/paid-tickets?${params}`);
      store.tickets=arr(result.items).map(item=>({...item,selected:originalCodes.has(text(item.ticketCode))}));
      renderTicketChoices(''); input.focus();
    }catch(error){ $('ceBankTicketChoices').innerHTML=`<div class="ce-bank-empty error"><strong>${esc(error.message)}</strong></div>`; }
  }
  function renderTicketChoices(query){
    const node=$('ceBankTicketChoices'); if(!node) return;
    const q=text(query).toLowerCase();
    const items=store.tickets.filter(item=>!q||[item.ticketCode,...arr(item.stores),...arr(item.responsibles)].join(' ').toLowerCase().includes(q));
    node.innerHTML=items.map(item=>`<label class="ce-bank-ticket-choice ce-bank-ticket-edit-choice ${item.selected?'selected':''}"><input type="checkbox" data-ce-bank-ticket-choice="${esc(item.ticketCode)}" ${item.selected?'checked':''}><i>TK</i><span><b>${esc(item.ticketCode)}</b><strong>${esc(item.eventTitle)}</strong><small>${esc(arr(item.stores).join(', ')||'Sin tienda')} · ${item.lineCount} línea(s)</small></span><em>${money(item.amount)}</em><u>${item.selected?'Incluido':'Disponible'}</u></label>`).join('')||'<div class="ce-bank-empty"><strong>No hay TKxx pagados disponibles en este evento.</strong></div>';
    updateTicketPickerTotal();
  }
  function updateTicketPickerTotal(){
    const total=store.tickets.filter(item=>item.selected).reduce((sum,item)=>sum+num(item.amount),0);
    const node=$('ceBankTicketSelectedTotal'); if(node) node.textContent=money(total);
  }
  async function saveTicketSelection(){
    if(mutationBlocked()) return;
    const movementId=store.ticketMovement; if(!movementId) return;
    const button=$('ceBankTicketModal')?.querySelector('[data-ce-bank-save-tickets]');
    if(button){button.disabled=true;button.textContent='Guardando…';}
    const selectedCodes=new Set(store.tickets.filter(item=>item.selected).map(item=>text(item.ticketCode)));
    const originalByCode=new Map(store.ticketOriginalLinks.map(link=>[text(link.ticketCode),link]));
    const removeRows=[...originalByCode.values()].filter(link=>!selectedCodes.has(link.ticketCode));
    const addCodes=[...selectedCodes].filter(code=>!originalByCode.has(code));
    try{
      for(const link of removeRows){
        await api(`/api/bank-reconciliation/ticket-links/${encodeURIComponent(link.id)}?eventId=${encodeURIComponent(store.eventId)}`,{method:'DELETE'});
      }
      for(const ticketCode of addCodes){
        await api(`/api/bank-reconciliation/movements/${encodeURIComponent(movementId)}/tickets`,{method:'POST',body:JSON.stringify({eventId:store.eventId,ticketCode})});
      }
      $('ceBankTicketModal').classList.add('hidden');
      store.ticketMovement=null; store.ticketOriginalLinks=[];
      await load({force:true,preserveMovementId:movementId});
      notice('Justificación de compra actualizada. Se muestran todos los TKxx asociados.','ok',false);
    }catch(error){
      notice(error.message,'error',true);
      await load({force:true,preserveMovementId:movementId});
      if(button){button.disabled=false;button.textContent='Guardar cambios';}
    }
  }
  async function addTicket(ticketCode,button){
    if(mutationBlocked()) return;
    const movementId=store.ticketMovement; button.disabled=true;
    try{
      await api(`/api/bank-reconciliation/movements/${encodeURIComponent(movementId)}/tickets`,{method:'POST',body:JSON.stringify({eventId:store.eventId,ticketCode})});
      $('ceBankTicketModal').classList.add('hidden'); await load({force:true,preserveMovementId:movementId});
    }catch(error){ notice(error.message,'error',true); button.disabled=false; }
  }
  async function removeLink(linkId,movementId,button){
    if(mutationBlocked()) return;
    if(!confirm('¿Quitar este TKxx de la justificación bancaria del evento?')) return;
    button.disabled=true;
    try{ await api(`/api/bank-reconciliation/ticket-links/${encodeURIComponent(linkId)}?eventId=${encodeURIComponent(store.eventId)}`,{method:'DELETE'}); await load({force:true,preserveMovementId:movementId}); }
    catch(error){ notice(error.message,'error',true); button.disabled=false; }
  }
  async function openIncomePicker(movementId){
    if(mutationBlocked()) return;
    const row=arr(store.data?.movements).find(item=>String(item.id)===String(movementId));
    if(!row||num(row.amount)<=0) return;
    store.incomeMovement=movementId;
    const modal=$('ceBankTicketModal'); modal.classList.remove('hidden');
    const currentIds=new Set(arr(row.incomeLinks).map(item=>text(item.id)));
    const eventTitle=store.data?.event?.title||'evento activo';
    modal.innerHTML=`<div class="ce-bank-ticket-modal ce-bank-income-modal"><div class="ce-bank-ticket-modal-head"><div class="ce-bank-ticket-modal-icon income">ING</div><div><span>JUSTIFICANTES DEL ABONO</span><h3>Cambiar justificación del ingreso</h3><p>Selecciona los ingresos correctos de «${esc(eventTitle)}». La suma seleccionada debe justificar ${money(row.amount)}.</p></div><button type="button" data-ce-bank-close-incomes aria-label="Cerrar">×</button></div><label class="ce-bank-ticket-search"><i>⌕</i><input id="ceBankIncomeSearch" autocomplete="off" placeholder="Buscar por persona, importe o forma de ingreso"></label><div id="ceBankIncomeChoices" class="ce-bank-ticket-choices ce-bank-income-choices"><div class="ce-bank-empty"><span class="ce-bank-loader"></span><strong>Cargando ingresos del evento…</strong></div></div><div class="ce-bank-income-modal-footer"><div><span>Seleccionado</span><strong id="ceBankIncomeSelectedTotal">${money(0)}</strong><small>Objetivo: ${money(row.amount)}</small></div><button type="button" class="outline" data-ce-bank-income-auto>Volver a asociación automática</button><button type="button" data-ce-bank-save-incomes>Guardar asociación</button></div></div>`;
    modal.querySelector('[data-ce-bank-close-incomes]').onclick=()=>{modal.classList.add('hidden');store.incomeMovement=null;restorePosition(movementId,false);};
    const input=$('ceBankIncomeSearch'); input.oninput=()=>renderIncomeChoices(input.value);
    try{
      const params=new URLSearchParams({movementId,eventId:store.eventId});
      const result=await api(`/api/bank-reconciliation/incomes?${params}`);
      store.incomes=arr(result.items).map(item=>({...item,selected:currentIds.has(text(item.id))}));
      renderIncomeChoices(''); input.focus();
    }catch(error){ $('ceBankIncomeChoices').innerHTML=`<div class="ce-bank-empty error"><strong>${esc(error.message)}</strong></div>`; }
  }
  function renderIncomeChoices(query){
    const node=$('ceBankIncomeChoices'); if(!node) return;
    const q=text(query).toLowerCase();
    const items=store.incomes.filter(item=>!q||[item.personName,item.paymentMethod,item.amount].join(' ').toLowerCase().includes(q));
    node.innerHTML=items.map(item=>`<label class="ce-bank-income-choice ${item.selected?'selected':''} ${item.available===false?'linked':''}"><input type="checkbox" data-ce-bank-income-choice="${esc(item.id)}" ${item.selected?'checked':''} ${item.available===false?'disabled':''}><span class="ce-bank-income-choice-thumb">${item.imageUrl?`<img src="${esc(item.imageUrl)}" alt="Justificante de ${esc(item.personName)}">`:'<i>ING</i>'}</span><span><b>${esc(item.personName)}</b><small>${esc(item.paymentMethod||'Banco')}</small></span><strong>${money(item.amount)}</strong>${item.available===false?'<em>Usado en otro movimiento</em>':''}</label>`).join('')||'<div class="ce-bank-empty"><strong>No hay ingresos bancarios disponibles en este evento.</strong></div>';
    updateIncomePickerTotal();
  }
  function updateIncomePickerTotal(){
    const selected=new Set(store.incomes.filter(item=>item.selected).map(item=>item.id));
    const total=store.incomes.filter(item=>selected.has(item.id)).reduce((sum,item)=>sum+num(item.amount),0);
    const node=$('ceBankIncomeSelectedTotal'); if(node) node.textContent=money(total);
  }
  async function saveIncomeSelection(useAutomatic=false){
    if(mutationBlocked()) return;
    const movementId=store.incomeMovement; if(!movementId) return;
    const button=$('ceBankTicketModal')?.querySelector(useAutomatic?'[data-ce-bank-income-auto]':'[data-ce-bank-save-incomes]');
    if(button) button.disabled=true;
    const incomeIds=useAutomatic?[]:store.incomes.filter(item=>item.selected).map(item=>item.id);
    try{
      await api(`/api/bank-reconciliation/movements/${encodeURIComponent(movementId)}/incomes`,{method:'PUT',body:JSON.stringify({eventId:store.eventId,incomeIds})});
      $('ceBankTicketModal').classList.add('hidden');
      store.incomeMovement=null;
      await load({force:true,preserveMovementId:movementId});
      notice(useAutomatic?'Restaurada la asociación automática del ingreso.':'Asociación de ingresos guardada.','ok',false);
    }catch(error){notice(error.message,'error',true);if(button)button.disabled=false;}
  }

  async function exportData(options={}){
    const params=new URLSearchParams();
    params.set('eventId',options.eventId||store.eventId||activeEventId());
    if(options.accountId||store.accountId) params.set('accountId',options.accountId||store.accountId);
    return api(`/api/bank-reconciliation/export?${params}`);
  }
  function focusBody(){ try{$('ceBankBody')?.focus({preventScroll:true});}catch(_){ } }
  function pageNavigate(event){
    const overlay=$('ceBankOverlay'); const modal=$('ceBankTicketModal');
    if(!overlay||overlay.classList.contains('hidden')||!modal?.classList.contains('hidden')) return;
    const editable=event.target?.matches?.('input,textarea,[contenteditable="true"]');
    if(editable) return;
    if(event.target?.matches?.('select')) return;
    const body=$('ceBankBody'); if(!body) return;
    const distance=Math.max(180,Math.round(body.clientHeight*.82));
    if(event.key==='PageDown'){
      event.preventDefault();
      const atBottom=body.scrollTop+body.clientHeight>=body.scrollHeight-10;
      if(atBottom&&store.page<store.totalPages) changePage(store.page+1);
      else body.scrollBy({top:distance,behavior:'auto'});
    }else if(event.key==='PageUp'){
      event.preventDefault();
      const atTop=body.scrollTop<=10;
      if(atTop&&store.page>1) changePage(store.page-1,{toEnd:true});
      else body.scrollBy({top:-distance,behavior:'auto'});
    }else if(event.key==='Home'){
      event.preventDefault(); changePage(1); body.scrollTop=0;
    }else if(event.key==='End'){
      event.preventDefault(); changePage(store.totalPages,{toEnd:true});
    }
  }
  function openFromEntry(event){
    const target=event?.target?.closest?.('#btnOpenBankReconciliation,[data-ce-open-bank="1"]');
    if(!target) return true;
    stopEvent(event); purgeTooltip(target);
    const now=Date.now(); if(now-store.openGestureAt<350) return false;
    store.openGestureAt=now; open(); return false;
  }
  root.ceOpenCuadreBanco=openFromEntry;
  root.addEventListener('click',event=>{if(event.target?.closest?.('#btnOpenBankReconciliation,[data-ce-open-bank="1"]'))openFromEntry(event);},true);
  document.addEventListener('click',event=>{
    const chartTrigger=event.target?.closest?.('[data-ce-bank-open-balance-chart="1"]');
    if(chartTrigger){openBalanceChart(event);return;}
    const chartClose=event.target?.closest?.('[data-ce-bank-close-balance-chart]');
    if(chartClose||event.target?.id==='ceBankBalanceChartOverlay'){stopEvent(event);closeBalanceChart();return;}
    const included=event.target?.closest?.('[data-ce-bank-included]');
    if(included){toggleIncluded(included.dataset.ceBankIncluded,included.checked,included);return;}
    const forced=event.target?.closest?.('[data-ce-bank-forced]');
    if(forced){toggleForced(forced.dataset.ceBankForced,forced.checked,forced);return;}
    const add=event.target?.closest?.('[data-ce-bank-add-ticket]');
    if(add){openTicketPicker(add.dataset.ceBankAddTicket);return;}
    const editIncome=event.target?.closest?.('[data-ce-bank-edit-income]');
    if(editIncome){openIncomePicker(editIncome.dataset.ceBankEditIncome);return;}
    const remove=event.target?.closest?.('[data-ce-bank-remove-link]');
    if(remove){removeLink(remove.dataset.ceBankRemoveLink,remove.dataset.movementId,remove);return;}
    const photoClose=event.target?.closest?.('[data-ce-bank-photo-close]');
    if(photoClose||event.target?.id==='ceBankTicketPhoto'){stopEvent(event);closeBankTicketPhoto();return;}
    const incomeChip=event.target?.closest?.('[data-ce-bank-view-income="1"]');
    if(incomeChip){openBankIncomePhoto(incomeChip,event);return;}
    const ticketChip=event.target?.closest?.('[data-ce-bank-view-ticket="1"]');
    if(ticketChip){openBankTicketPhoto(ticketChip,event);return;}
    const choice=event.target?.closest?.('button.ce-bank-ticket-choice[data-ticket-code]');
    if(choice&&!choice.disabled){addTicket(choice.dataset.ticketCode,choice);return;}
    if(event.target?.closest?.('[data-ce-bank-save-tickets]')){saveTicketSelection();return;}
    if(event.target?.closest?.('[data-ce-bank-save-incomes]')){saveIncomeSelection(false);return;}
    if(event.target?.closest?.('[data-ce-bank-income-auto]')){saveIncomeSelection(true);return;}
    const modal=$('ceBankTicketModal'); if(modal&&!modal.classList.contains('hidden')&&event.target===modal){const movement=store.incomeMovement||store.ticketMovement;modal.classList.add('hidden');store.incomeMovement=null;store.ticketMovement=null;restorePosition(movement,false);}
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!$('ceBankOverlay')?.classList.contains('hidden')){
      if(store.balanceChartOpen){closeBalanceChart();return;}
      if($('ceBankTicketPhoto')){closeBankTicketPhoto();return;}
      if(!$('ceBankTicketModal')?.classList.contains('hidden')){const movement=store.incomeMovement||store.ticketMovement;$('ceBankTicketModal').classList.add('hidden');store.incomeMovement=null;store.ticketMovement=null;restorePosition(movement,false);}else close();
      return;
    }
    if((event.key==='Enter'||event.key===' ')&&event.target?.matches?.('[data-ce-bank-open-balance-chart="1"]')){openBalanceChart(event);return;}
    if((event.key==='Enter'||event.key===' ')&&event.target?.matches?.('[data-ce-bank-view-income="1"]')){openBankIncomePhoto(event.target,event);return;}
    if((event.key==='Enter'||event.key===' ')&&event.target?.matches?.('[data-ce-bank-view-ticket="1"]')){openBankTicketPhoto(event.target,event);return;}
    pageNavigate(event);
  },true);
  document.addEventListener('change',event=>{
    const ticketChoice=event.target?.closest?.('[data-ce-bank-ticket-choice]');
    if(ticketChoice){
      const item=store.tickets.find(row=>text(row.ticketCode)===text(ticketChoice.dataset.ceBankTicketChoice));
      if(item){item.selected=ticketChoice.checked;ticketChoice.closest('.ce-bank-ticket-edit-choice')?.classList.toggle('selected',item.selected);const tag=ticketChoice.closest('.ce-bank-ticket-edit-choice')?.querySelector('u');if(tag)tag.textContent=item.selected?'Incluido':'Disponible';updateTicketPickerTotal();}
      return;
    }
    const incomeChoice=event.target?.closest?.('[data-ce-bank-income-choice]');
    if(incomeChoice){
      const item=store.incomes.find(row=>row.id===incomeChoice.dataset.ceBankIncomeChoice);
      if(item){item.selected=incomeChoice.checked;incomeChoice.closest('.ce-bank-income-choice')?.classList.toggle('selected',item.selected);updateIncomePickerTotal();}
      return;
    }
    if(event.target?.id==='selectedEvent'){
      applyRole();
      if(!$('ceBankOverlay')?.classList.contains('hidden')){
        const id=activeEventId();
        if(!hasBankRole()){close();return;}
        if(id&&id!==store.eventId){store.eventId=id;store.accountId='';store.filter='TODOS';store.search='';store.sort='DESC';store.dateFrom='';store.dateTo='';store.page=1;store.data=null;invalidateMovementCache();load({force:true});}
      }
    }
  },true);
  const observer=root.MutationObserver?new MutationObserver(mutations=>{
    // Los cambios de paginación/búsqueda dentro del propio Cuadre Banco no deben
    // relanzar installDom ni recorrer otra vez todos sus controles.
    const external=mutations.some(mutation=>!mutation.target?.closest?.('#ceBankOverlay'));
    if(!external) return;
    installDom(); applyRole();
  }):null;
  if(observer) observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>{installDom();installCommandCapture();},{once:true});
  [0,100,500,1400].forEach(ms=>setTimeout(installDom,ms));
  root.ControlEventBankReconciliation={version:VERSION,open,close,load,refresh:refreshBankData,openBalanceChart,closeBalanceChart,exportData,parseMoney:num,state:store};
})(window);
