/* ControlEvent v24_prod-03 · Cuadre Banco por evento (GD/RW). */
(function(root){
  'use strict';
  if(root.__ceV24BankReconciliation) return;
  root.__ceV24BankReconciliation = true;

  const VERSION = 'v24_prod-03';
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
    lastBodyScroll:0, pendingFocusId:'', noticeLocked:false
  };
  const TIP_ATTRS = ['title','data-ce-tip-v21','data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip','data-v181-tip','data-tip','data-ce-tip-layout-v21','data-tip-bg-v21'];

  async function api(path, options={}){
    const response=await fetch(path,{cache:'no-store',...options,headers:{'Content-Type':'application/json','X-ControlEvent-Feature':'cuadre-banco-v24-evento','X-ControlEvent-Actor':actorHeader(),...(options.headers||{})}});
    let payload={};
    try{ payload=await response.json(); }catch(_){ payload={}; }
    if(!response.ok){
      const error=new Error(payload?.error||`Error ${response.status} en Cuadre Banco`);
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
    [overlay,overlay.querySelector('.ce-bank-window'),...overlay.querySelectorAll('button,label,input,select,textarea')].filter(Boolean).forEach(node=>{
      try{ node.style.setProperty('pointer-events','auto','important'); node.style.setProperty('touch-action','manipulation','important'); }catch(_){ }
    });
  }
  function mutationBlocked(message='Este evento está Finalizado. Cuadre Banco está disponible en modo de solo lectura.'){
    if(!store.readOnly) return false;
    notice(message,'warning',true);
    return true;
  }
  function triggerCsvPicker(event){
    stopEvent(event);
    if(mutationBlocked()) return false;
    const input=$('ceBankCsvFile');
    if(!input) return false;
    try{ input.value=''; }catch(_){ }
    try{ if(typeof input.showPicker==='function') input.showPicker(); else input.click(); }
    catch(_){ try{ setTimeout(()=>input.click(),0); }catch(__){ } }
    return false;
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
          <div class="ce-bank-header-balance"><span>Saldo de control</span><strong id="ceBankHeaderBalance">—</strong><small id="ceBankHeaderCount">Sincronizando movimientos</small></div>
          <span class="ce-bank-version">v24_prod-03</span>
          <button type="button" id="ceBankClose" class="ce-bank-close" aria-label="Cerrar Cuadre Banco"><span>×</span></button>
        </header>
        <div id="ceBankReadOnly" class="ce-bank-readonly hidden"><b>EVENTO FINALIZADO</b><span>Consulta completa disponible; altas, bajas y cambios están bloqueados.</span></div>
        <div class="ce-bank-command-deck">
          <div class="ce-bank-command-primary">
            <button type="button" id="ceBankImport" class="ce-bank-import-btn"><span>↑</span><b>Cargar CSV</b><small>Añade solo movimientos nuevos</small></button>
            <input id="ceBankCsvFile" class="ce-bank-file-native" type="file" accept=".csv,text/csv,.txt">
            <button type="button" id="ceBankRefresh" class="ce-bank-refresh-btn" aria-label="Actualizar movimientos"><span>↻</span><b>Actualizar</b></button>
          </div>
          <div class="ce-bank-command-fields">
            <label><span>Cuenta bancaria</span><select id="ceBankAccount"></select></label>
            <label><span>Vista de control</span><select id="ceBankFilter"><option value="TODOS">Todos los movimientos</option><option value="INCLUIDOS">Incluidos en saldo</option><option value="EXCLUIDOS">Fuera del saldo</option><option value="PENDIENTES">Pendientes de justificar</option><option value="CUADRADOS">Cuadrados</option><option value="FORZADOS">Cuadrados forzados</option></select></label>
            <label class="ce-bank-search"><span>Buscar movimiento</span><div><i>⌕</i><input id="ceBankSearch" autocomplete="off" placeholder="Fecha, concepto, importe, saldo o TKxx"></div></label>
          </div>
        </div>
        <div id="ceBankSummary" class="ce-bank-summary"></div>
        <div id="ceBankNotice" class="ce-bank-notice hidden"></div>
        <div class="ce-bank-ledger-caption"><span>CRONOLOGÍA DEL EVENTO</span><b>Movimiento</b><b>Concepto</b><b>Importe y saldo</b></div>
        <main id="ceBankBody" class="ce-bank-body" tabindex="0" aria-label="Movimientos bancarios del evento"></main>
        <div id="ceBankTicketModal" class="ce-bank-ticket-overlay hidden"></div>
      </section>`;
      document.body.appendChild(overlay);
      bindInterfaceControls(overlay);
    }
    ensureInteractive();
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
  function bindInterfaceControls(overlay){
    if(!overlay || overlay.dataset.ceBankBound==='1') return;
    overlay.dataset.ceBankBound='1';
    $('ceBankClose')?.addEventListener('click',event=>{stopEvent(event);close();});
    $('ceBankImport')?.addEventListener('click',event=>{if(actionAllowed('csv-click',500))triggerCsvPicker(event);});
    $('ceBankCsvFile')?.addEventListener('change',importCsv);
    $('ceBankRefresh')?.addEventListener('click',event=>{stopEvent(event);if(actionAllowed('refresh',350))load({force:true,preserveScroll:true});});
    $('ceBankAccount')?.addEventListener('change',event=>{store.accountId=event.target.value;load({force:true}).then(focusBody);});
    $('ceBankFilter')?.addEventListener('change',event=>{store.filter=event.target.value;renderBody();focusBody();});
    $('ceBankSearch')?.addEventListener('input',event=>{store.search=event.target.value;renderBody();});
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
    if(store.eventId!==eventId){ store.eventId=eventId; store.accountId=''; store.filter='TODOS'; store.search=''; }
    const overlay=$('ceBankOverlay');
    ensureInteractive(); overlay.classList.remove('hidden');
    requestAnimationFrame(()=>{overlay.classList.add('visible');ensureInteractive();});
    document.body.classList.add('ce-bank-open'); document.body.style.overflow='hidden';
    await load({force:false});
    focusBody();
    return false;
  }
  function close(){
    const overlay=$('ceBankOverlay');
    overlay?.classList.remove('visible'); $('ceBankTicketModal')?.classList.add('hidden');
    setTimeout(()=>overlay?.classList.add('hidden'),160);
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
    if(store.loading) return;
    const body=$('ceBankBody');
    if(preserveScroll&&body) store.lastBodyScroll=body.scrollTop;
    store.pendingFocusId=preserveMovementId||'';
    store.loading=true; if(!preserveNotice){store.noticeLocked=false;notice('');}
    if(!preserveMovementId && body) body.innerHTML='<div class="ce-bank-empty"><span class="ce-bank-loader"></span><strong>Sincronizando la cronología del evento…</strong></div>';
    try{
      store.data=await api(`/api/bank-reconciliation?${queryString(force)}`);
      store.accountId=store.data.selectedAccount||store.accountId;
      store.readOnly=store.data.readOnly===true;
      render();
      requestAnimationFrame(()=>restorePosition(preserveMovementId,preserveScroll));
    }catch(error){
      $('ceBankSummary').innerHTML=''; $('ceBankHeaderBalance').textContent='—';
      body.innerHTML=`<div class="ce-bank-empty error"><strong>No se pudo abrir Cuadre Banco.</strong><span>${esc(error.message)}</span></div>`;
      if(error.code==='BANK_SCHEMA_MISSING') notice('Ejecuta en Supabase el fichero ControlEvent_SQL_V24_PROD_CUADRE_BANCO.sql actualizado.','warning',true);
    }finally{store.loading=false;}
  }
  function restorePosition(movementId,preserveScroll){
    const body=$('ceBankBody'); if(!body) return;
    if(movementId){
      const row=body.querySelector(`[data-movement-id="${cssEscape(movementId)}"]`);
      if(row){ row.scrollIntoView({block:'center',behavior:'auto'}); row.classList.add('ce-bank-returned'); setTimeout(()=>row.classList.remove('ce-bank-returned'),1800); }
    }else if(preserveScroll) body.scrollTop=store.lastBodyScroll;
  }
  function render(){
    const data=store.data||{accounts:[],movements:[],summary:{},event:{},ticketSummary:{}};
    const account=$('ceBankAccount');
    const accountOptions=['<option value="TODOS">Todas las cuentas</option>',...arr(data.accounts).map(item=>`<option value="${esc(item.id)}">${esc(item.label||item.id)}</option>`)].join('');
    account.innerHTML=accountOptions||'<option value="">Sin movimientos</option>';
    account.value=store.accountId||'TODOS';
    $('ceBankFilter').value=store.filter;
    $('ceBankSearch').value=store.search;
    const s=data.summary||{}; const event=data.event||{}; const tickets=data.ticketSummary||{}; const traffic=trafficInfo(tickets);
    const balanceClass=num(s.calculatedBalance)<0?'negative':'positive';
    $('ceBankHeaderBalance').textContent=money(s.calculatedBalance); $('ceBankHeaderBalance').className=balanceClass;
    $('ceBankHeaderCount').textContent=`${num(s.includedCount)} incluidos · ${num(s.excludedCount)} excluidos`;
    const headline=$('ceBankEventHeadline');
    headline.className=`ce-bank-event-headline ${event.finalized?'finalized':'in-progress'}`;
    headline.innerHTML=`<strong>${esc(event.title||'Evento')}</strong><span>${esc(event.status||'En curso')}</span>`;
    $('ceBankEventPeriod').textContent=`Periodo conciliado: ${formatDate(event.reconciliationStart,false)} — ${formatDate(event.reconciliationEnd,false)} · Ventana del evento: ${formatDate(event.startDate,false)} — ${formatDate(event.endDate,false)}`;
    const trafficNode=$('ceBankTraffic');
    trafficNode.className=`ce-bank-traffic ${traffic.className}`;
    trafficNode.innerHTML=`<span class="ce-bank-traffic-light"><i></i><i></i><i></i></span><div><b>${num(tickets.linked)} / ${num(tickets.total)} TKxx</b><small>${esc(traffic.label)} · ${num(tickets.percentage)}%</small></div>`;
    $('ceBankReadOnly').classList.toggle('hidden',!store.readOnly);
    const importButton=$('ceBankImport'); importButton.disabled=store.readOnly; importButton.setAttribute('aria-disabled',store.readOnly?'true':'false');
    const flowMax=Math.max(Math.abs(num(s.income)),Math.abs(num(s.expense)),1);
    const incomePct=Math.round(Math.abs(num(s.income))/flowMax*100); const expensePct=Math.round(Math.abs(num(s.expense))/flowMax*100);
    $('ceBankSummary').innerHTML=`
      <article class="ce-bank-kpi ce-bank-kpi-hero ${balanceClass}"><div class="ce-bank-kpi-copy"><span>Saldo calculado en esta vista</span><strong>${money(s.calculatedBalance)}</strong><small>Saldo inicial ${money(s.openingBalance)} + movimientos incluidos</small></div><div class="ce-bank-orbit-visual" aria-hidden="true"><i></i><i></i><i></i><b>${balanceClass==='negative'?'−':'+'}</b></div></article>
      <article class="ce-bank-kpi ce-bank-kpi-bank"><span>Saldo certificado por el banco</span><strong>${money(s.latestBankBalance)}</strong><small>Último movimiento global ${formatDate(s.latestAt)}</small><div class="ce-bank-signal"><i></i><i></i><i></i><i></i><i></i></div></article>
      <article class="ce-bank-kpi ce-bank-kpi-flow"><span>Flujo visible del evento</span><div class="ce-bank-flow-row income"><b>Entradas</b><i><u style="width:${incomePct}%"></u></i><strong>${money(s.income)}</strong></div><div class="ce-bank-flow-row expense"><b>Salidas</b><i><u style="width:${expensePct}%"></u></i><strong>${money(s.expense)}</strong></div><small>Variación neta ${money(s.includedNet)}</small></article>
      <article class="ce-bank-kpi ce-bank-kpi-count"><span>Justificación de TKxx</span><strong>${num(tickets.linked)} <em>/ ${num(tickets.total)}</em></strong><small>${num(tickets.pending)} pendientes</small><div class="ce-bank-dots">${Array.from({length:Math.min(18,Math.max(1,num(tickets.total)))},(_,i)=>`<i class="${i<num(tickets.linked)?'on':''}"></i>`).join('')}</div></article>`;
    if(tickets.allJustified){
      notice(store.readOnly?'Todo está justificado. El evento está Finalizado y se muestra en modo de consulta.':'Todo está justificado para este evento. Puedes revisar o modificar las asociaciones mientras continúe En curso.','ok',false);
    }else if(store.readOnly){
      notice('El evento está Finalizado: se permite consultar, buscar, filtrar y revisar asociaciones, pero no modificarlas.','warning',false);
    }
    renderBody();
  }
  function filteredMovements(){
    let rows=arr(store.data?.movements);
    if(store.filter==='INCLUIDOS') rows=rows.filter(row=>row.included);
    else if(store.filter==='EXCLUIDOS') rows=rows.filter(row=>!row.included);
    else if(store.filter==='PENDIENTES') rows=rows.filter(row=>row.amount<0&&!['CUADRADO','CUADRADO_FORZADO'].includes(row.justificationStatus));
    else if(store.filter==='CUADRADOS') rows=rows.filter(row=>['CUADRADO','CUADRADO_FORZADO'].includes(row.justificationStatus));
    else if(store.filter==='FORZADOS') rows=rows.filter(row=>row.justificationStatus==='CUADRADO_FORZADO');
    const q=text(store.search).toLowerCase();
    if(q) rows=rows.filter(row=>[
      row.description,row.amount,row.bankBalance,formatDate(row.executedAt),formatDate(row.valueDate,false),
      ...arr(row.links).flatMap(link=>[link.ticketCode,link.eventTitle,link.ticketAmount,...arr(link.stores),...arr(link.responsibles)])
    ].join(' ').toLowerCase().includes(q));
    return rows;
  }
  function renderBody(){
    const body=$('ceBankBody'); if(!body) return;
    const rows=filteredMovements();
    if(!rows.length){ body.innerHTML='<div class="ce-bank-empty"><strong>No hay movimientos en esta vista.</strong><span>Prueba otro filtro o cambia la búsqueda.</span></div>'; return; }
    body.innerHTML=rows.map((row,index)=>{
      const status=statusInfo(row); const amountClass=row.amount<0?'negative':'positive';
      const target=Math.max(0,num(row.targetAmount)); const justified=Math.max(0,num(row.justifiedAmount));
      const progress=target?Math.min(100,Math.round(justified/target*100)):0;
      const disabled=store.readOnly?'disabled aria-disabled="true"':'';
      const links=arr(row.links).map(link=>`<span class="ce-bank-ticket-chip ${link.forcedSquare?'forced':''}"><i>TK</i><b>${esc(link.ticketCode)}</b><span>${esc(link.eventTitle)}</span><strong>${money(link.ticketAmount)}</strong><button type="button" data-ce-bank-remove-link="${esc(link.id)}" data-movement-id="${esc(row.id)}" aria-label="Quitar ${esc(link.ticketCode)}" ${disabled}>×</button></span>`).join('');
      const forceControl=row.amount<0&&arr(row.links).length&&(Math.abs(num(row.difference))>.01||row.forcedSquare)?`<label class="ce-bank-force-square ${row.forcedSquare?'checked':''}"><input type="checkbox" data-ce-bank-forced="${esc(row.id)}" ${row.forcedSquare?'checked':''} ${disabled}><span>✓</span><b>Cuadrar de manera forzada</b><small>Aceptar la diferencia de ${money(Math.abs(num(row.difference)))}</small></label>`:'';
      return `<article class="ce-bank-movement ${row.included?'included':'excluded'} ${amountClass}" data-movement-id="${esc(row.id)}" style="--ce-bank-progress:${progress}%">
        <div class="ce-bank-ledger-node"><span>${String(index+1).padStart(2,'0')}</span><i></i></div>
        <div class="ce-bank-movement-main">
          <label class="ce-bank-include"><input type="checkbox" data-ce-bank-included="${esc(row.id)}" ${row.included?'checked':''} ${disabled}><span><i></i></span><b>En saldo</b></label>
          <div class="ce-bank-date"><strong>${formatDate(row.executedAt)}</strong><small>Valor ${formatDate(row.valueDate,false)}</small></div>
          <div class="ce-bank-description"><div><span>${row.amount<0?'SALIDA':'ENTRADA'}</span><strong>${esc(row.description)}</strong></div></div>
          <div class="ce-bank-amount ${amountClass}"><small>${row.amount<0?'DÉBITO':'CRÉDITO'}</small><strong>${money(row.amount)}</strong><span>Saldo: <b>${money(row.bankBalance)}</b></span></div>
        </div>
        <div class="ce-bank-justification ${status.className}">
          <div class="ce-bank-justify-head"><div><span class="ce-bank-justify-icon">${row.amount<0?'⌁':'↗'}</span><div><strong>${row.amount<0?'Trazabilidad de compra':'Movimiento positivo conciliado'}</strong><span class="ce-bank-status ${status.className}">${esc(status.label)}</span></div></div>${row.amount<0?`<div class="ce-bank-justify-numbers"><b>${money(row.justifiedAmount)}</b><span>de ${money(row.targetAmount)}</span></div>`:''}</div>
          ${row.amount<0?`<div class="ce-bank-progress-track"><i></i><span>${progress}% justificado</span></div><div class="ce-bank-ticket-list">${links||'<span class="ce-bank-no-tickets">Todavía no hay TKxx asociados a este movimiento.</span>'}</div><div class="ce-bank-justify-actions"><button type="button" class="ce-bank-add-ticket" data-ce-bank-add-ticket="${esc(row.id)}" ${disabled}><span>＋</span><b>Vincular TKxx del evento</b></button>${forceControl}</div>`:'<p class="ce-bank-positive-note">Este abono alimenta el saldo y no necesita TKxx de compra.</p>'}
        </div>
      </article>`;
    }).join('');
  }
  async function importCsv(event){
    if(store.importing||mutationBlocked()) return;
    const input=event?.target||$('ceBankCsvFile'); const file=input?.files?.[0]; if(!file) return;
    store.importing=true;
    if(!/\.(csv|txt)$/i.test(file.name)){ alert('Selecciona un fichero CSV.'); store.importing=false; try{input.value='';}catch(_){ } return; }
    notice(`Leyendo ${file.name}…`);
    try{
      const csvText=await file.text();
      const result=await api('/api/bank-reconciliation/import',{method:'POST',body:JSON.stringify({eventId:store.eventId,filename:file.name,csvText})});
      store.accountId=result.accountId||store.accountId;
      notice(`CSV incorporado: ${result.inserted} movimiento(s) nuevo(s), ${result.duplicates} repetido(s) omitido(s)${arr(result.warnings).length?` y ${result.warnings.length} aviso(s)`:''}.`,'ok');
      await load({force:true,preserveNotice:true});
    }catch(error){ notice(error.message,'error',true); }
    finally{ try{input.value='';}catch(_){ } store.importing=false; }
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
    if(editable&&(event.key==='Home'||event.key==='End')) return;
    if(event.target?.matches?.('select')) return;
    const body=$('ceBankBody'); if(!body) return;
    const page=Math.max(180,Math.round(body.clientHeight*.82));
    if(event.key==='PageDown'){event.preventDefault();body.scrollBy({top:page,behavior:'auto'});}
    else if(event.key==='PageUp'){event.preventDefault();body.scrollBy({top:-page,behavior:'auto'});}
    else if(event.key==='Home'){event.preventDefault();body.scrollTo({top:0,behavior:'auto'});}
    else if(event.key==='End'){event.preventDefault();body.scrollTo({top:body.scrollHeight,behavior:'auto'});}
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
      const id=activeEventId(); if(id&&id!==store.eventId){store.eventId=id;store.accountId='';store.filter='TODOS';store.search='';load({force:true});}
    }
  },true);
  const observer=root.MutationObserver?new MutationObserver(()=>{installDom();applyRole();}):null;
  if(observer) observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',installDom,{once:true});
  [0,100,500,1400].forEach(ms=>setTimeout(installDom,ms));
  root.ControlEventBankReconciliation={version:VERSION,open,close,load,exportData,parseMoney:num,state:store};
})(window);
