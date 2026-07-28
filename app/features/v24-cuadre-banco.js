/* ControlEvent v24_prod-02 · Cuadre Banco (solo GD). */
(function(root){
  'use strict';
  if(root.__ceV24BankReconciliation) return;
  root.__ceV24BankReconciliation = true;

  const VERSION = 'v24_prod-02';
  const $ = id => document.getElementById(id);
  const text = value => value == null ? '' : String(value).trim();
  const arr = value => Array.isArray(value) ? value : [];
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const num = value => { const n=Number(value); return Number.isFinite(n)?n:0; };
  const money = value => num(value).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
  const auth = () => root.ControlEventApp?.authUser || root.authUser || root.__CONTROL_EVENT_USER__ || {};
  const level = () => text(auth()?.nivel || auth()?.Nivel).toUpperCase();
  const isGd = () => level() === 'GD';
  const actor = () => {
    const user=auth()||{};
    return {nivel:level(),identificacion:text(user.identificacion||user.Identificacion),nombre:text(user.nombre||user.Nombre)};
  };
  const actorHeader = () => encodeURIComponent(JSON.stringify(actor()));
  const store = {loading:false,importing:false,data:null,accountId:'',filter:'TODOS',search:'',ticketMovement:null,tickets:[],openGestureAt:0,lastAction:'',lastActionAt:0};
  const TIP_ATTRS = ['title','data-ce-tip-v21','data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip','data-v181-tip','data-tip','data-ce-tip-layout-v21','data-tip-bg-v21'];

  async function api(path, options={}){
    const response=await fetch(path,{cache:'no-store',...options,headers:{'Content-Type':'application/json','X-ControlEvent-Feature':'cuadre-banco-v24','X-ControlEvent-Actor':actorHeader(),...(options.headers||{})}});
    let payload={};
    try{ payload=await response.json(); }catch(_){ payload={}; }
    if(!response.ok){ const error=new Error(payload?.error||`Error ${response.status} en Cuadre Banco`); error.status=response.status; error.code=payload?.code||''; throw error; }
    return payload;
  }
  function formatDate(value, includeTime=true){
    const raw=text(value).replace('T',' ');
    const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/);
    if(!m) return raw||'—';
    return `${m[3]}/${m[2]}/${m[1]}${includeTime&&m[4]?` ${m[4]}:${m[5]}`:''}`;
  }
  function statusInfo(row){
    if(row.justificationStatus==='CUADRADO') return {className:'ok',label:'Cuadrado'};
    if(row.justificationStatus==='PENDIENTE') return {className:'pending',label:`Faltan ${money(Math.max(0,row.difference))}`};
    if(row.justificationStatus==='EXCESO') return {className:'excess',label:`Exceso ${money(Math.abs(row.difference))}`};
    if(row.justificationStatus==='SIN_JUSTIFICAR') return {className:'none',label:'Sin justificar'};
    return {className:'na',label:'Ingreso / abono'};
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
  function triggerCsvPicker(event){
    stopEvent(event);
    const input=$('ceBankCsvFile');
    if(!input) return false;
    try{ input.value=''; }catch(_){ }
    try{
      if(typeof input.showPicker==='function') input.showPicker();
      else input.click();
    }catch(_){
      try{ setTimeout(()=>input.click(),0); }catch(__){ }
    }
    return false;
  }
  function bindInterfaceControls(overlay){
    if(!overlay || overlay.dataset.ceBankBound==='1') return;
    overlay.dataset.ceBankBound='1';
    $('ceBankClose')?.addEventListener('click',event=>{stopEvent(event);close();},true);
    $('ceBankImport')?.addEventListener('click',event=>{if(actionAllowed('csv-click',650))triggerCsvPicker(event);else stopEvent(event);},true);
    $('ceBankImport')?.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){if(actionAllowed('csv-key',650))triggerCsvPicker(event);else stopEvent(event);}},true);
    $('ceBankCsvFile')?.addEventListener('change',importCsv,true);
    $('ceBankRefresh')?.addEventListener('click',event=>{stopEvent(event);if(actionAllowed('refresh',450))load(true);},true);
    $('ceBankAccount')?.addEventListener('change',()=>{store.accountId=$('ceBankAccount').value;load(true);},true);
    $('ceBankFilter')?.addEventListener('change',()=>{store.filter=$('ceBankFilter').value;renderBody();},true);
    $('ceBankSearch')?.addEventListener('input',()=>{store.search=$('ceBankSearch').value;renderBody();},true);
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
            <div class="ce-bank-eyebrow"><span>CONTROL FINANCIERO</span><b><i></i> CONCILIACIÓN ACTIVA</b></div>
            <h2 id="ceBankTitle">Cuadre Banco</h2>
            <p>Convierte cada movimiento en una historia contable trazable hasta su último TKxx.</p>
          </div>
          <div class="ce-bank-header-balance"><span>Saldo de control</span><strong id="ceBankHeaderBalance">—</strong><small id="ceBankHeaderCount">Sincronizando movimientos</small></div>
          <button type="button" id="ceBankClose" class="ce-bank-close" aria-label="Cerrar Cuadre Banco"><span>×</span></button>
        </header>
        <div class="ce-bank-command-deck">
          <div class="ce-bank-command-primary">
            <label id="ceBankImport" class="ce-bank-import-btn" for="ceBankCsvFile" role="button" tabindex="0"><span>↑</span><b>Cargar CSV</b><small>Añade solo movimientos nuevos</small></label>
            <input id="ceBankCsvFile" class="ce-bank-file-native" type="file" accept=".csv,text/csv,.txt">
            <button type="button" id="ceBankRefresh" class="ce-bank-refresh-btn" aria-label="Actualizar movimientos"><span>↻</span><b>Actualizar</b></button>
          </div>
          <div class="ce-bank-command-fields">
            <label><span>Cuenta bancaria</span><select id="ceBankAccount"></select></label>
            <label><span>Vista de control</span><select id="ceBankFilter"><option value="TODOS">Todos los movimientos</option><option value="INCLUIDOS">Incluidos en saldo</option><option value="EXCLUIDOS">Fuera del saldo</option><option value="PENDIENTES">Pendientes de justificar</option><option value="CUADRADOS">Cuadrados</option></select></label>
            <label class="ce-bank-search"><span>Radar de búsqueda</span><div><i>⌕</i><input id="ceBankSearch" placeholder="Fecha, texto, importe o TKxx"></div></label>
          </div>
        </div>
        <div id="ceBankSummary" class="ce-bank-summary"></div>
        <div id="ceBankNotice" class="ce-bank-notice hidden"></div>
        <div class="ce-bank-ledger-caption"><span>CRONOLOGÍA BANCARIA</span><b>Movimiento</b><b>Concepto</b><b>Importe</b></div>
        <main id="ceBankBody" class="ce-bank-body"></main>
        <div id="ceBankTicketModal" class="ce-bank-ticket-overlay hidden"></div>
      </section>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click',event=>{ if(event.target===overlay) close(); },true);
      bindInterfaceControls(overlay);
    }
    bindInterfaceControls($('ceBankOverlay'));
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
  function applyRole(){
    document.querySelectorAll('.ce-bank-entry').forEach(node=>{
      const show=isGd(); node.classList.toggle('hidden',!show); node.style.display=show?'':'none'; node.disabled=!show; node.setAttribute('aria-hidden',show?'false':'true');
    });
    if(!isGd() && !$('ceBankOverlay')?.classList.contains('hidden')) close();
  }
  function notice(message,type=''){
    const node=$('ceBankNotice'); if(!node) return;
    node.textContent=message||''; node.className=`ce-bank-notice${message?'':' hidden'}${type?` ${type}`:''}`;
  }
  async function open(){
    installDom();
    if(!isGd()){ alert('Cuadre Banco es una opción exclusiva para usuarios GD.'); return false; }
    const overlay=$('ceBankOverlay');
    ensureInteractive();
    overlay.classList.remove('hidden');
    requestAnimationFrame(()=>{overlay.classList.add('visible');ensureInteractive();});
    document.body.classList.add('ce-bank-open');
    document.body.style.overflow='hidden';
    await load(false);
    return false;
  }
  function close(){
    const overlay=$('ceBankOverlay');
    overlay?.classList.remove('visible');
    $('ceBankTicketModal')?.classList.add('hidden');
    setTimeout(()=>overlay?.classList.add('hidden'),160);
    document.body.classList.remove('ce-bank-open');
    document.body.style.overflow='';
  }
  async function load(force,preserveNotice=false){
    if(store.loading) return;
    store.loading=true; if(!preserveNotice) notice('');
    $('ceBankBody').innerHTML='<div class="ce-bank-empty"><span class="ce-bank-loader"></span><strong>Sincronizando la cronología bancaria…</strong></div>';
    try{
      const query=store.accountId?`?accountId=${encodeURIComponent(store.accountId)}${force?`&_=${Date.now()}`:''}`:(force?`?_=${Date.now()}`:'');
      store.data=await api(`/api/bank-reconciliation${query}`);
      store.accountId=store.data.selectedAccount||store.accountId;
      render();
    }catch(error){
      $('ceBankSummary').innerHTML='';
      $('ceBankHeaderBalance').textContent='—';
      $('ceBankBody').innerHTML=`<div class="ce-bank-empty error"><strong>No se pudo abrir Cuadre Banco.</strong><span>${esc(error.message)}</span></div>`;
      if(error.code==='BANK_SCHEMA_MISSING') notice('Antes del primer uso ejecuta en Supabase el fichero ControlEvent_SQL_V24_PROD_CUADRE_BANCO.sql.','warning');
    }finally{store.loading=false;}
  }
  function render(){
    const data=store.data||{accounts:[],movements:[],summary:{}};
    const select=$('ceBankAccount');
    select.innerHTML=arr(data.accounts).map(account=>`<option value="${esc(account.id)}" ${account.id===store.accountId?'selected':''}>${esc(account.label||account.id)}</option>`).join('') || '<option value="">Sin movimientos</option>';
    const s=data.summary||{};
    const balanceClass=num(s.calculatedBalance)<0?'negative':'positive';
    $('ceBankHeaderBalance').textContent=money(s.calculatedBalance);
    $('ceBankHeaderBalance').className=balanceClass;
    $('ceBankHeaderCount').textContent=`${num(s.includedCount)} incluidos · ${num(s.excludedCount)} excluidos`;
    const flowMax=Math.max(Math.abs(num(s.income)),Math.abs(num(s.expense)),1);
    const incomePct=Math.round(Math.abs(num(s.income))/flowMax*100);
    const expensePct=Math.round(Math.abs(num(s.expense))/flowMax*100);
    $('ceBankSummary').innerHTML=`
      <article class="ce-bank-kpi ce-bank-kpi-hero ${balanceClass}">
        <div class="ce-bank-kpi-copy"><span>Saldo calculado</span><strong>${money(s.calculatedBalance)}</strong><small>Saldo inicial ${money(s.openingBalance)} + movimientos incluidos</small></div>
        <div class="ce-bank-orbit-visual" aria-hidden="true"><i></i><i></i><i></i><b>${balanceClass==='negative'?'−':'+'}</b></div>
      </article>
      <article class="ce-bank-kpi ce-bank-kpi-bank"><span>Saldo certificado por banco</span><strong>${money(s.latestBankBalance)}</strong><small>Último apunte ${formatDate(s.latestAt)}</small><div class="ce-bank-signal"><i></i><i></i><i></i><i></i><i></i></div></article>
      <article class="ce-bank-kpi ce-bank-kpi-flow"><span>Flujo incluido</span><div class="ce-bank-flow-row income"><b>Entradas</b><i><u style="width:${incomePct}%"></u></i><strong>${money(s.income)}</strong></div><div class="ce-bank-flow-row expense"><b>Salidas</b><i><u style="width:${expensePct}%"></u></i><strong>${money(s.expense)}</strong></div><small>Variación neta ${money(s.includedNet)}</small></article>
      <article class="ce-bank-kpi ce-bank-kpi-count"><span>Universo de movimientos</span><strong>${num(s.includedCount)} <em>/ ${num(s.movementCount)}</em></strong><small>${num(s.excludedCount)} fuera del conteo</small><div class="ce-bank-dots">${Array.from({length:Math.min(18,Math.max(1,num(s.movementCount)))},(_,i)=>`<i class="${i<num(s.includedCount)?'on':''}"></i>`).join('')}</div></article>`;
    renderBody();
  }
  function filteredMovements(){
    let rows=arr(store.data?.movements);
    if(store.filter==='INCLUIDOS') rows=rows.filter(row=>row.included);
    else if(store.filter==='EXCLUIDOS') rows=rows.filter(row=>!row.included);
    else if(store.filter==='PENDIENTES') rows=rows.filter(row=>row.amount<0&&row.justificationStatus!=='CUADRADO');
    else if(store.filter==='CUADRADOS') rows=rows.filter(row=>row.justificationStatus==='CUADRADO');
    const q=text(store.search).toLowerCase();
    if(q) rows=rows.filter(row=>[row.description,row.amount,row.bankBalance,formatDate(row.executedAt),...arr(row.links).flatMap(link=>[link.ticketCode,link.eventTitle,link.ticketAmount])].join(' ').toLowerCase().includes(q));
    return rows;
  }
  function renderBody(){
    const body=$('ceBankBody'); if(!body) return;
    const rows=filteredMovements();
    if(!rows.length){ body.innerHTML='<div class="ce-bank-empty"><strong>No hay movimientos en este radar.</strong><span>Prueba otra vista o cambia la búsqueda.</span></div>'; return; }
    body.innerHTML=rows.map((row,index)=>{
      const status=statusInfo(row);
      const amountClass=row.amount<0?'negative':'positive';
      const target=Math.max(0,num(row.targetAmount));
      const justified=Math.max(0,num(row.justifiedAmount));
      const progress=target?Math.min(100,Math.round(justified/target*100)):0;
      const links=arr(row.links).map(link=>`<span class="ce-bank-ticket-chip"><i>TK</i><b>${esc(link.ticketCode)}</b><span>${esc(link.eventTitle)}</span><strong>${money(link.ticketAmount)}</strong><button type="button" data-ce-bank-remove-link="${esc(link.id)}" aria-label="Quitar ${esc(link.ticketCode)}">×</button></span>`).join('');
      return `<article class="ce-bank-movement ${row.included?'included':'excluded'} ${amountClass}" data-movement-id="${esc(row.id)}" style="--ce-bank-progress:${progress}%">
        <div class="ce-bank-ledger-node"><span>${String(index+1).padStart(2,'0')}</span><i></i></div>
        <div class="ce-bank-movement-main">
          <label class="ce-bank-include"><input type="checkbox" data-ce-bank-included="${esc(row.id)}" ${row.included?'checked':''}><span><i></i></span><b>En saldo</b></label>
          <div class="ce-bank-date"><strong>${formatDate(row.executedAt)}</strong><small>Valor ${formatDate(row.valueDate,false)}</small></div>
          <div class="ce-bank-description"><div><span>${row.amount<0?'SALIDA':'ENTRADA'}</span><strong>${esc(row.description)}</strong></div><small>Saldo bancario después del apunte: <b>${money(row.bankBalance)}</b></small></div>
          <div class="ce-bank-amount ${amountClass}"><small>${row.amount<0?'DÉBITO':'CRÉDITO'}</small><strong>${money(row.amount)}</strong></div>
        </div>
        <div class="ce-bank-justification ${status.className}">
          <div class="ce-bank-justify-head"><div><span class="ce-bank-justify-icon">${row.amount<0?'⌁':'↗'}</span><div><strong>${row.amount<0?'Trazabilidad de compra':'Movimiento positivo conciliado'}</strong><span class="ce-bank-status ${status.className}">${esc(status.label)}</span></div></div>${row.amount<0?`<div class="ce-bank-justify-numbers"><b>${money(row.justifiedAmount)}</b><span>de ${money(row.targetAmount)}</span></div>`:''}</div>
          ${row.amount<0?`<div class="ce-bank-progress-track"><i></i><span>${progress}% justificado</span></div><div class="ce-bank-ticket-list">${links||'<span class="ce-bank-no-tickets">La órbita está vacía: añade el primer TKxx pagado.</span>'}</div><button type="button" class="ce-bank-add-ticket" data-ce-bank-add-ticket="${esc(row.id)}"><span>＋</span><b>Vincular TKxx pagado</b></button>`:'<p class="ce-bank-positive-note">Este abono alimenta directamente el saldo y no necesita tickets de compra asociados.</p>'}
        </div>
      </article>`;
    }).join('');
  }
  async function importCsv(event){
    if(store.importing) return;
    const input=event?.target||$('ceBankCsvFile');
    const file=input?.files?.[0]; if(!file) return;
    store.importing=true;
    if(!/\.(csv|txt)$/i.test(file.name)){ alert('Selecciona un fichero CSV.'); store.importing=false; try{input.value='';}catch(_){ } return; }
    notice(`Leyendo ${file.name}…`);
    try{
      const csvText=await file.text();
      const result=await api('/api/bank-reconciliation/import',{method:'POST',body:JSON.stringify({filename:file.name,csvText})});
      store.accountId=result.accountId||store.accountId;
      notice(`CSV incorporado: ${result.inserted} movimiento(s) nuevo(s), ${result.duplicates} repetido(s) omitido(s)${arr(result.warnings).length?` y ${result.warnings.length} aviso(s)`:''}.`,'ok');
      await load(true,true);
    }catch(error){ notice(error.message,'error'); }
    finally{ try{input.value='';}catch(_){ } store.importing=false; }
  }
  async function toggleIncluded(id,included,input){
    input.disabled=true;
    try{ await api(`/api/bank-reconciliation/movements/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({included})}); await load(true); }
    catch(error){ input.checked=!included; notice(error.message,'error'); }
    finally{input.disabled=false;}
  }
  async function openTicketPicker(movementId){
    store.ticketMovement=movementId;
    const modal=$('ceBankTicketModal');
    modal.classList.remove('hidden');
    modal.innerHTML='<div class="ce-bank-ticket-modal"><div class="ce-bank-ticket-modal-head"><div class="ce-bank-ticket-modal-icon">TK</div><div><span>ENLAZAR JUSTIFICANTE</span><h3>Añadir TKxx pagado</h3><p>Un ticket solo puede orbitar alrededor de un movimiento bancario.</p></div><button type="button" data-ce-bank-close-tickets aria-label="Cerrar">×</button></div><label class="ce-bank-ticket-search"><i>⌕</i><input id="ceBankTicketSearch" placeholder="Buscar por TKxx, evento, tienda o responsable"></label><div id="ceBankTicketChoices" class="ce-bank-ticket-choices"><div class="ce-bank-empty"><span class="ce-bank-loader"></span><strong>Cargando tickets pagados…</strong></div></div></div>';
    modal.querySelector('[data-ce-bank-close-tickets]').addEventListener('click',()=>modal.classList.add('hidden'));
    modal.addEventListener('click',event=>{if(event.target===modal) modal.classList.add('hidden');},{once:true});
    const input=$('ceBankTicketSearch'); input.addEventListener('input',()=>renderTicketChoices(input.value));
    try{ const result=await api(`/api/bank-reconciliation/paid-tickets?movementId=${encodeURIComponent(movementId)}`); store.tickets=arr(result.items); renderTicketChoices(''); input.focus(); }
    catch(error){ $('ceBankTicketChoices').innerHTML=`<div class="ce-bank-empty error"><strong>${esc(error.message)}</strong></div>`; }
  }
  function renderTicketChoices(query){
    const node=$('ceBankTicketChoices'); if(!node) return;
    const q=text(query).toLowerCase();
    const items=store.tickets.filter(item=>!q||[item.ticketCode,item.eventTitle,...arr(item.stores),...arr(item.responsibles)].join(' ').toLowerCase().includes(q));
    node.innerHTML=items.map(item=>`<button type="button" class="ce-bank-ticket-choice ${item.linked?'linked':''}" data-event-id="${esc(item.eventId)}" data-ticket-code="${esc(item.ticketCode)}" ${item.linked?'disabled':''}><i>TK</i><span><b>${esc(item.ticketCode)}</b><strong>${esc(item.eventTitle)}</strong><small>${esc(arr(item.stores).join(', ')||'Sin tienda')} · ${item.lineCount} línea(s)</small></span><em>${money(item.amount)}</em>${item.linked?'<u>Ya vinculado</u>':'<u>Vincular →</u>'}</button>`).join('')||'<div class="ce-bank-empty"><strong>No hay TKxx pagados disponibles.</strong></div>';
  }
  async function addTicket(eventId,ticketCode,button){
    button.disabled=true;
    try{ await api(`/api/bank-reconciliation/movements/${encodeURIComponent(store.ticketMovement)}/tickets`,{method:'POST',body:JSON.stringify({eventId,ticketCode})}); $('ceBankTicketModal').classList.add('hidden'); await load(true); }
    catch(error){ notice(error.message,'error'); button.disabled=false; }
  }
  async function removeLink(linkId,button){
    if(!confirm('¿Quitar este TKxx de la justificación bancaria?')) return;
    button.disabled=true;
    try{ await api(`/api/bank-reconciliation/ticket-links/${encodeURIComponent(linkId)}`,{method:'DELETE'}); await load(true); }
    catch(error){ notice(error.message,'error'); button.disabled=false; }
  }
  async function exportData(options={}){
    const params=new URLSearchParams();
    if(options.accountId||store.accountId) params.set('accountId',options.accountId||store.accountId);
    if(options.eventId) params.set('eventId',options.eventId);
    return api(`/api/bank-reconciliation/export${params.toString()?`?${params}`:''}`);
  }
  function openFromEntry(event){
    const target=event?.target?.closest?.('#btnOpenBankReconciliation,[data-ce-open-bank="1"]');
    if(!target) return true;
    try{event.preventDefault?.();event.stopPropagation?.();event.stopImmediatePropagation?.();}catch(_){ }
    purgeTooltip(target);
    const now=Date.now();
    if(now-store.openGestureAt<350) return false;
    store.openGestureAt=now;
    open();
    return false;
  }
  root.ceOpenCuadreBanco=openFromEntry;
  root.addEventListener('click',event=>{if(event.target?.closest?.('#btnOpenBankReconciliation,[data-ce-open-bank="1"]'))openFromEntry(event);},true);

  function captureBankControls(event){
    const overlay=$('ceBankOverlay');
    if(!overlay || overlay.classList.contains('hidden')) return;
    const target=event.target?.closest?.('#ceBankClose,#ceBankImport,#ceBankRefresh');
    if(!target) return;
    if(target.id==='ceBankClose'){
      stopEvent(event);
      if(actionAllowed('close',300)) close();
      return;
    }
    if(target.id==='ceBankImport'){
      stopEvent(event);
      if(actionAllowed('csv-global',700)) triggerCsvPicker(event);
      return;
    }
    if(target.id==='ceBankRefresh'){
      stopEvent(event);
      if(actionAllowed('refresh-global',450)) load(true);
    }
  }
  ['pointerdown','mousedown','touchend','click'].forEach(type=>root.addEventListener(type,captureBankControls,true));
  root.addEventListener('change',event=>{
    const target=event.target;
    if(target?.id==='ceBankCsvFile'){ importCsv(event); return; }
    if(target?.id==='ceBankAccount'){ store.accountId=target.value; load(true); return; }
    if(target?.id==='ceBankFilter'){ store.filter=target.value; renderBody(); }
  },true);
  root.addEventListener('input',event=>{if(event.target?.id==='ceBankSearch'){store.search=event.target.value;renderBody();}},true);

  document.addEventListener('click',event=>{
    const included=event.target?.closest?.('[data-ce-bank-included]');
    if(included){toggleIncluded(included.dataset.ceBankIncluded,included.checked,included);return;}
    const add=event.target?.closest?.('[data-ce-bank-add-ticket]');
    if(add){openTicketPicker(add.dataset.ceBankAddTicket);return;}
    const remove=event.target?.closest?.('[data-ce-bank-remove-link]');
    if(remove){removeLink(remove.dataset.ceBankRemoveLink,remove);return;}
    const choice=event.target?.closest?.('.ce-bank-ticket-choice[data-ticket-code]');
    if(choice&&!choice.disabled){addTicket(choice.dataset.eventId,choice.dataset.ticketCode,choice);return;}
  },true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('ceBankOverlay')?.classList.contains('hidden')){if(!$('ceBankTicketModal')?.classList.contains('hidden'))$('ceBankTicketModal').classList.add('hidden');else close();}},true);
  const observer=root.MutationObserver?new MutationObserver(()=>{installDom();applyRole();}):null;
  if(observer) observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',installDom,{once:true});
  [0,100,500,1400].forEach(ms=>setTimeout(installDom,ms));
  root.ControlEventBankReconciliation={version:VERSION,open,close,load,exportData,parseMoney:num,state:store};
})(window);
