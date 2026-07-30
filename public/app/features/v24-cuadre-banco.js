/* ControlEvent v25_prod FIX5 · Cuadre Banco: controles blindados, lectura finalizada y textos legibles (GD/RW). */
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
  const hasBankRole = () => ['GD','RW'].includes(level());
  const activeEventId = () => text($('selectedEvent')?.value || state().selectedEventId || state().eventoSeleccionadoId || root.selectedEventId);
  const actor = () => {
    const user=auth()||{};
    return {nivel:level(),identificacion:text(user.identificacion||user.Identificacion),nombre:text(user.nombre||user.Nombre)};
  };
  const actorHeader = () => encodeURIComponent(JSON.stringify(actor()));
  const store = {
    loading:false, importing:false, data:null, eventId:'', accountId:'', filter:'TODOS', search:'',
    ticketMovement:null, tickets:[], openGestureAt:0, lastAction:'', lastActionAt:0, readOnly:false,
    lastBodyScroll:0, pendingFocusId:'', noticeLocked:false, sort:'DESC', dateFrom:'', dateTo:'',
    page:1, pageSize:60, dataRevision:0, filteredCacheKey:'', filteredCacheRows:[], searchTimer:0, renderFrame:0,
    loadSeq:0, loadController:null, totalPages:1
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
            <div id="ceBankEventHeadline" class="ce-bank-event-headline"><strong>Selecciona un evento</strong></div>
            <p id="ceBankEventPeriod">Se mostrarán únicamente sus movimientos y TKxx.</p>
          </div>
          <div id="ceBankTraffic" class="ce-bank-traffic red"><span class="ce-bank-traffic-light"><i></i><i></i><i></i></span><div><b>0 / 0 TKxx</b><small>Sin datos</small></div></div>
          <div class="ce-bank-header-balance"><span>Saldo final del evento</span><strong id="ceBankHeaderBalance">—</strong><small id="ceBankHeaderCount">Sincronizando movimientos</small></div>
          <span class="ce-bank-version">v25_prod</span>
          <button type="button" id="ceBankClose" class="ce-bank-close" aria-label="Cerrar Cuadre Banco"><span>×</span></button>
        </header>
        <div id="ceBankReadOnly" class="ce-bank-readonly hidden"><b>EVENTO FINALIZADO</b><span>Consulta completa disponible; altas, bajas y cambios están bloqueados.</span></div>
        <div class="ce-bank-command-deck">
          <div class="ce-bank-command-primary">
            <label id="ceBankImport" class="ce-bank-import-btn" role="button" tabindex="0" aria-label="Cargar CSV bancario"><span>↑</span><b>Cargar CSV</b><small>Añade solo movimientos nuevos</small><input id="ceBankCsvFile" class="ce-bank-file-native" type="file" accept=".csv,text/csv,.txt" aria-label="Seleccionar CSV bancario"></label>
            <button type="button" id="ceBankRefresh" class="ce-bank-refresh-btn" aria-label="Actualizar movimientos"><span>↻</span><b>Actualizar</b></button>
          </div>
          <div class="ce-bank-command-fields">
            <label><span>Cuenta bancaria</span><select id="ceBankAccount"></select></label>
            <label><span>Vista de control</span><select id="ceBankFilter"><option value="TODOS">Todos los movimientos</option><option value="INCLUIDOS">Incluidos en saldo</option><option value="EXCLUIDOS">Fuera del saldo</option><option value="PENDIENTES">Pendientes de justificar</option><option value="CUADRADOS">Cuadrados</option><option value="FORZADOS">Cuadrados forzados</option></select></label>
            <label><span>Orden temporal</span><select id="ceBankSort"><option value="DESC">Más joven → más antiguo</option><option value="ASC">Más antiguo → más joven</option></select></label>
            <label class="ce-bank-search"><span>Buscar movimiento</span><div><i>⌕</i><input id="ceBankSearch" autocomplete="off" placeholder="Fecha, concepto, importe, saldo o TKxx"></div></label>
          </div>
        </div>
        <div class="ce-bank-period-deck">
          <div class="ce-bank-period-copy"><span>PERIODO BANCARIO DEL EVENTO</span><b>Todos los cargos y abonos de estas fechas se mostrarán en pantalla.</b><small>Las dos fechas son inclusivas. Al desvincular un TKxx, el movimiento seguirá visible mientras permanezca dentro del periodo.</small></div>
          <label><span>Fecha inicio bancaria</span><input id="ceBankDateFrom" type="date"></label>
          <label><span>Fecha final bancaria</span><input id="ceBankDateTo" type="date"></label>
          <button type="button" id="ceBankApplyPeriod"><span>✓</span><b>Aplicar fechas</b></button>
        </div>
        <div id="ceBankSummary" class="ce-bank-summary"></div>
        <div id="ceBankNotice" class="ce-bank-notice hidden"></div>
        <div class="ce-bank-ledger-caption"><b>Movimientos bancarios</b><b>Tickets justificantes del mvto bancario</b></div>
        <div class="ce-bank-resultbar"><span id="ceBankResultCount">Preparando movimientos…</span><div><button type="button" id="ceBankPrevPage" aria-label="Página anterior">‹</button><b id="ceBankPageLabel">Página 1 de 1</b><button type="button" id="ceBankNextPage" aria-label="Página siguiente">›</button></div></div>
        <main id="ceBankBody" class="ce-bank-body" tabindex="0" aria-label="Movimientos bancarios del evento"></main>
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
    $('ceBankRefresh')?.addEventListener('click',event=>{stopEvent(event);if(actionAllowed('refresh',250))load({force:true,preserveScroll:true});});
    wireCommandControls();
    $('ceBankPrevPage')?.addEventListener('click',event=>{stopEvent(event);changePage(store.page-1);});
    $('ceBankNextPage')?.addEventListener('click',event=>{stopEvent(event);changePage(store.page+1);});
    $('ceBankApplyPeriod')?.addEventListener('click',event=>{stopEvent(event);if(actionAllowed('period',350))savePeriod();});
    ['ceBankDateFrom','ceBankDateTo'].forEach(id=>$(id)?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();savePeriod();}}));
    overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
  }
  function applyRole(){
    document.querySelectorAll('.ce-bank-entry').forEach(node=>{
      const show=hasBankRole();
      node.classList.toggle('hidden',!show); node.style.display=show?'':'none'; node.disabled=!show; node.setAttribute('aria-hidden',show?'false':'true');
    });
    if(!hasBankRole() && !$('ceBankOverlay')?.classList.contains('hidden')) close();
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
    if(!hasBankRole()){ alert('Cuadre Banco está disponible para usuarios GD y RW.'); return false; }
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
        $('ceBankSummary').innerHTML=''; $('ceBankHeaderBalance').textContent='—';
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
    const s=data.summary||{}; const event=data.event||{}; const tickets=data.ticketSummary||{}; const period=data.period||{}; const traffic=trafficInfo(tickets);
    const finalClass=num(s.calculatedBalance)<0?'negative':'positive';
    const variationClass=num(s.eventVariation)<0?'negative':'positive';
    $('ceBankHeaderBalance').textContent=money(s.calculatedBalance); $('ceBankHeaderBalance').className=finalClass;
    $('ceBankHeaderCount').textContent=`Inicial ${money(s.openingBalance)} · variación ${money(s.eventVariation)}`;
    const headline=$('ceBankEventHeadline');
    headline.className=`ce-bank-event-headline ${event.finalized?'finalized':'in-progress'}`;
    headline.innerHTML=`<strong>${esc(event.title||'Evento')}</strong><span>${esc(event.status||'En curso')}</span>`;
    $('ceBankEventPeriod').textContent=`Periodo bancario: ${formatDate(store.dateFrom,false)} — ${formatDate(store.dateTo,false)} · fechas inclusivas`;
    const trafficNode=$('ceBankTraffic');
    trafficNode.className=`ce-bank-traffic ${traffic.className}`;
    trafficNode.innerHTML=`<span class="ce-bank-traffic-light"><i></i><i></i><i></i></span><div><b>${num(tickets.linked)} / ${num(tickets.total)} TKxx</b><small>${esc(traffic.label)} · ${num(tickets.percentage)}%</small></div>`;
    $('ceBankReadOnly').classList.toggle('hidden',!store.readOnly);
    $('ceBankOverlay')?.classList.toggle('ce-bank-readonly-mode',store.readOnly);
    if(store.readOnly){store.filter='INCLUIDOS';if($('ceBankFilter'))$('ceBankFilter').value='INCLUIDOS';}
    wireCommandControls();
    const importButton=$('ceBankImport'); const importInput=$('ceBankCsvFile'); const importDisabled=(store.readOnly===true)||store.importing; if(importInput) importInput.disabled=importDisabled; if(importButton){importButton.setAttribute('aria-disabled',importDisabled?'true':'false');importButton.classList.toggle('disabled',importDisabled);importButton.classList.toggle('busy',store.importing);importButton.tabIndex=importDisabled?-1:0;}
    ['ceBankDateFrom','ceBankDateTo','ceBankApplyPeriod'].forEach(id=>{const node=$(id);if(node){node.disabled=store.readOnly;node.setAttribute('aria-disabled',store.readOnly?'true':'false');}});
    const flowMax=Math.max(Math.abs(num(s.income)),Math.abs(num(s.expense)),1);
    const incomePct=Math.round(Math.abs(num(s.income))/flowMax*100); const expensePct=Math.round(Math.abs(num(s.expense))/flowMax*100);
    const objective=num(s.eventVariation)>=0?'El evento deja más saldo que al comenzar':'El evento reduce el saldo de partida';
    $('ceBankSummary').innerHTML=`
      <article class="ce-bank-kpi ce-bank-kpi-opening"><span>Saldo bancario inicial del evento</span><strong>${money(s.openingBalance)}</strong><small>Saldo anterior al movimiento más antiguo del periodo</small><div class="ce-bank-kpi-formula">Saldo posterior − importe (en un cargo se suma su valor absoluto)</div></article>
      <article class="ce-bank-kpi ce-bank-kpi-hero ${finalClass}"><div class="ce-bank-kpi-copy"><span>Saldo final calculado del evento</span><strong>${money(s.calculatedBalance)}</strong><small>${num(s.includedCount)} movimientos aplicados · ${num(s.excludedCount)} inactivos</small></div><div class="ce-bank-orbit-visual" aria-hidden="true"><i></i><i></i><i></i><b>${finalClass==='negative'?'−':'+'}</b></div></article>
      <article class="ce-bank-kpi ce-bank-kpi-flow"><span>Entradas y salidas incluidas</span><div class="ce-bank-flow-row income"><b>Abonos</b><i><u style="width:${incomePct}%"></u></i><strong>${money(s.income)}</strong></div><div class="ce-bank-flow-row expense"><b>Cargos</b><i><u style="width:${expensePct}%"></u></i><strong>${money(s.expense)}</strong></div><small class="${variationClass}">Variación ${money(s.eventVariation)} · ${esc(objective)}</small></article>
      <article class="ce-bank-kpi ce-bank-kpi-bank"><span>Saldo certificado por el banco</span><strong>${money(s.latestBankBalance)}</strong><small>Último movimiento global ${formatDate(s.latestAt)}</small><div class="ce-bank-actual-period">Saldo real al final del periodo: <b>${money(s.actualClosingBalance)}</b></div></article>`;
    if(num(period.linkedOutsidePeriodCount)>0){
      notice(`Hay ${num(period.linkedOutsidePeriodCount)} movimiento(s) con TKxx asociados fuera del periodo bancario seleccionado. Amplía las fechas para revisarlos.`,'warning',false);
    }else if(tickets.allJustified){
      notice(store.readOnly?'Todo está justificado. El evento está Finalizado y se muestra en modo de consulta.':'Todo está justificado para este evento. Puedes revisar o modificar las asociaciones mientras continúe En curso.','ok',false);
    }else if(store.readOnly){
      notice('El evento está Finalizado: se permite consultar, buscar, filtrar y revisar asociaciones, pero no modificarlas.','warning',false);
    }else if(!store.noticeLocked){ notice(''); }
    renderBody();
    wireCommandControls();
  }
  function filteredMovements(){
    const cacheKey=[store.dataRevision,store.filter,text(store.search).toLowerCase(),store.sort].join('|');
    if(store.filteredCacheKey===cacheKey) return store.filteredCacheRows;
    let rows=arr(store.data?.movements);
    if(store.filter==='INCLUIDOS') rows=rows.filter(row=>row.included);
    else if(store.filter==='EXCLUIDOS') rows=rows.filter(row=>!row.included);
    else if(store.filter==='PENDIENTES') rows=rows.filter(row=>row.amount<0&&!['CUADRADO','CUADRADO_FORZADO'].includes(row.justificationStatus));
    else if(store.filter==='CUADRADOS') rows=rows.filter(row=>['CUADRADO','CUADRADO_FORZADO'].includes(row.justificationStatus));
    else if(store.filter==='FORZADOS') rows=rows.filter(row=>row.justificationStatus==='CUADRADO_FORZADO');
    const q=text(store.search).toLowerCase();
    if(q) rows=rows.filter(row=>[
      row.description,row.amount,row.bankBalance,row.eventBalanceAfter,formatDate(row.executedAt),formatDate(row.valueDate,false),
      ...arr(row.displayLinks||row.links).flatMap(link=>[link.ticketCode,link.eventTitle,link.ticketAmount,...arr(link.stores),...arr(link.responsibles)])
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
      const status=statusInfo(row); const amountClass=row.amount<0?'negative':'positive';
      const displayLinks=arr(row.displayLinks||row.links);
      const activeLinks=displayLinks.filter(link=>link.isActiveEvent!==false);
      const target=Math.max(0,num(row.targetAmount));
      const justified=row.linkedToOtherEvent?Math.max(0,num(row.foreignJustifiedAmount)):Math.max(0,num(row.justifiedAmount));
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
        return `<span class="ce-bank-ticket-chip ${link.forcedSquare?'forced':''} ${link.isActiveEvent===false?'foreign':''}" title="${esc(link.ticketCode)} · ${esc(link.eventTitle)} · ${money(link.ticketAmount)}"><i>TK</i><b>${esc(link.ticketCode)}</b><span>${esc(link.eventTitle)}</span><strong>${money(link.ticketAmount)}</strong>${removable?`<button type="button" data-ce-bank-remove-link="${esc(link.id)}" data-movement-id="${esc(row.id)}" aria-label="Quitar ${esc(link.ticketCode)}">×</button>`:''}</span>`;
      }).join('');
      const forceControl=row.amount<0&&!row.linkedToOtherEvent&&activeLinks.length&&(Math.abs(num(row.difference))>.01||row.forcedSquare)
        ?`<label class="ce-bank-force-square ${row.forcedSquare?'checked':''}"><input type="checkbox" data-ce-bank-forced="${esc(row.id)}" ${row.forcedSquare?'checked':''} ${actionDisabled}><span>✓</span><b>Cuadrar de manera forzada</b><small>Aceptar la diferencia de ${money(Math.abs(num(row.difference)))}</small></label>`:'';
      const includeLabel=row.inclusionLocked?'Otro evento':(row.included?'En saldo':'Inactivo');
      const justificationTitle=row.amount>=0?'Movimiento positivo conciliado':(row.linkedToOtherEvent?'Conciliado en otro evento':'Trazabilidad de compra');
      const amountSummary=row.amount<0?`<small class="ce-bank-justify-amounts">${money(justified)} de ${money(target)}</small>`:'';
      const addAction=row.amount<0&&!row.linkedToOtherEvent
        ?`<button type="button" class="ce-bank-add-ticket" data-ce-bank-add-ticket="${esc(row.id)}" ${actionDisabled}><span>＋</span><b>Vincular TKxx del evento</b></button>`
        :'';
      const emptyText=row.linkedToOtherEvent?'Este movimiento está justificado en otro evento.':'Todavía no hay TKxx asociados a este movimiento.';
      const positiveNote=row.linkedToOtherEvent
        ?`Movimiento perteneciente a ${esc(arr(row.foreignEvents).join(', ')||'otro evento')}; permanece inactivo en el evento actual.`
        :'Este abono se muestra en la evolución del saldo y no necesita TKxx de compra.';
      return `<article class="ce-bank-movement ${row.included?'included':'excluded'} ${amountClass} ${row.linkedToOtherEvent?'belongs-other-event':''}" data-movement-id="${esc(row.id)}" style="--ce-bank-progress:${progress}%">
        <div class="ce-bank-ledger-node"><span>${String(start+index+1).padStart(2,'0')}</span><i></i></div>
        <div class="ce-bank-movement-main">
          <label class="ce-bank-include ${row.inclusionLocked?'locked':''}" title="${row.inclusionLocked?'Este movimiento ya está conciliado en otro evento.':''}"><input type="checkbox" data-ce-bank-included="${esc(row.id)}" ${row.included?'checked':''} ${disabled}><span><i></i></span><b>${includeLabel}</b></label>
          <div class="ce-bank-date"><strong>${formatDate(row.executedAt)}</strong><small>Valor ${formatDate(row.valueDate,false)}</small></div>
          <div class="ce-bank-description"><div><span>${row.amount<0?'SALIDA':'ENTRADA'}</span><strong>${esc(row.description)}</strong></div></div>
          <div class="ce-bank-amount ${amountClass}"><small>${row.amount<0?'CARGO':'ABONO'}</small><strong>${money(row.amount)}</strong><span>Banco: <b>${money(row.bankBalance)}</b></span><span class="ce-bank-event-running">Evento: <b>${money(row.eventBalanceAfter)}</b>${row.included?'':' · sin aplicar'}</span></div>
        </div>
        <div class="ce-bank-justification ${status.className}">
          <div class="ce-bank-justify-head"><span class="ce-bank-justify-icon">${row.amount<0?'⌁':'↗'}</span><div><strong>${justificationTitle}</strong><span class="ce-bank-status ${status.className}">${esc(status.label)}</span>${amountSummary}</div></div>
          ${row.amount<0?`<div class="ce-bank-progress-track"><i></i><span>${progress}% justificado</span></div><div class="ce-bank-ticket-list">${links||`<span class="ce-bank-no-tickets">${emptyText}</span>`}</div><div class="ce-bank-justify-actions">${addAction}${forceControl}</div>`:`<p class="ce-bank-positive-note">${positiveNote}</p>`}
        </div>
      </article>`;
    }).join('');
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
    store.ticketMovement=movementId;
    const modal=$('ceBankTicketModal'); modal.classList.remove('hidden');
    const eventTitle=store.data?.event?.title||'evento activo';
    modal.innerHTML=`<div class="ce-bank-ticket-modal"><div class="ce-bank-ticket-modal-head"><div class="ce-bank-ticket-modal-icon">TK</div><div><span>ENLAZAR JUSTIFICANTE DEL EVENTO</span><h3>Añadir TKxx pagado</h3><p>Solo se muestran TKxx de «${esc(eventTitle)}».</p></div><button type="button" data-ce-bank-close-tickets aria-label="Cerrar">×</button></div><label class="ce-bank-ticket-search"><i>⌕</i><input id="ceBankTicketSearch" autocomplete="off" placeholder="Buscar por TKxx, tienda o responsable"></label><div id="ceBankTicketChoices" class="ce-bank-ticket-choices"><div class="ce-bank-empty"><span class="ce-bank-loader"></span><strong>Cargando TKxx del evento…</strong></div></div></div>`;
    modal.querySelector('[data-ce-bank-close-tickets]').addEventListener('click',()=>{modal.classList.add('hidden');restorePosition(movementId,false);});
    const input=$('ceBankTicketSearch'); input.addEventListener('input',()=>renderTicketChoices(input.value));
    try{
      const params=new URLSearchParams({movementId,eventId:store.eventId});
      const result=await api(`/api/bank-reconciliation/paid-tickets?${params}`); store.tickets=arr(result.items); renderTicketChoices(''); input.focus();
    }catch(error){ $('ceBankTicketChoices').innerHTML=`<div class="ce-bank-empty error"><strong>${esc(error.message)}</strong></div>`; }
  }
  function renderTicketChoices(query){
    const node=$('ceBankTicketChoices'); if(!node) return;
    const q=text(query).toLowerCase();
    const items=store.tickets.filter(item=>!q||[item.ticketCode,...arr(item.stores),...arr(item.responsibles)].join(' ').toLowerCase().includes(q));
    node.innerHTML=items.map(item=>`<button type="button" class="ce-bank-ticket-choice ${item.linked?'linked':''}" data-ticket-code="${esc(item.ticketCode)}" ${item.linked?'disabled':''}><i>TK</i><span><b>${esc(item.ticketCode)}</b><strong>${esc(item.eventTitle)}</strong><small>${esc(arr(item.stores).join(', ')||'Sin tienda')} · ${item.lineCount} línea(s)</small></span><em>${money(item.amount)}</em>${item.linked?'<u>Ya vinculado</u>':'<u>Vincular →</u>'}</button>`).join('')||'<div class="ce-bank-empty"><strong>No hay TKxx pagados disponibles en este evento.</strong></div>';
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
    const included=event.target?.closest?.('[data-ce-bank-included]');
    if(included){toggleIncluded(included.dataset.ceBankIncluded,included.checked,included);return;}
    const forced=event.target?.closest?.('[data-ce-bank-forced]');
    if(forced){toggleForced(forced.dataset.ceBankForced,forced.checked,forced);return;}
    const add=event.target?.closest?.('[data-ce-bank-add-ticket]');
    if(add){openTicketPicker(add.dataset.ceBankAddTicket);return;}
    const remove=event.target?.closest?.('[data-ce-bank-remove-link]');
    if(remove){removeLink(remove.dataset.ceBankRemoveLink,remove.dataset.movementId,remove);return;}
    const choice=event.target?.closest?.('.ce-bank-ticket-choice[data-ticket-code]');
    if(choice&&!choice.disabled){addTicket(choice.dataset.ticketCode,choice);return;}
    const modal=$('ceBankTicketModal'); if(modal&&!modal.classList.contains('hidden')&&event.target===modal){modal.classList.add('hidden');restorePosition(store.ticketMovement,false);}
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!$('ceBankOverlay')?.classList.contains('hidden')){
      if(!$('ceBankTicketModal')?.classList.contains('hidden')){$('ceBankTicketModal').classList.add('hidden');restorePosition(store.ticketMovement,false);}else close();
      return;
    }
    pageNavigate(event);
  },true);
  document.addEventListener('change',event=>{
    if(event.target?.id==='selectedEvent'&&!$('ceBankOverlay')?.classList.contains('hidden')){
      const id=activeEventId(); if(id&&id!==store.eventId){store.eventId=id;store.accountId='';store.filter='TODOS';store.search='';store.sort='DESC';store.dateFrom='';store.dateTo='';store.page=1;store.data=null;invalidateMovementCache();load({force:true});}
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
  root.ControlEventBankReconciliation={version:VERSION,open,close,load,exportData,parseMoney:num,state:store};
})(window);
