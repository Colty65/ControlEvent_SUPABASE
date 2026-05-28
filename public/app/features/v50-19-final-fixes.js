/* ControlEvent v50.19 - estabilización final de login, selección de evento y globos.
   Objetivo: no sumar capas conflictivas. Se apoya en v44-7-event-switcher como único flujo de evento.
   - La app siempre arranca pidiendo login: se desactiva la reanudación automática por localStorage.
   - Tras login: pantalla CE grande + selector "Selecciona evento...", sin evento precargado.
   - Al elegir/cambiar evento: rehidrata módulos y globos sin tocar justificantes de INGRESOS.
   - Globos de Resumen: miniatura Just. abre el visor estable v46.9; bloqueo de apertura accidental de la primera foto.
   - Dock móvil: Refres / Salir abajo a la derecha.
*/
(function(){
  'use strict';
  const VERSION = 'ControlEvent v50.19';
  const VERSION_FILE = 'ControlEvent_v50_19';
  const INSTALLED = '__ceV5019FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const SESSION_KEY = 'ControlEvent_v26_9_session';
  const SELECT_KEY = 'controlevent_v229_selected_event_id';
  const DOCK_ID = 'ceMobileActionDockV518';
  const STYLE_ID = 'ceV5019FinalStyle';
  const BUDGET_TIP_ID = 'ceBudgetLiteTooltipV307';
  const TABS = ['ingresos','donaciones','compras','mapa','planificacion','resumen','graficas'];
  const PANEL_BY_TAB = {ingresos:'tabIngresos',donaciones:'tabDonaciones',compras:'tabCompras',mapa:'tabMapaProductos',planificacion:'tabPlanificacionInicial',resumen:'tabResumen',graficas:'tabGraficas'};
  const BUTTON_BY_TAB = {ingresos:'tabIngresosBtn',donaciones:'tabDonacionesBtn',compras:'tabComprasBtn',mapa:'tabMapaBtn',planificacion:'tabPlanificacionBtn',resumen:'tabResumenBtn',graficas:'tabGraficasBtn'};
  const CHOSEN_KEYS = ['controlevent_v44_event_chosen_after_login','ControlEvent_v25_event_chosen','ce_v5017_event_chosen','ce_v5016_event_chosen','ce_v5015_event_chosen','ce_v5013_user_picked_event'];
  const AWAITING_CLASSES = ['ce-v44-awaiting-event','ce-v5013-force-event-choice','ce-v5015-awaiting-event','ce-v5017-awaiting-event','ce-v5019-awaiting-event'];
  const OLD_DOCKS = ['ceMobileActionDockV508','ceMobileActionDockV514','ceMobileActionDockV517'];

  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const stop = ev => { try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; };
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const getLexical = name => safe(() => Function('return (typeof '+name+' !== "undefined") ? '+name+' : undefined;')(), undefined);
  const setLexical = (name, value) => safe(() => Function('value', name + ' = value;')(value), undefined);
  const getFn = name => safe(() => (typeof window[name] === 'function') ? window[name] : Function('return (typeof '+name+' === "function") ? '+name+' : null;')(), null);
  const call = (name, args) => { const fn = getFn(name); if(typeof fn !== 'function') return undefined; try{ return fn.apply(window, args || []); }catch(error){ console.warn('[v50.19] Error en '+name, error); return undefined; } };
  const st = () => getLexical('state') || window.state || window.ControlEventApp?.state || {};
  const auth = () => getLexical('authUser') || window.authUser || window.ControlEventApp?.authUser || null;
  const arr = k => Array.isArray(st()[k]) ? st()[k] : [];
  const eventById = id => arr('eventos').find(e => String(e.id || '') === String(id || '')) || null;
  const hasValidEvent = id => !!eventById(id == null ? st().selectedEventId : id);
  const currentEventId = () => String(st().selectedEventId || $('selectedEvent')?.value || '');
  const isMobileLike = () => safe(() => window.matchMedia('(max-width: 900px)').matches, window.innerWidth <= 900) || /iPad|iPhone|Android/i.test(navigator.userAgent || '');
  const role = () => up(auth()?.nivel || '');
  const isRO = () => role() === 'RO';

  let loginStateFetchPending = false;
  let loginFlowActiveUntil = 0;
  let lastThumbOpenAt = 0;
  let lastEventSelectedAt = 0;

  function removeSession(){ safe(() => localStorage.removeItem(SESSION_KEY), null); }
  // Ejecutar inmediatamente, antes de los temporizadores de reanudación de sesión del legacy.
  removeSession();

  function applyVersion(){
    try{
      document.title = VERSION;
      document.documentElement.dataset.ceVersion = VERSION;
      if(document.body) document.body.dataset.ceVersion = VERSION;
      window.__ceVersion = VERSION;
      window.VERSION = VERSION;
      window.VERSION_FILE = VERSION_FILE;
      window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE};
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
        const text = el.textContent || '';
        if(/ControlEvent\s+v\d+(?:\.\d+)*/i.test(text)) el.textContent = text.replace(/ControlEvent\s+v\d+(?:\.\d+)*/ig, VERSION);
      });
    }catch(_){ }
  }

  function injectStyle(){
    if($(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      ${OLD_DOCKS.map(id => '#'+id).join(',')}{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      #${DOCK_ID}{display:none;visibility:hidden;position:fixed!important;right:calc(env(safe-area-inset-right,0px) + 1px)!important;bottom:calc(env(safe-area-inset-bottom,0px) + 2px)!important;left:auto!important;top:auto!important;z-index:190000!important;flex-direction:column!important;gap:2px!important;align-items:flex-end!important;justify-content:flex-end!important;opacity:.58!important;pointer-events:none!important;}
      #${DOCK_ID}:active,#${DOCK_ID}:focus-within{opacity:.98!important;}
      #${DOCK_ID} button{pointer-events:auto!important;touch-action:manipulation!important;appearance:none!important;-webkit-appearance:none!important;width:52px!important;min-width:52px!important;height:27px!important;min-height:27px!important;border-radius:999px!important;border:1px solid rgba(15,23,42,.16)!important;background:rgba(255,255,255,.72)!important;color:#111827!important;box-shadow:0 4px 12px rgba(15,23,42,.14)!important;font-size:10px!important;font-weight:900!important;line-height:1!important;margin:0!important;padding:0 5px!important;backdrop-filter:blur(4px)!important;-webkit-backdrop-filter:blur(4px)!important;}
      body.auth-locked #${DOCK_ID},body.ce-v5019-logged-out #${DOCK_ID},body:not(.ce-v5019-authenticated) #${DOCK_ID}{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      @media(min-width:901px){#${DOCK_ID}{display:none!important;visibility:hidden!important;}}
      body.ce-v5019-awaiting-event #noEventMessage{display:flex!important;align-items:center!important;justify-content:center!important;min-height:48vh!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;}
      body.ce-v5019-awaiting-event #selectedEvent{outline:2px solid rgba(245,158,11,.72)!important;box-shadow:0 0 0 4px rgba(245,158,11,.14)!important;}
      .ce-v5019-welcome{width:min(560px,92vw);margin:22px auto;text-align:center;padding:30px 22px;border-radius:28px;background:rgba(255,255,255,.92);box-shadow:0 20px 50px rgba(15,23,42,.12);border:1px solid rgba(148,163,184,.22);}
      .ce-v5019-welcome img{display:block;width:min(220px,52vw);height:auto;margin:0 auto 18px auto;border-radius:34px;filter:drop-shadow(0 16px 28px rgba(15,23,42,.24));}
      .ce-v5019-welcome h2{margin:0 0 8px 0;font-size:clamp(21px,3.2vw,31px);letter-spacing:-.02em;color:#0f172a;}
      .ce-v5019-welcome p{margin:0;color:#475569;font-size:15px;line-height:1.45;}
      #${BUDGET_TIP_ID}.open{pointer-events:auto!important;z-index:4200!important;}
      #${BUDGET_TIP_ID} .ce-budget-lite-close{position:sticky!important;top:0!important;float:right!important;z-index:14!important;min-width:44px!important;min-height:44px!important;font-size:26px!important;line-height:1!important;touch-action:manipulation!important;}
      #${BUDGET_TIP_ID} .ce-budget-lite-table-wrap{overflow:auto!important;-webkit-overflow-scrolling:touch!important;max-width:100%!important;}
      #${BUDGET_TIP_ID} .ce-v465-tip-thumb{touch-action:manipulation!important;pointer-events:auto!important;}
      .ce-v468-modal{touch-action:manipulation!important;}
      .ce-v468-modal [data-close]{touch-action:manipulation!important;min-height:42px!important;min-width:72px!important;}
      #productosList .ce-v468-modified-product,#productosList .ce-v468-modified-product *,
      #productosList .ce-v500-product-modified,#productosList .ce-v500-product-modified *,
      #productosList .ce-v501-product-modified,#productosList .ce-v501-product-modified *,
      #productosList .ce-v502-product-modified,#productosList .ce-v502-product-modified *,
      #productosList .ce-v46-modified,#productosList .ce-v46-modified *,
      #productosList .ce-v464-modified,#productosList .ce-v464-modified *{font-weight:400!important;animation:none!important;transition:none!important;filter:none!important;}
      #productosList .rowline,#productosList .itemcard,#productosList .card,#productosList [class*="product"]{animation:none!important;transition:none!important;filter:none!important;}
    `;
    document.head.appendChild(style);
  }

  function clearChosen(){ CHOSEN_KEYS.forEach(k => safe(() => sessionStorage.removeItem(k), null)); }
  function markChosen(){ CHOSEN_KEYS.forEach(k => safe(() => sessionStorage.setItem(k, '1'), null)); }
  function forgetEvent(){ safe(() => sessionStorage.removeItem(SELECT_KEY), null); safe(() => localStorage.removeItem(SELECT_KEY), null); }
  function rememberEvent(id){ if(hasValidEvent(id)){ safe(() => sessionStorage.setItem(SELECT_KEY, String(id)), null); safe(() => localStorage.setItem(SELECT_KEY, String(id)), null); } }
  function roleAllowsTab(tab){
    if(!auth()) return false;
    if(isRO()) return ['resumen','mapa','graficas'].includes(String(tab || ''));
    if(String(tab || '') === 'planificacion') return role() === 'GD';
    return TABS.includes(String(tab || ''));
  }
  function currentTab(){
    const lexical = safe(() => (typeof currentMainTab !== 'undefined' ? currentMainTab : ''), '');
    if(TABS.includes(String(lexical))) return String(lexical);
    const visible = TABS.find(tab => { const p=$(PANEL_BY_TAB[tab]); return p && !p.classList.contains('hidden'); });
    return visible || (isRO() ? 'resumen' : 'graficas');
  }
  function setTab(tab){
    let next = TABS.includes(String(tab)) ? String(tab) : (isRO() ? 'resumen' : 'graficas');
    if(auth() && !roleAllowsTab(next)) next = isRO() ? 'resumen' : 'graficas';
    setLexical('currentMainTab', next);
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = next; }catch(_){ }
    try{ window.__ceCurrentMainTab = next; }catch(_){ }
    return next;
  }

  function ensureEventPlaceholder(){
    const sel = $('selectedEvent');
    if(!sel) return;
    let opt = sel.querySelector('option[value=""]');
    if(!opt){ opt = document.createElement('option'); opt.value = ''; sel.insertBefore(opt, sel.firstChild); }
    opt.textContent = arr('eventos').length ? 'Selecciona evento...' : 'Cargando eventos...';
    if(!hasValidEvent()) sel.value = '';
    sel.disabled = false;
    sel.style.pointerEvents = 'auto';
    sel.style.opacity = '1';
  }
  function clearDynamicPanels(){
    ['ingresosSummaryGrid','collabList','donacionesList','comprasList','mapaProductosSummary','mapaProductosList','budgetLayout','summarySegmento','summaryDestino','summaryTiendaTicket','eventChartWrap'].forEach(id => {
      const el = $(id); if(!el) return; try{ el.replaceChildren(); }catch(_){ el.innerHTML = ''; }
    });
  }
  function showAwaitingEvent(reason){
    if(!auth()) return false;
    const s = st(); if(s) s.selectedEventId = '';
    const sel = $('selectedEvent'); if(sel) sel.value = '';
    clearChosen(); forgetEvent();
    injectStyle(); applyVersion(); ensureEventPlaceholder();
    try{
      document.body.classList.remove('auth-locked','ce-v5019-logged-out','ce-v5019-has-event');
      document.body.classList.add('ce-v5019-authenticated','ce-v5019-awaiting-event','ce-v44-awaiting-event');
      ['ce-v5013-force-event-choice','ce-v5015-awaiting-event','ce-v5017-awaiting-event'].forEach(c => document.body.classList.remove(c));
    }catch(_){ }
    Object.values(PANEL_BY_TAB).forEach(id => $(id)?.classList.add('hidden'));
    const msg = $('noEventMessage');
    if(msg){
      msg.classList.remove('hidden');
      msg.innerHTML = '<div class="ce-v5019-welcome"><img src="./assets/icons/controlevent-welcome-v44.png" alt="ControlEvent"><h2>Selecciona un evento para trabajar</h2><p>Elige el evento en el desplegable superior para cargar los datos y activar todos los globos.</p></div>';
    }
    clearDynamicPanels();
    ensureMobileDock();
    try{ window.ControlEventV447?.install?.(); }catch(_){ }
    return true;
  }
  function hideLoginOverlay(){
    if(!auth()) return;
    try{ document.body.classList.remove('auth-locked','ce-v5019-logged-out'); document.body.classList.add('ce-v5019-authenticated'); }catch(_){ }
    const ov = $('authOverlay');
    if(ov){
      ov.classList.add('hidden'); ov.setAttribute('aria-hidden','true');
      ov.style.setProperty('display','none','important'); ov.style.setProperty('visibility','hidden','important'); ov.style.setProperty('opacity','0','important'); ov.style.setProperty('pointer-events','none','important');
    }
  }
  function showLogin(){
    removeSession(); clearChosen(); forgetEvent();
    setLexical('authUser', null); setLexical('authBusy', false);
    try{ window.authUser = null; }catch(_){ }
    try{ if(window.ControlEventApp) window.ControlEventApp.authUser = null; }catch(_){ }
    try{ document.body.classList.remove('ce-v5019-authenticated','ce-v5019-has-event','ce-v5019-awaiting-event','ce-v44-awaiting-event'); document.body.classList.add('ce-v5019-logged-out','auth-locked'); }catch(_){ }
    const ov = $('authOverlay');
    if(ov){
      ov.classList.remove('hidden'); ov.removeAttribute('hidden'); ov.setAttribute('aria-hidden','false');
      ov.style.setProperty('display','flex','important'); ov.style.setProperty('visibility','visible','important'); ov.style.setProperty('opacity','1','important'); ov.style.setProperty('pointer-events','auto','important'); ov.style.setProperty('z-index','300000','important');
    }
    ['brandCurrentUserName','currentUserName'].forEach(id => { const el=$(id); if(el) el.textContent='Sin acceso'; });
    ['brandCurrentUserMeta','currentUserLevel'].forEach(id => { const el=$(id); if(el) el.textContent=''; });
    ['loginClave','changeNewPassword1','changeNewPassword2'].forEach(id => { const el=$(id); if(el) el.value=''; });
    const err=$('authError'); if(err) err.textContent='';
    ensureMobileDock(); applyVersion();
  }

  function patchFetchForLoginState(){
    if(window.__ceV5019FetchPatched || typeof window.fetch !== 'function') return;
    window.__ceV5019FetchPatched = true;
    const oldFetch = window.fetch.bind(window);
    window.fetch = function(input, init){
      const url = String((input && input.url) || input || '');
      const promise = oldFetch(input, init);
      if(/\/api\/login(?:\?|$)/.test(url)){
        return promise.then(res => {
          try{
            const clone = res.clone();
            clone.json().then(data => {
              if(res.ok && data && data.ok && data.user){
                loginStateFetchPending = true;
                loginFlowActiveUntil = Date.now() + 8000;
                removeSession();
                [160,420,900,1500,2600].forEach(ms => setTimeout(() => { if(auth()) { hideLoginOverlay(); showAwaitingEvent('login'); } }, ms));
              }
            }).catch(()=>{});
          }catch(_){ }
          return res;
        });
      }
      if(loginStateFetchPending && /\/api\/state(?:\?|$)/.test(url)){
        loginStateFetchPending = false;
        return promise.then(async res => {
          try{
            const data = await res.clone().json();
            if(data && typeof data === 'object') data.selectedEventId = '';
            const headers = new Headers(res.headers || {});
            headers.set('Content-Type','application/json');
            return new Response(JSON.stringify(data), {status:res.status, statusText:res.statusText, headers});
          }catch(_){ return res; }
        });
      }
      return promise;
    };
  }

  function closeBudgetTooltip(ev){
    if(ev) stop(ev);
    const box = $(BUDGET_TIP_ID);
    if(box){ box.classList.remove('open'); box.setAttribute('aria-hidden','true'); box.style.removeProperty('display'); }
    return false;
  }
  function observeBudgetOpen(){
    if(window.__ceV5019BudgetOpenObserver) return;
    window.__ceV5019BudgetOpenObserver = true;
    try{
      const mo = new MutationObserver(() => {
        const box = $(BUDGET_TIP_ID);
        if(box && box.classList.contains('open') && !box.dataset.ceV5019OpenedAt) box.dataset.ceV5019OpenedAt = String(Date.now());
        if(box && !box.classList.contains('open')) delete box.dataset.ceV5019OpenedAt;
      });
      mo.observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:['class']});
    }catch(_){ }
  }
  function openBudgetReceiptThumb(btn, ev){
    const box = $(BUDGET_TIP_ID);
    const openedAt = Number(box?.dataset?.ceV5019OpenedAt || 0);
    // Evita que el mismo toque que abre el globo caiga accidentalmente sobre la primera miniatura.
    if(openedAt && Date.now() - openedAt < 650) return stop(ev);
    if(Date.now() - lastThumbOpenAt < 500) return stop(ev);
    const id = btn?.dataset?.id || '';
    if(!id) return stop(ev);
    lastThumbOpenAt = Date.now();
    const api = window.ControlEventV469 || window.ControlEventV467 || window.ControlEventV465;
    if(api && typeof api.showReceiptModal === 'function') return api.showReceiptModal(id, ev);
    return false;
  }
  function closeReceiptModal(ev){
    const modal = ev?.target?.closest?.('.ce-v468-modal');
    const close = ev?.target?.closest?.('.ce-v468-modal [data-close]');
    if(!modal || !close) return undefined;
    stop(ev);
    try{ if(modal.__ceKeepTooltipTimer) clearInterval(modal.__ceKeepTooltipTimer); }catch(_){ }
    try{ document.body.classList.remove('ce-v468-preserve-tooltips'); }catch(_){ }
    document.querySelectorAll('.ce-v468-modal').forEach(m => { try{ if(m.__ceKeepTooltipTimer) clearInterval(m.__ceKeepTooltipTimer); m.remove(); }catch(_){ } });
    return false;
  }

  function hydrateBudgetTips(reason){
    safe(() => window.ControlEventBudgetLiteTips?.sanitize?.(), null);
    safe(() => window.ControlEventV469?.enrichOpenTooltips?.(), null);
    safe(() => window.ControlEventV467?.enrichOpenTooltips?.(), null);
  }
  function renderActiveTab(tab){
    if(!hasValidEvent()) return;
    const active = setTab(tab || currentTab());
    try{ window.ControlEventV447?.renderActive?.(active); }
    catch(_){
      call('renderHeader'); call('renderMainSelectors');
      if(active === 'ingresos'){ call('renderIngresosSummary'); call('renderColabs'); }
      else if(active === 'donaciones') call('renderDonaciones');
      else if(active === 'compras') call('renderCompras');
      else if(active === 'resumen') call('renderBudget');
      else if(active === 'graficas') call('renderGraficas', [{force:true, reason:'v50.19'}]);
      else if(active === 'mapa') call('renderMapaProductos');
    }
    if(active === 'resumen') hydrateBudgetTips('render-active');
    applyVersion(); ensureMobileDock();
  }
  function finalizeSelectedEvent(id, reason){
    if(!hasValidEvent(id)) return;
    try{
      document.body.classList.remove(...AWAITING_CLASSES, 'auth-locked','ce-v5019-logged-out');
      document.body.classList.add('ce-v5019-authenticated','ce-v5019-has-event');
    }catch(_){ }
    const msg = $('noEventMessage'); if(msg) msg.classList.add('hidden');
    const s = st(); if(s) s.selectedEventId = String(id);
    const sel = $('selectedEvent'); if(sel) sel.value = String(id);
    markChosen(); rememberEvent(id); hideLoginOverlay(); ensureMobileDock();
  }
  function afterEventSelected(id, reason){
    if(!hasValidEvent(id)) return;
    lastEventSelectedAt = Date.now();
    finalizeSelectedEvent(id, reason);
    const tab = currentTab();
    [80,240,650,1200,2200].forEach(ms => setTimeout(() => {
      if(!hasValidEvent(id) || String(currentEventId()) !== String(id)) return;
      finalizeSelectedEvent(id, reason);
      renderActiveTab(currentTab() || tab);
      hydrateBudgetTips(reason || 'event-selected');
    }, ms));
  }
  function patchChangeSelected(){
    const old = getFn('changeSelectedEvent') || window.changeSelectedEvent;
    if(typeof old !== 'function' || old.__ceV5019Wrapped) return;
    const wrapped = function(value){
      const id = String(value || '');
      if(!id || !eventById(id)){
        clearChosen(); forgetEvent();
        try{ return old.apply(this, arguments); }finally{ setTimeout(() => showAwaitingEvent('empty-selection'), 80); }
      }
      markChosen(); rememberEvent(id); hideLoginOverlay();
      let ret;
      try{ ret = old.apply(this, arguments); }
      finally{ afterEventSelected(id, 'changeSelectedEvent'); }
      return ret;
    };
    wrapped.__ceV5019Wrapped = true;
    setLexical('changeSelectedEvent', wrapped);
    window.changeSelectedEvent = wrapped;
    try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.changeSelectedEvent = wrapped; }catch(_){ }
  }

  async function refreshHere(ev){
    stop(ev);
    const id = currentEventId();
    const tab = currentTab();
    if(!id || !hasValidEvent(id)){ showAwaitingEvent('refresh-no-event'); return false; }
    try{
      const res = await fetch('/api/state', {cache:'no-store'});
      if(res.ok){
        const fresh = await res.json();
        const target = st();
        let merged = fresh || {};
        try{ if(typeof mergeLoadedState === 'function' && typeof defaultState === 'function') merged = mergeLoadedState(fresh, defaultState()); }catch(_){ }
        Object.keys(target).forEach(k => delete target[k]);
        Object.assign(target, merged || {});
        target.selectedEventId = String(id);
        try{ if(window.ControlEventApp) window.ControlEventApp.state = target; }catch(_){ }
      }
    }catch(error){ console.warn('[v50.19] Refres falló', error); }
    finalizeSelectedEvent(id, 'refresh');
    renderActiveTab(tab);
    afterEventSelected(id, 'refresh');
    return false;
  }
  function logout(ev){
    stop(ev);
    try{ fetch('/api/logout', {method:'POST', cache:'no-store'}).catch(()=>{}); }catch(_){ }
    showLogin();
    return false;
  }
  function ensureMobileDock(){
    injectStyle();
    OLD_DOCKS.forEach(id => { const old=$(id); if(old){ old.style.setProperty('display','none','important'); old.style.setProperty('visibility','hidden','important'); old.style.setProperty('pointer-events','none','important'); } });
    let dock = $(DOCK_ID);
    if(!dock){
      dock = document.createElement('div');
      dock.id = DOCK_ID;
      dock.setAttribute('aria-label','Acciones rápidas');
      dock.innerHTML = '<button type="button" id="ceBtnRefresV518" aria-label="Refrescar">Refres</button><button type="button" id="ceBtnSalirV518" aria-label="Salir">Salir</button>';
      document.body.appendChild(dock);
    }
    const show = isMobileLike() && !!auth() && !document.body?.classList.contains('auth-locked');
    try{ document.body.classList.toggle('ce-v5019-authenticated', !!auth() && !document.body.classList.contains('auth-locked')); }catch(_){ }
    dock.style.setProperty('display', show ? 'flex' : 'none', 'important');
    dock.style.setProperty('visibility', show ? 'visible' : 'hidden', 'important');
  }

  function installHandlers(){
    if(window.__ceV5019Handlers) return;
    window.__ceV5019Handlers = true;
    ['click','touchend','pointerup'].forEach(type => {
      window.addEventListener(type, ev => {
        if(ev.target?.closest?.('#ceBtnRefresV518')) return refreshHere(ev);
        if(ev.target?.closest?.('#ceBtnSalirV518,#btnLogout')) return logout(ev);
        const closeBudget = ev.target?.closest?.(`#${BUDGET_TIP_ID} .ce-budget-lite-close`);
        if(closeBudget) return closeBudgetTooltip(ev);
      }, {capture:true, passive:false});
    });
    document.addEventListener('change', ev => {
      if(ev.target?.id === 'selectedEvent'){
        const id = String(ev.target.value || '');
        if(id && eventById(id)) afterEventSelected(id, 'selectedEvent-change');
        else setTimeout(() => showAwaitingEvent('empty-change'), 80);
      }
    }, true);
    document.addEventListener('click', ev => {
      const btn = ev.target?.closest?.('#tabResumenBtn,#tabIngresosBtn,#tabDonacionesBtn,#tabComprasBtn,#tabGraficasBtn,#tabMapaBtn');
      if(btn) [120,420,900].forEach(ms => setTimeout(() => { if(hasValidEvent()) { renderActiveTab(currentTab()); hydrateBudgetTips('tab-click'); } }, ms));
    }, true);
    document.addEventListener('keydown', ev => { if(ev.key === 'Escape'){ const m=document.querySelector('.ce-v468-modal'); if(m){ stop(ev); m.remove(); return false; } const b=$(BUDGET_TIP_ID); if(b?.classList.contains('open')) return closeBudgetTooltip(ev); } }, true);
  }

  function bootGuard(){
    removeSession();
    applyVersion();
    injectStyle();
    patchFetchForLoginState();
    patchChangeSelected();
    installHandlers();
    observeBudgetOpen();
    ensureMobileDock();
    // Si una sesión fue reanudada por el legacy antes de que este parche cargara, se devuelve a login.
    if(auth() && !loginFlowActiveUntil && Date.now() < (window.__ceV5019BootAt || 0) + 6500){
      showLogin();
      return;
    }
    if(auth()){
      hideLoginOverlay();
      if(!hasValidEvent()) showAwaitingEvent('boot-auth-no-event');
      else afterEventSelected(currentEventId(), 'boot-auth-event');
    }else{
      showLogin();
    }
  }

  window.__ceV5019BootAt = Date.now();
  function install(){
    removeSession(); applyVersion(); injectStyle(); patchFetchForLoginState(); patchChangeSelected(); installHandlers(); observeBudgetOpen(); ensureMobileDock();
    if(auth()) hideLoginOverlay();
    if(auth() && Date.now() < loginFlowActiveUntil && !hasValidEvent()) showAwaitingEvent('login-flow');
    if(auth() && hasValidEvent() && Date.now() - lastEventSelectedAt < 8000) afterEventSelected(currentEventId(), 'recent-event');
  }

  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30)));
  [0,80,250,650,1400,2600,4800].forEach(ms => setTimeout(() => { bootGuard(); install(); }, ms));
  window.ControlEventV5019 = {version:VERSION, versionFile:VERSION_FILE, install, showAwaitingEvent, afterEventSelected, refreshHere, logout, applyVersion, ensureMobileDock};
})();
