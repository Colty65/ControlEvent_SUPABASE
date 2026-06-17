/* ControlEvent v10.0_prod - selector de evento unificado y render activo único.
   Objetivo: que elegir evento tras login y cambiar evento durante el uso sigan el mismo flujo:
   cambiar selectedEventId rápido, limpiar DOM pesado de otras ventanas y renderizar solo la ventana activa. */
(function(){
  'use strict';

  const VERSION = 'ControlEvent v10.0_prod';
  const VERSION_FILE = 'ControlEvent_v10_0_prod';
  const SELECT_KEY = 'controlevent_v229_selected_event_id';
  const CHOSEN_KEY = 'controlevent_v44_event_chosen_after_login';
  const OLD_CHOSEN_KEY = 'ControlEvent_v10_0_prod_event_chosen';
  const LEGACY_CHOSEN_KEYS = ['ce_v250_event_chosen','ControlEvent_v10_0_prod_event_chosen','ControlEvent_v10_0_prod_event_chosen','controlevent_v5022_user_picked_event'];
  const STORAGE_FALLBACK = 'controlevent_v6_4';
  const TABS = ['ingresos','donaciones','compras','mapa','documentos','planificacion','resumen','graficas'];
  const PANEL_BY_TAB = {
    ingresos:'tabIngresos',
    donaciones:'tabDonaciones',
    compras:'tabCompras',
    mapa:'tabMapaProductos',
    documentos:'tabDocumentos',
    planificacion:'tabPlanificacionInicial',
    resumen:'tabResumen',
    graficas:'tabGraficas'
  };
  const BUTTON_BY_TAB = {
    ingresos:'tabIngresosBtn',
    donaciones:'tabDonacionesBtn',
    compras:'tabComprasBtn',
    mapa:'tabMapaBtn',
    documentos:'tabDocumentosBtn',
    planificacion:'tabPlanificacionBtn',
    resumen:'tabResumenBtn',
    graficas:'tabGraficasBtn'
  };
  const TAB_BY_BUTTON = Object.entries(BUTTON_BY_TAB).reduce((acc,[tab,id]) => (acc[id]=tab, acc), {});
  const MENU_LABELS = {
    tabIngresosBtn:['🤝','Ingresos'],
    tabDonacionesBtn:['🎁','Donaciones'],
    tabComprasBtn:['🛒','Compras y gastos'],
    tabMapaBtn:['🧭','Mapa de recursos'],
    tabDocumentosBtn:['📁','Documentos'],
    tabPlanificacionBtn:['🧠','Planificación inicial'],
    tabResumenBtn:['🧾','Resumen'],
    tabGraficasBtn:['📊','Gráficas']
  };
  const EVENT_MENU_ORDER = ['tabIngresosBtn','tabDonacionesBtn','tabComprasBtn','tabMapaBtn','tabDocumentosBtn','tabPlanificacionBtn','tabResumenBtn','tabGraficasBtn'];
  const DYNAMIC_IDS = {
    ingresos:['ingresosSummaryGrid','collabList'],
    donaciones:['donacionesList'],
    compras:['comprasList'],
    mapa:['mapaProductosSummary','mapaProductosList'],
    documentos:['eventDocsList'],
    planificacion:['planificacionInicialBody','planificacionInicialList','planificacionInicialSummary'],
    resumen:['budgetLayout','summarySegmento','summaryDestino','summaryTiendaTicket'],
    graficas:['eventChartWrap']
  };
  const transition = {
    token: 0,
    timer: 0,
    active: false,
    eventId: '',
    targetTab: '',
    startedAt: 0,
    lastRenderAt: 0,
    lastSelectKey: '',
    lastSelectAt: 0,
    watchdog: 0
  };
  try{ window.__ceEventSwitcherOwnsRender = VERSION; }catch(_){ }

  let originalRender = null;
  let originalRenderBudget = null;
  let loginBusyV447 = false;

  function $(id){ return document.getElementById(id); }
  function safe(fn, fallback){ try{ const value = fn(); return value === undefined ? fallback : value; }catch(_){ return fallback; } }
  function call(name, args){ const fn = window[name] || safe(() => eval(name), null); if(typeof fn !== 'function') return undefined; try{ return fn.apply(window, args || []); }catch(error){ console.warn('[v45.4] Error en ' + name, error); return undefined; } }
  function st(){ return safe(() => (typeof state !== 'undefined' && state) || window.state || window.ControlEventApp?.state || {}, window.state || window.ControlEventApp?.state || {}); }
  function auth(){ return safe(() => (typeof authUser !== 'undefined' && authUser) || window.authUser || window.ControlEventApp?.authUser || null, window.authUser || window.ControlEventApp?.authUser || null); }
  function storageKey(){ return safe(() => (typeof STORAGE_KEY !== 'undefined' && STORAGE_KEY) || STORAGE_FALLBACK, STORAGE_FALLBACK); }
  function events(){ const s = st(); return Array.isArray(s.eventos) ? s.eventos : []; }
  function eventById(id){ const sid = String(id || ''); return events().find(e => String(e.id || '') === sid) || null; }
  function hasValidEvent(id){ const sid = String(id == null ? st().selectedEventId : id); return !!sid && !!eventById(sid); }
  function currentEventId(){ return String(st().selectedEventId || ''); }
  function isAwaitingEvent(){ return !!auth() && !hasValidEvent(); }
  function isMobileLike(){ return !!(window.matchMedia && window.matchMedia('(max-width: 900px)').matches) || /iPad|iPhone|Android/i.test(navigator.userAgent || ''); }
  function role(){ return String(auth()?.nivel || '').toUpperCase(); }
  function isGD(){ return role() === 'GD'; }
  function isRW(){ return role() === 'RW'; }
  function isRO(){ return role() === 'RO'; }
  function roleAllowsTab(tab){
    const name = String(tab || '');
    if(!auth()) return false;
    if(isRO()) return ['resumen','mapa','documentos','graficas'].includes(name);
    if(name === 'planificacion') return isGD();
    return TABS.includes(name);
  }
  function defaultTabForRole(prefer){
    const preferred = String(prefer || '');
    if(roleAllowsTab(preferred)) return preferred;
    if(isRO()) return 'resumen';
    return roleAllowsTab('ingresos') ? 'ingresos' : (roleAllowsTab('resumen') ? 'resumen' : 'graficas');
  }
  function tabFromButtonId(id){ return TAB_BY_BUTTON[String(id || '')] || ''; }
  function currentTab(){
    const memorized = safe(() => window.__ceCurrentMainTab || '', '');
    // v8.5.2: DOCUMENTOS es una pestaña añadida por parche. Renders legacy antiguos
    // pueden tocar currentMainTab a ingresos/resumen; no deben sacar al usuario de DOCUMENTOS.
    if(String(memorized) === 'documentos' && (!auth() || roleAllowsTab('documentos'))) return 'documentos';
    const appTab = safe(() => window.ControlEventApp?.navigation?.currentMainTab || '', '');
    if(String(appTab) === 'documentos' && (!auth() || roleAllowsTab('documentos'))) return 'documentos';
    const lexical = safe(() => (typeof currentMainTab !== 'undefined' ? currentMainTab : ''), '');
    if(TABS.includes(String(lexical))) return String(lexical);
    if(TABS.includes(String(appTab))) return String(appTab);
    if(TABS.includes(String(memorized))) return String(memorized);
    const visible = TABS.find(tab => { const panel = $(PANEL_BY_TAB[tab]); return panel && !panel.classList.contains('hidden'); });
    return visible || 'ingresos';
  }
  function setTab(tab){
    let next = TABS.includes(String(tab)) ? String(tab) : defaultTabForRole();
    if(auth() && !roleAllowsTab(next)) next = defaultTabForRole(next);
    try{ currentMainTab = next; }catch(_){ }
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = next; }catch(_){ }
    try{ window.__ceCurrentMainTab = next; }catch(_){ }
    return next;
  }
  function markChosen(){ try{ [CHOSEN_KEY, OLD_CHOSEN_KEY, ...LEGACY_CHOSEN_KEYS].forEach(k => sessionStorage.setItem(k, '1')); }catch(_){ } }
  function clearChosen(){ try{ [CHOSEN_KEY, OLD_CHOSEN_KEY, ...LEGACY_CHOSEN_KEYS].forEach(k => sessionStorage.removeItem(k)); }catch(_){ } }
  function chosen(){ return safe(() => [CHOSEN_KEY, OLD_CHOSEN_KEY, ...LEGACY_CHOSEN_KEYS].some(k => sessionStorage.getItem(k) === '1'), false); }
  function rememberEvent(id){ if(!hasValidEvent(id)) return; try{ sessionStorage.setItem(SELECT_KEY, String(id)); }catch(_){ } try{ localStorage.setItem(SELECT_KEY, String(id)); }catch(_){ } }
  function persistLocal(){
    // v45.4: el cambio de evento NO debe serializar todo el estado.
    // En móviles, JSON.stringify(state) puede incluir muchos registros o imágenes de tickets y bloquear la UI.
    return undefined;
  }
  function scheduleRemoteSave(){
    // v45.4: seleccionar evento es una preferencia local, no un cambio de datos del evento.
    // Evitamos pushStateToServer() para que el cambio no dispare guardados globales ni sincronizaciones pesadas.
    try{ clearTimeout(window.__ceV447EventSaveTimer); }catch(_){ }
    return undefined;
  }
  function applyVersion(){
    try{ document.title = VERSION; }catch(_){ }
    try{ document.body.dataset.ceVersion = VERSION; window.__ceVersion = VERSION; window.VERSION = VERSION; window.VERSION_FILE = VERSION_FILE; }catch(_){ }
    try{
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
        const t = el.textContent || '';
        if(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/i.test(t)) el.textContent = t.replace(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/ig, VERSION);
      });
    }catch(_){ }
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__ceV447VersionFile){
        const old = proto.click;
        const wrapped = function(){
          try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ }
          return old.apply(this, arguments);
        };
        wrapped.__ceV447VersionFile = true;
        proto.click = wrapped;
      }
    }catch(_){ }
  }
  function injectStyle(){
    if($('ceV447Style')) return;
    const style = document.createElement('style');
    style.id = 'ceV447Style';
    style.textContent = `
      #ceEventSwitchNotice{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 12px);transform:translateX(-50%);z-index:5000;max-width:min(560px,92vw);padding:10px 14px;border-radius:999px;background:rgba(15,23,42,.92);color:white;font-weight:800;font-size:13px;box-shadow:0 12px 28px rgba(15,23,42,.26);pointer-events:none;opacity:0;transition:opacity .16s ease, transform .16s ease;text-align:center;}
      #ceEventSwitchNotice.visible{opacity:1;transform:translateX(-50%) translateY(0);}
      .ce-v447-loading{margin:14px 0;padding:16px 18px;border-radius:18px;background:rgba(248,250,252,.96);border:1px solid rgba(148,163,184,.28);color:#334155;font-weight:800;box-shadow:0 10px 28px rgba(15,23,42,.08);}
      .ce-v447-loading small{display:block;margin-top:3px;color:#64748b;font-weight:700;}
      body.ce-v447-switching #selectedEvent{outline:2px solid rgba(37,99,235,.65);box-shadow:0 0 0 4px rgba(37,99,235,.13);}
      body.ce-v447-login-loading #btnLogin{opacity:.72;pointer-events:none;}
    `;
    document.head.appendChild(style);
  }
  function notice(text){
    injectStyle();
    let box = $('ceEventSwitchNotice');
    if(!box){ box = document.createElement('div'); box.id = 'ceEventSwitchNotice'; document.body.appendChild(box); }
    box.textContent = text || 'Cargando evento...';
    box.classList.add('visible');
    clearTimeout(box.__hideTimer);
    box.__hideTimer = setTimeout(() => box.classList.remove('visible'), 1400);
  }
  function setSwitching(on){ try{ document.body.classList.toggle('ce-v447-switching', !!on); }catch(_){ } }
  function clearPendingWork(){
    clearTimeout(transition.timer);
    clearTimeout(transition.watchdog);
    try{ clearTimeout(window.__ceV447EventSaveTimer); }catch(_){ }
  }
  function armWatchdog(token, ms){
    clearTimeout(transition.watchdog);
    transition.watchdog = setTimeout(() => {
      if(token && token !== transition.token) return;
      if(!transition.active) return;
      console.warn('[v45.4] Watchdog libera transición bloqueada', {eventId:transition.eventId, targetTab:transition.targetTab});
      finishTransition(token);
      notice('Control recuperado. Puedes volver a elegir evento u opción.');
    }, Number(ms || (isMobileLike() ? 9000 : 6000)));
  }
  function sameSelectionStillRunning(id){
    const now = Date.now();
    return transition.active && String(transition.eventId || '') === String(id || '') && (now - transition.startedAt) < 1600;
  }
  function finishTransition(token){
    if(token && token !== transition.token) return;
    clearTimeout(transition.watchdog);
    transition.active = false;
    transition.lastRenderAt = Date.now();
    setSwitching(false);
  }
  function clearContainer(id){ const el = $(id); if(!el) return 0; const n = el.getElementsByTagName ? el.getElementsByTagName('*').length : el.childNodes.length; if(el.childNodes.length) el.replaceChildren(); return n; }
  function clearDynamic(activeTab, options = {}){
    const includeActive = options.includeActive === true;
    Object.entries(DYNAMIC_IDS).forEach(([tab, ids]) => {
      if(tab === activeTab && !includeActive) return;
      ids.forEach(clearContainer);
    });
  }
  function showLoading(tab, label){
    const ids = DYNAMIC_IDS[tab] || [];
    const id = ids[ids.length - 1] || ids[0];
    const el = id ? $(id) : null;
    if(!el) return;
    el.innerHTML = `<div class="ce-v447-loading">${escapeHtml(label || 'Cargando nuevo evento...')}<small>Preparando la ventana ${escapeHtml(tab || '')}.</small></div>`;
  }
  function closeMobileDrawer(){ try{ document.body.classList.remove('mobile-drawer-open'); }catch(_){ } }
  function ensureVisibleControl(el, visible = true){
    if(!el) return;
    if(visible){
      el.classList.remove('hidden','hidden-by-role-v228');
      el.removeAttribute('hidden');
      el.removeAttribute('aria-hidden');
      el.removeAttribute('aria-disabled');
      el.disabled = false;
      el.style.removeProperty('display');
      el.style.removeProperty('visibility');
      el.style.removeProperty('opacity');
      el.style.pointerEvents = 'auto';
    }else{
      el.classList.add('hidden');
      el.setAttribute('aria-hidden','true');
      el.style.display = 'none';
    }
  }
  function eventMenuGrid(){
    const grids = Array.from(document.querySelectorAll('.mobile-menu-grid'));
    return grids.find(grid => grid.querySelector('[data-target="tabIngresosBtn"],[data-target="tabDonacionesBtn"],[data-target="tabComprasBtn"]')) || grids[0] || null;
  }
  function ensureMobileMenuButtons(){
    const grid = eventMenuGrid();
    if(!grid) return;
    let last = grid.querySelector('[data-target="tabComprasBtn"]') || grid.querySelector('[data-target="tabDonacionesBtn"]') || grid.lastElementChild;
    EVENT_MENU_ORDER.forEach(id => {
      const tab = tabFromButtonId(id);
      if(!roleAllowsTab(tab)) return;
      if(grid.querySelector(`.mobile-menu-action[data-target="${id}"]`)){
        last = grid.querySelector(`.mobile-menu-action[data-target="${id}"]`) || last;
        return;
      }
      const info = MENU_LABELS[id] || ['',''];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mobile-menu-action';
      btn.dataset.target = id;
      btn.innerHTML = `<span class="mi">${info[0]}</span>${info[1]}`;
      if(last && last.parentNode === grid) last.insertAdjacentElement('afterend', btn);
      else grid.appendChild(btn);
      last = btn;
    });
  }
  function unlockMenuShell(){
    if(!auth()) return;
    // v45.4: si venimos de un usuario RO, quitar restos de ocultación antes de reconstruir menú/paneles.
    if(!isRO()){
      try{ document.body.classList.remove('ce-role-ro-v452'); }catch(_){ }
      Object.values(PANEL_BY_TAB).forEach(id => {
        const el = $(id);
        if(!el) return;
        el.classList.remove('ce-v452-hidden-role');
        el.removeAttribute('aria-hidden');
        el.removeAttribute('aria-disabled');
        el.style.removeProperty('display');
        el.style.removeProperty('visibility');
        el.style.removeProperty('pointer-events');
        el.style.removeProperty('opacity');
      });
      Object.values(BUTTON_BY_TAB).forEach(id => {
        const el = $(id);
        if(!el) return;
        el.classList.remove('ce-v452-hidden-role');
        el.removeAttribute('aria-hidden');
        el.removeAttribute('aria-disabled');
        el.style.removeProperty('display');
        el.style.removeProperty('visibility');
        el.style.removeProperty('pointer-events');
        el.style.removeProperty('opacity');
        el.disabled = false;
      });
    }
    const tabs = $('mainTabs');
    if(tabs) ensureVisibleControl(tabs, true);
    EVENT_MENU_ORDER.forEach(id => {
      const tab = tabFromButtonId(id);
      ensureVisibleControl($(id), roleAllowsTab(tab));
    });
    ensureMobileMenuButtons();
    document.querySelectorAll('.mobile-menu-action[data-target]').forEach(el => {
      const target = el.dataset?.target || '';
      const tab = tabFromButtonId(target);
      if(EVENT_MENU_ORDER.includes(target)) ensureVisibleControl(el, roleAllowsTab(tab));
    });
    if(isRO()){
      ['tabIngresos','tabDonaciones','tabCompras','tabPlanificacionInicial'].forEach(id => ensureVisibleControl($(id), false));
      ['tabIngresosBtn','tabDonacionesBtn','tabComprasBtn','tabPlanificacionBtn'].forEach(id => ensureVisibleControl($(id), false));
      document.querySelectorAll('.mobile-menu-action[data-target="tabIngresosBtn"],.mobile-menu-action[data-target="tabDonacionesBtn"],.mobile-menu-action[data-target="tabComprasBtn"],.mobile-menu-action[data-target="tabPlanificacionBtn"],.mobile-menu-action[data-target="btnToggleMaintenance"],.mobile-menu-action[data-target="btnOpenImport"],.mobile-menu-action[data-target="btnExportSeed"]').forEach(el => ensureVisibleControl(el, false));
      ensureVisibleControl($('btnToggleMaintenance'), false);
      ensureVisibleControl($('btnOpenImport'), false);
      ensureVisibleControl($('btnExportSeed'), false);
    }
  }
  function ensureEventPlaceholder(){
    const sel = $('selectedEvent');
    if(!sel) return;
    if(hasValidEvent()){
      const opt = sel.querySelector('option[value=""]');
      if(opt && sel.value !== '') opt.remove();
      return;
    }
    let opt = sel.querySelector('option[value=""]');
    if(!opt){
      opt = document.createElement('option');
      opt.value = '';
      opt.textContent = events().length ? 'Selecciona evento...' : 'Cargando eventos...';
      sel.insertBefore(opt, sel.firstChild);
    }else{
      opt.textContent = events().length ? 'Selecciona evento...' : 'Cargando eventos...';
    }
    sel.value = '';
  }
  function setLoginLoading(on){
    try{ document.body.classList.toggle('ce-v447-login-loading', !!on); }catch(_){ }
    const btn = $('btnLogin');
    if(btn){ btn.disabled = !!on; btn.textContent = on ? 'Entrando...' : 'Entrar'; }
  }
  function mergeStateFromServer(serverState){
    const s = st();
    Object.keys(s).forEach(k => { delete s[k]; });
    let merged = serverState || {};
    try{
      if(typeof mergeLoadedState === 'function' && typeof defaultState === 'function') merged = mergeLoadedState(serverState, defaultState());
    }catch(_){ }
    Object.assign(s, merged || {});
    try{ if(window.ControlEventApp) window.ControlEventApp.state = s; }catch(_){ }
    return s;
  }
  async function loadFreshStateFast(){
    const fresh = await fetch('/api/state', {cache:'no-store'});
    if(!fresh.ok) throw new Error('No se pudo cargar /api/state');
    const serverState = await fresh.json();
    return mergeStateFromServer(serverState);
  }
  async function doLoginFast(){
    if(loginBusyV447) return false;
    const ident = String($('loginIdentificacion')?.value || '').trim();
    const clave = String($('loginClave')?.value || '');
    const error = $('authError');
    if(error) error.textContent = '';
    if(!ident || !clave){ if(error) error.textContent = 'Introduce identificación y clave.'; return false; }
    loginBusyV447 = true;
    setLoginLoading(true);
    notice('Comprobando acceso...');
    try{
      const res = await fetch('/api/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({identificacion:ident, clave})});
      const data = await res.json().catch(() => ({}));
      if(!res.ok || !data.ok || !data.user) throw new Error(data.error || 'Acceso no válido');
      try{ authUser = data.user; }catch(_){ }
      window.authUser = data.user;
      try{ localStorage.removeItem('ControlEvent_v10_0_prod_session'); }catch(_){ } // v50.27: no persistir sesion ligera
      const c = $('loginClave'); if(c) c.value = '';
      try{ st().selectedEventId = ''; }catch(_){ }
      clearChosen();
      setTab('graficas');
      unlockMenuShell();
      shell();
      ensureEventPlaceholder();
      notice('Acceso correcto. Cargando datos del evento...');
      const loaded = await loadFreshStateFast();
      if(Array.isArray(loaded.eventos)) loaded.selectedEventId = '';
      clearChosen();
      setTab('graficas');
      clearDynamic('', {includeActive:true});
      unlockMenuShell();
      shell();
      ensureEventPlaceholder();
      notice('Datos cargados. Elige evento en el desplegable.');
      setTimeout(() => { try{ if(isGD()) call('fetchAccessUsers'); }catch(_){ } }, 0);
      return false;
    }catch(err){
      console.error('[v45.4] login rápido', err);
      if(error) error.textContent = err?.message || String(err);
      try{ authUser = null; }catch(_){ }
      window.authUser = null;
      return false;
    }finally{
      loginBusyV447 = false;
      setLoginLoading(false);
    }
  }
  function syncTabs(){
    unlockMenuShell();
    let tab = currentTab();
    if(auth() && !roleAllowsTab(tab)) tab = setTab(defaultTabForRole(tab));
    const hasEvent = hasValidEvent();
    const docsActive = hasEvent && tab === 'documentos' && roleAllowsTab('documentos');
    try{ document.body.classList.toggle('ce-docs-active-v85', docsActive); }catch(_){ }
    if(!docsActive){
      try{ window.ControlEventDocumentsV85?.releaseExclusive?.(); }catch(_){ }
      ['tabIngresos','tabDonaciones','tabCompras','tabMapaProductos','tabPlanificacionInicial','tabResumen','tabGraficas','maintenanceWrapper'].forEach(id => {
        const el = $(id);
        if(el && el.getAttribute('data-ce-docs-hidden-v85') === '1'){
          el.removeAttribute('data-ce-docs-hidden-v85');
          el.style.removeProperty('display');
          el.style.removeProperty('visibility');
          el.style.removeProperty('pointer-events');
        }
      });
    }
    TABS.forEach(name => {
      const allowed = roleAllowsTab(name);
      const panel = $(PANEL_BY_TAB[name]);
      if(panel) panel.classList.toggle('hidden', !hasEvent || name !== tab || !allowed);
      const btn = $(BUTTON_BY_TAB[name]);
      if(btn) btn.classList.toggle('active', hasEvent && name === tab && allowed);
      document.querySelectorAll(`.mobile-menu-action[data-target="${BUTTON_BY_TAB[name]}"]`).forEach(el => {
        el.classList.toggle('primary', hasEvent && name === tab && allowed);
      });
    });
    const msg = $('noEventMessage');
    if(msg) msg.classList.toggle('hidden', hasEvent);
    try{ document.body.classList.toggle('ce-v44-awaiting-event', !hasEvent && !!auth()); }catch(_){ }
  }
  function shell(){
    applyVersion();
    call('renderEnvironmentBanner');
    call('renderAuthUI');
    if(!auth()) return;
    unlockMenuShell();
    if(hasValidEvent()){
      try{ document.body.classList.remove('ce-v44-awaiting-event'); }catch(_){ }
      const msg = $('noEventMessage'); if(msg) msg.classList.add('hidden');
      call('renderHeader');
      ensureEventPlaceholder();
      syncTabs();
      call('renderPermissions');
      call('renderLockState');
      return;
    }
    // Sin evento seleccionado: solo cabecera y pantalla limpia.
    call('renderHeader');
    ensureEventPlaceholder();
    syncTabs();
    const msg = $('noEventMessage');
    if(msg){
      msg.classList.remove('hidden');
      if(!msg.querySelector('.ce-v44-welcome')){
        msg.innerHTML = '<div class="ce-v44-welcome"><img src="./assets/icons/controlevent-welcome-v44.png" alt="ControlEvent" /><h2>Selecciona un evento para trabajar</h2><p>Elige el evento en el desplegable superior. Hasta entonces la pantalla de trabajo queda limpia.</p></div>';
      }
    }
  }
  function withGraficasDisabled(fn){
    const oldWin = window.renderGraficas;
    let oldLex;
    try{ oldLex = (typeof renderGraficas !== 'undefined' ? renderGraficas : undefined); }catch(_){ oldLex = undefined; }
    const noop = function(){ return undefined; };
    try{ renderGraficas = noop; }catch(_){ }
    window.renderGraficas = noop;
    try{ return fn(); }
    finally{
      if(oldLex){ try{ renderGraficas = oldLex; }catch(_){ } }
      if(oldWin) window.renderGraficas = oldWin;
    }
  }
  function renderBudgetNoGraph(){
    const fn = originalRenderBudget || window.renderBudget;
    if(typeof fn !== 'function' || fn === renderBudgetNoGraph) return undefined;
    return withGraficasDisabled(() => fn.apply(window, arguments));
  }
  function renderStableGraficas(){
    try{ window.__ceDisableLegacyBarGraficas = true; window.__ceStableGraficasV435 = true; }catch(_){ }
    const wrap = $('eventChartWrap');
    if(wrap){
      const oldBars = wrap.querySelector('.chart-bars,.chart-track,.chart-seg:not(.ce-v434-pie-slice)');
      if(oldBars) wrap.replaceChildren();
    }
    const stable = window.ControlEventV434?.renderGraficas || window.ControlEventV435?.renderGraficas || window.ControlEventV436?.renderGraficas;
    if(typeof stable === 'function') return stable({force:true, reason:'v45.4-active-only'});
    return call('renderGraficas');
  }
  function markEventReadyForTips(reason){
    if(!auth() || !hasValidEvent()) return;
    try{
      document.body.classList.remove(
        'auth-locked',
        'ce-v44-awaiting-event','ce-v5013-force-event-choice','ce-v5015-awaiting-event','ce-v5017-awaiting-event','ce-v5018-awaiting-event',
        'ce-v5019-awaiting-event','ce-v5021-awaiting-event','ce-v5022-awaiting-event','ce-v5024-awaiting-event','ce-v5025-awaiting-event',
        'ce-v5019-logged-out','ce-v5022-logged-out'
      );
      document.body.classList.add('ce-v5019-authenticated','ce-v5020-has-event','ce-v5022-has-event','ce-v5025-has-event');
    }catch(_){ }
    const msg = $('noEventMessage');
    if(msg){
      msg.classList.add('hidden');
      msg.setAttribute('aria-hidden','true');
      msg.style.setProperty('display','none','important');
      msg.style.setProperty('visibility','hidden','important');
      msg.style.setProperty('pointer-events','none','important');
      msg.style.setProperty('max-height','0','important');
      msg.style.setProperty('overflow','hidden','important');
    }
    const run = () => {
      if(!auth() || !hasValidEvent()) return;
      try{ window.ControlEventBudgetLiteTips?.sanitize?.(); }catch(_){ }
      try{ window.ControlEventV469?.hydrateEventReceipts?.(false); }catch(_){ }
      try{ window.ControlEventV469?.compactIngresoReceipts?.(); }catch(_){ }
      try{ window.ControlEventV469?.enrichOpenTooltips?.(); }catch(_){ }
      try{ window.ControlEventV467?.enrichOpenTooltips?.(); }catch(_){ }
      try{ window.dispatchEvent(new CustomEvent('controlevent:event-ready', {detail:{eventId:currentEventId(), tab:currentTab(), reason:reason || 'v50.25'}})); }catch(_){ }
      applyVersion();
    };
    [0,80,220,520,1000,1800].forEach(ms => setTimeout(run, ms));
  }
  function renderActive(tab){
    if(!hasValidEvent()) return;
    const requested = tab || currentTab();
    const active = setTab(roleAllowsTab(requested) ? requested : defaultTabForRole(requested));
    shell();
    if(['ingresos','compras','donaciones'].includes(active)) call('renderMainSelectors');
    switch(active){
      case 'ingresos': call('renderIngresosSummary'); call('renderColabs'); break;
      case 'compras': call('renderCompras'); break;
      case 'donaciones': call('renderDonaciones'); break;
      case 'mapa': call('renderMapaProductos'); break;
      case 'documentos': if(window.ControlEventDocumentsV85?.render) window.ControlEventDocumentsV85.render(); break;
      case 'planificacion':
        try{
          if(typeof window.showPlanificacionInicial === 'function') window.showPlanificacionInicial();
          else window.ControlEventPlanificacion?.show?.();
        }catch(_){ }
        break;
      case 'resumen': renderBudgetNoGraph(); clearContainer('eventChartWrap'); break;
      case 'graficas': renderStableGraficas(); break;
    }
    call('renderPermissions');
    call('renderLockState');
    finishTransition();
    markEventReadyForTips('renderActive:'+active);
    applyVersion();
  }
  function queueActive(tab, token, options = {}){
    const active = setTab(tab || currentTab());
    clearTimeout(transition.timer);
    const isHeavy = active === 'graficas' || active === 'resumen';
    const baseDelay = isHeavy ? (isMobileLike() ? 420 : 100) : (isMobileLike() ? 130 : 25);
    const delay = Number(options.delay ?? baseDelay);
    transition.timer = setTimeout(() => {
      if(token && token !== transition.token) return;
      const run = () => {
        if(token && token !== transition.token) return;
        try{ renderActive(active); }
        catch(error){ console.warn('[v45.4] render activo', error); finishTransition(token); }
      };
      if(typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(run);
      else run();
    }, delay);
  }
  function chooseTargetTab(wasEvent){
    const nowTab = currentTab();
    let proposed = (!wasEvent || isAwaitingEvent()) ? 'graficas' : nowTab;
    if(!TABS.includes(proposed) || proposed === 'planificacion') proposed = 'graficas';
    return roleAllowsTab(proposed) ? proposed : defaultTabForRole(proposed);
  }
  async function selectEvent(value, options = {}){
    const id = String(value || '');
    const s = st();
    if(!id || !eventById(id)){
      if(s) s.selectedEventId = '';
      clearChosen();
      clearDynamic('', {includeActive:true});
      shell();
      return false;
    }
    const previousId = currentEventId();
    if(previousId === id && hasValidEvent(id) && !options.force){
      // Evita dobles disparos del selector o del listener antiguo.
      markChosen();
      rememberEvent(id);
      shell();
      return false;
    }
    if(sameSelectionStillRunning(id)) return false;
    const wasEvent = hasValidEvent(previousId);
    const requestedTab = options.tab || chooseTargetTab(wasEvent);
    const targetTab = roleAllowsTab(requestedTab) ? requestedTab : defaultTabForRole(requestedTab);
    clearPendingWork();
    const token = ++transition.token;
    transition.active = true;
    transition.eventId = id;
    transition.targetTab = targetTab;
    transition.startedAt = Date.now();
    transition.lastSelectKey = previousId + '>' + id + '|' + targetTab;
    transition.lastSelectAt = transition.startedAt;
    setSwitching(true);
    armWatchdog(token);
    unlockMenuShell();
    markChosen();
    rememberEvent(id);
    if(s) s.selectedEventId = id;
    setTab(targetTab);
    const sel = $('selectedEvent'); if(sel) sel.value = id;
    persistLocal();
    scheduleRemoteSave();
    clearDynamic(targetTab, {includeActive:true});
    shell();
    ensureEventPlaceholder();
    showLoading(targetTab, wasEvent ? 'Cargando nuevo evento...' : 'Cargando evento seleccionado...');
    notice(wasEvent ? 'Cargando nuevo evento… preparando ventana activa' : 'Cargando evento seleccionado… preparando Gráficas');
    queueActive(targetTab, token, {delay: options.delay});
    return false;
  }
  function renderV447(options = {}){
    if(transition.active && !options.force){
      shell();
      return undefined;
    }
    shell();
    if(auth() && hasValidEvent()){
      queueActive(defaultTabForRole(currentTab()), ++transition.token, {delay: options.delay ?? 0});
    }
    return undefined;
  }
  function patchBudget(){
    const current = window.renderBudget || safe(() => (typeof renderBudget === 'function' ? renderBudget : null), null);
    if(typeof current === 'function' && current !== renderBudgetNoGraph && !originalRenderBudget) originalRenderBudget = current;
    try{ renderBudget = renderBudgetNoGraph; }catch(_){ }
    window.renderBudget = renderBudgetNoGraph;
  }
  function patchRender(){
    const current = window.render || safe(() => (typeof render === 'function' ? render : null), null);
    if(typeof current === 'function' && current !== renderV447 && !originalRender) originalRender = current;
    try{ render = renderV447; }catch(_){ }
    window.render = renderV447;
  }
  function patchChangeSelected(){
    const fn = function(value){ return selectEvent(value); };
    fn.__ceV447Unified = true;
    try{ changeSelectedEvent = fn; }catch(_){ }
    window.changeSelectedEvent = fn;
  }
  function patchAppActions(){
    const actions = window.ControlEventApp?.actions;
    if(!actions) return;
    actions.render = (...args) => renderV447(...args);
    actions.changeSelectedEvent = (...args) => selectEvent(...args);
    actions.renderBudget = (...args) => renderBudgetNoGraph(...args);
    actions.renderGraficas = (...args) => renderStableGraficas(...args);
    actions.renderTabVisibility = (...args) => { syncTabs(); return call('renderTabVisibility', args); };
  }
  function handleTabClick(event){
    const trigger = event.target?.closest?.('button[id],.mobile-menu-action[data-target]');
    if(!trigger) return;
    const id = trigger.dataset?.target || trigger.id || '';
    const tab = TAB_BY_BUTTON[id] || '';
    if(!tab) return;
    if(!auth() || !hasValidEvent()) return;
    if(!roleAllowsTab(tab)){
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      notice(isRO() ? 'Usuario RO: solo Resumen, Mapa de recursos, Documentos y Gráficas.' : 'Opción no disponible para este usuario.');
      setTimeout(() => { try{ shell(); }catch(_){ } }, 0);
      return false;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    closeMobileDrawer();
    const token = ++transition.token;
    transition.active = true;
    transition.targetTab = tab;
    setSwitching(true);
    armWatchdog(token);
    unlockMenuShell();
    setTab(tab);
    clearDynamic(tab, {includeActive:true});
    shell();
    showLoading(tab, 'Preparando ventana...');
    queueActive(tab, token, {delay: isMobileLike() ? 80 : 20});
    return false;
  }
  function handleSelectedChange(event){
    const sel = event.target?.closest?.('#selectedEvent');
    if(!sel) return;
    // Los listeners antiguos invocan window.changeSelectedEvent; esta barrera evita renders duplicados si llega hasta aquí.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    selectEvent(sel.value);
    return false;
  }
  function patchLoginPicker(){
    const fn = function(){ return doLoginFast(); };
    fn.__ceV447Login = true;
    try{ doLogin = fn; }catch(_){ }
    window.doLogin = fn;
    try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.doLogin = (...args) => fn(...args); }catch(_){ }
  }
  function handleLoginCapture(event){
    const target = event.target?.closest?.('#btnLogin');
    if(!target) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    doLoginFast();
    return false;
  }
  function handleLoginKeyCapture(event){
    if(event.key !== 'Enter') return;
    const id = event.target?.id || '';
    if(id !== 'loginIdentificacion' && id !== 'loginClave') return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    doLoginFast();
    return false;
  }
  function patchModules(){
    const modules = window.ControlEventModules;
    if(!modules || typeof modules.activate !== 'function' || modules.__ceV4472Patched) return;
    const oldActivate = modules.activate.bind(modules);
    modules.activate = function(name, options){
      const tab = String(name || '');
      if(TABS.includes(tab) && auth() && !roleAllowsTab(tab)){
        return Promise.resolve({ok:true, skipped:true, name:tab, reason:'role-not-allowed'});
      }
      if(transition.active && transition.targetTab && tab !== transition.targetTab){
        return Promise.resolve({ok:true, skipped:true, name:tab, reason:'event-switch-active'});
      }
      if(auth() && !hasValidEvent() && TABS.includes(tab)){
        return Promise.resolve({ok:true, skipped:true, name:tab, reason:'awaiting-event'});
      }
      return oldActivate(name, options);
    };
    modules.__ceV4472Patched = true;
  }
  function install(){
    try{ window.__ceEventSwitcherOwnsRender = VERSION; clearTimeout(window.__ceV447EventSaveTimer); }catch(_){ }
    injectStyle();
    applyVersion();
    patchBudget();
    patchRender();
    patchChangeSelected();
    patchLoginPicker();
    patchAppActions();
    patchModules();
    unlockMenuShell();
    if(auth() && !roleAllowsTab(currentTab())) setTab(defaultTabForRole(currentTab()));
    try{ window.__ceDisableLegacyBarGraficas = true; window.__ceStableGraficasV435 = true; }catch(_){ }
    if(!window.__ceV447Capture){
      window.__ceV447Capture = true;
      window.addEventListener('click', handleLoginCapture, true);
      window.addEventListener('keydown', handleLoginKeyCapture, true);
      window.addEventListener('click', handleTabClick, true);
      window.addEventListener('change', handleSelectedChange, true);
    }
    if(!document.__ceV447Tabs){
      document.__ceV447Tabs = true;
      document.addEventListener('click', handleTabClick, true);
      document.addEventListener('change', handleSelectedChange, true);
    }
    if(auth() && !chosen() && events().length && hasValidEvent()){
      // Si venimos justo del login con un selectedEventId restaurado por parches antiguos, volver al selector.
      const s = st();
      s.__ceV447PreviousEventId = s.selectedEventId;
      s.selectedEventId = '';
      clearDynamic('', {includeActive:true});
    }
    shell();
  }

  window.ControlEventV447 = {
    version: VERSION,
    versionFile: VERSION_FILE,
    install,
    selectEvent,
    render: renderV447,
    renderActive,
    markEventReadyForTips,
    state: transition
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
  ['load','controlevent:app-ready','controlevent:runtime-ready','controlevent:modules-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(() => { install(); patchModules(); unlockMenuShell(); }, 30)));
  [120, 600, 1400].forEach(ms => setTimeout(install, ms));
})();
