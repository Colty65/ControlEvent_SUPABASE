/* ControlEvent v24_prod · Cuadre Banco (solo GD). */
(function(root){
  'use strict';
  if(root.__ceV24BankReconciliation) return;
  root.__ceV24BankReconciliation = true;

  const VERSION = 'v24_prod';
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
  const store = {loading:false,data:null,accountId:'',filter:'TODOS',search:'',ticketMovement:null,tickets:[]};

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
  function installDom(){
    if(!$('btnOpenBankReconciliation')){
      const footer=document.querySelector('.footer .footer-inner');
      const maintenance=$('btnToggleMaintenance');
      if(footer){
        const btn=document.createElement('button');
        btn.type='button'; btn.id='btnOpenBankReconciliation'; btn.className='iconbtn outline ce-bank-entry hidden'; btn.title='Cuadre Banco'; btn.setAttribute('aria-label','Cuadre Banco');
        btn.innerHTML='<img class="footer-img" alt="Cuadre Banco" src="./assets/icons/cuadre-banco.svg">';
        footer.insertBefore(btn,maintenance||null);
      }
    }
    if(!$('ceBankOverlay')){
      const overlay=document.createElement('div');
      overlay.id='ceBankOverlay'; overlay.className='ce-bank-overlay hidden';
      overlay.innerHTML=`<section class="ce-bank-window" role="dialog" aria-modal="true" aria-labelledby="ceBankTitle">
        <header class="ce-bank-header"><img src="./assets/icons/cuadre-banco.svg" alt=""><div><h2 id="ceBankTitle">Cuadre Banco</h2><p>Movimientos, saldo de control y justificación con TKxx pagados</p></div><button type="button" id="ceBankClose" class="ce-bank-close" aria-label="Cerrar">×</button></header>
        <div class="ce-bank-toolbar">
          <button type="button" id="ceBankImport">⬆ Cargar CSV</button><input id="ceBankCsvFile" type="file" accept=".csv,text/csv" hidden>
          <button type="button" id="ceBankRefresh" class="outline">↻ Actualizar</button>
          <label><span>Cuenta</span><select id="ceBankAccount"></select></label>
          <label><span>Mostrar</span><select id="ceBankFilter"><option value="TODOS">Todos</option><option value="INCLUIDOS">Incluidos en saldo</option><option value="EXCLUIDOS">Fuera del saldo</option><option value="PENDIENTES">Pendientes de justificar</option><option value="CUADRADOS">Cuadrados</option></select></label>
          <label class="ce-bank-search"><span>Buscar</span><input id="ceBankSearch" placeholder="Fecha, texto, importe o TKxx"></label>
        </div>
        <div id="ceBankSummary" class="ce-bank-summary"></div>
        <div id="ceBankNotice" class="ce-bank-notice hidden"></div>
        <main id="ceBankBody" class="ce-bank-body"></main>
        <div id="ceBankTicketModal" class="ce-bank-ticket-overlay hidden"></div>
      </section>`;
      document.body.appendChild(overlay);
      $('ceBankClose').addEventListener('click',close);
      overlay.addEventListener('click',event=>{ if(event.target===overlay) close(); });
      $('ceBankImport').addEventListener('click',()=>$('ceBankCsvFile').click());
      $('ceBankCsvFile').addEventListener('change',importCsv);
      $('ceBankRefresh').addEventListener('click',()=>load(true));
      $('ceBankAccount').addEventListener('change',()=>{store.accountId=$('ceBankAccount').value;load(true);});
      $('ceBankFilter').addEventListener('change',()=>{store.filter=$('ceBankFilter').value;renderBody();});
      $('ceBankSearch').addEventListener('input',()=>{store.search=$('ceBankSearch').value;renderBody();});
    }
    installMobileEntry();
    applyRole();
  }
  function installMobileEntry(){
    const drawer=$('ceMobileDrawer');
    if(!drawer || drawer.querySelector('[data-ce-open-bank="1"]')) return;
    const grids=Array.from(drawer.querySelectorAll('.mobile-menu-grid'));
    const tools=grids.find(grid=>grid.querySelector('[data-target="btnExportExcel"],[data-target="btnExportSeed"],[data-target="btnOpenImport"]')) || grids[1] || grids[0];
    if(!tools) return;
    const btn=document.createElement('button');
    btn.type='button'; btn.className='mobile-menu-action ce-bank-entry hidden'; btn.dataset.ceOpenBank='1'; btn.innerHTML='<span class="mi">🏦</span>Cuadre Banco';
    tools.appendChild(btn);
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
    if(!isGd()){ alert('Cuadre Banco es una opción exclusiva para usuarios GD.'); return; }
    $('ceBankOverlay').classList.remove('hidden'); document.body.style.overflow='hidden';
    await load(false);
  }
  function close(){
    $('ceBankOverlay')?.classList.add('hidden'); $('ceBankTicketModal')?.classList.add('hidden'); document.body.style.overflow='';
  }
  async function load(force){
    if(store.loading) return;
    store.loading=true; notice('');
    $('ceBankBody').innerHTML='<div class="ce-bank-empty">Cargando movimientos bancarios…</div>';
    try{
      const query=store.accountId?`?accountId=${encodeURIComponent(store.accountId)}${force?`&_=${Date.now()}`:''}`:(force?`?_=${Date.now()}`:'');
      store.data=await api(`/api/bank-reconciliation${query}`);
      store.accountId=store.data.selectedAccount||store.accountId;
      render();
    }catch(error){
      $('ceBankSummary').innerHTML='';
      $('ceBankBody').innerHTML=`<div class="ce-bank-empty error"><strong>No se pudo abrir Cuadre Banco.</strong><br>${esc(error.message)}</div>`;
      if(error.code==='BANK_SCHEMA_MISSING') notice('Antes del primer uso ejecuta en Supabase el fichero ControlEvent_SQL_V24_PROD_CUADRE_BANCO.sql.','warning');
    }finally{store.loading=false;}
  }
  function render(){
    const data=store.data||{accounts:[],movements:[],summary:{}};
    const select=$('ceBankAccount');
    select.innerHTML=arr(data.accounts).map(account=>`<option value="${esc(account.id)}" ${account.id===store.accountId?'selected':''}>${esc(account.label||account.id)}</option>`).join('') || '<option value="">Sin movimientos</option>';
    const s=data.summary||{};
    const balanceClass=num(s.calculatedBalance)<0?'negative':'positive';
    $('ceBankSummary').innerHTML=`
      <article class="ce-bank-kpi ${balanceClass}"><span>Saldo calculado</span><strong>${money(s.calculatedBalance)}</strong><small>Saldo inicial ${money(s.openingBalance)} + movimientos incluidos</small></article>
      <article class="ce-bank-kpi"><span>Saldo del banco</span><strong>${money(s.latestBankBalance)}</strong><small>Último movimiento ${formatDate(s.latestAt)}</small></article>
      <article class="ce-bank-kpi"><span>Entradas / salidas incluidas</span><strong>${money(s.income)} / ${money(s.expense)}</strong><small>Variación neta ${money(s.includedNet)}</small></article>
      <article class="ce-bank-kpi"><span>Movimientos</span><strong>${num(s.includedCount)} de ${num(s.movementCount)}</strong><small>${num(s.excludedCount)} fuera del conteo</small></article>`;
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
    if(!rows.length){ body.innerHTML='<div class="ce-bank-empty">No hay movimientos que coincidan con el filtro.</div>'; return; }
    body.innerHTML=rows.map(row=>{
      const status=statusInfo(row);
      const amountClass=row.amount<0?'negative':'positive';
      const links=arr(row.links).map(link=>`<span class="ce-bank-ticket-chip"><b>${esc(link.ticketCode)}</b><span>${esc(link.eventTitle)}</span><strong>${money(link.ticketAmount)}</strong><button type="button" data-ce-bank-remove-link="${esc(link.id)}" title="Quitar vínculo">×</button></span>`).join('');
      return `<article class="ce-bank-movement ${row.included?'included':'excluded'}" data-movement-id="${esc(row.id)}">
        <div class="ce-bank-movement-main">
          <label class="ce-bank-include"><input type="checkbox" data-ce-bank-included="${esc(row.id)}" ${row.included?'checked':''}><span>En saldo</span></label>
          <div class="ce-bank-date"><strong>${formatDate(row.executedAt)}</strong><small>Valor: ${formatDate(row.valueDate,false)}</small></div>
          <div class="ce-bank-description"><strong>${esc(row.description)}</strong><small>Saldo banco tras movimiento: ${money(row.bankBalance)}</small></div>
          <div class="ce-bank-amount ${amountClass}">${money(row.amount)}</div>
        </div>
        <div class="ce-bank-justification ${status.className}">
          <div class="ce-bank-justify-head"><div><strong>${row.amount<0?'Justificación mediante TKxx pagados':'Movimiento positivo'}</strong><span class="ce-bank-status ${status.className}">${esc(status.label)}</span></div>${row.amount<0?`<div class="ce-bank-justify-numbers"><b>${money(row.justifiedAmount)}</b> de ${money(row.targetAmount)}</div>`:''}</div>
          ${row.amount<0?`<div class="ce-bank-ticket-list">${links||'<span class="ce-bank-no-tickets">Todavía no se ha asociado ningún TKxx.</span>'}</div><button type="button" class="outline small" data-ce-bank-add-ticket="${esc(row.id)}">＋ Añadir TK pagado</button>`:'<p class="ce-bank-positive-note">Los abonos e ingresos participan en el saldo, pero no requieren justificación con tickets de compra.</p>'}
        </div>
      </article>`;
    }).join('');
  }
  async function importCsv(event){
    const file=event.target.files?.[0]; event.target.value=''; if(!file) return;
    if(!/\.csv$/i.test(file.name)){ alert('Selecciona un fichero CSV.'); return; }
    notice(`Leyendo ${file.name}…`);
    try{
      const csvText=await file.text();
      const result=await api('/api/bank-reconciliation/import',{method:'POST',body:JSON.stringify({filename:file.name,csvText})});
      store.accountId=result.accountId||store.accountId;
      notice(`CSV incorporado: ${result.inserted} movimiento(s) nuevo(s), ${result.duplicates} repetido(s) omitido(s)${arr(result.warnings).length?` y ${result.warnings.length} aviso(s)`:''}.`,'ok');
      await load(true);
    }catch(error){ notice(error.message,'error'); }
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
    modal.classList.remove('hidden'); modal.innerHTML='<div class="ce-bank-ticket-modal"><div class="ce-bank-ticket-modal-head"><div><h3>Añadir TKxx pagado</h3><p>Un TKxx solo puede justificar un movimiento bancario.</p></div><button type="button" data-ce-bank-close-tickets>×</button></div><input id="ceBankTicketSearch" placeholder="Buscar por TKxx, evento, tienda o responsable"><div id="ceBankTicketChoices" class="ce-bank-ticket-choices"><div class="ce-bank-empty">Cargando tickets pagados…</div></div></div>';
    modal.querySelector('[data-ce-bank-close-tickets]').addEventListener('click',()=>modal.classList.add('hidden'));
    modal.addEventListener('click',event=>{if(event.target===modal) modal.classList.add('hidden');},{once:true});
    const input=$('ceBankTicketSearch'); input.addEventListener('input',()=>renderTicketChoices(input.value));
    try{ const result=await api(`/api/bank-reconciliation/paid-tickets?movementId=${encodeURIComponent(movementId)}`); store.tickets=arr(result.items); renderTicketChoices(''); input.focus(); }
    catch(error){ $('ceBankTicketChoices').innerHTML=`<div class="ce-bank-empty error">${esc(error.message)}</div>`; }
  }
  function renderTicketChoices(query){
    const node=$('ceBankTicketChoices'); if(!node) return;
    const q=text(query).toLowerCase();
    const items=store.tickets.filter(item=>!q||[item.ticketCode,item.eventTitle,...arr(item.stores),...arr(item.responsibles)].join(' ').toLowerCase().includes(q));
    node.innerHTML=items.map(item=>`<button type="button" class="ce-bank-ticket-choice ${item.linked?'linked':''}" data-event-id="${esc(item.eventId)}" data-ticket-code="${esc(item.ticketCode)}" ${item.linked?'disabled':''}><span><b>${esc(item.ticketCode)}</b><strong>${esc(item.eventTitle)}</strong><small>${esc(arr(item.stores).join(', ')||'Sin tienda')} · ${item.lineCount} línea(s)</small></span><em>${money(item.amount)}</em>${item.linked?'<i>Ya vinculado</i>':''}</button>`).join('')||'<div class="ce-bank-empty">No hay TKxx pagados disponibles.</div>';
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

  document.addEventListener('click',event=>{
    const openTarget=event.target?.closest?.('#btnOpenBankReconciliation,[data-ce-open-bank="1"]');
    if(openTarget){event.preventDefault();event.stopPropagation();open();return;}
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
  [100,500,1400].forEach(ms=>setTimeout(installDom,ms));
  root.ControlEventBankReconciliation={version:VERSION,open,close,load,exportData,parseMoney:num,state:store};
})(window);
