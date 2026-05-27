/* ControlEvent v50.3 - cierre de permisos por rol y refresco limpio de ventana activa.
   Objetivos:
   - RO solo puede entrar en RESUMEN, Mapa de recursos y GRAFICAS.
   - Al cambiar de usuario, limpiar restos de menú/vista del rol anterior sin Ctrl+F5.
   - Botón Refrescar junto a Salir: recarga /api/state y repinta la ventana activa sin pedir login. */
(function(){
  'use strict';

  const VERSION = 'ControlEvent v50.3';
  const VERSION_FILE = 'ControlEvent_v50_3';
  const TABS = ['ingresos','donaciones','compras','mapa','planificacion','resumen','graficas'];
  const PANEL_BY_TAB = {
    ingresos:'tabIngresos',
    donaciones:'tabDonaciones',
    compras:'tabCompras',
    mapa:'tabMapaProductos',
    planificacion:'tabPlanificacionInicial',
    resumen:'tabResumen',
    graficas:'tabGraficas'
  };
  const BUTTON_BY_TAB = {
    ingresos:'tabIngresosBtn',
    donaciones:'tabDonacionesBtn',
    compras:'tabComprasBtn',
    mapa:'tabMapaBtn',
    planificacion:'tabPlanificacionBtn',
    resumen:'tabResumenBtn',
    graficas:'tabGraficasBtn'
  };
  const TAB_BY_BUTTON = Object.entries(BUTTON_BY_TAB).reduce((acc,[tab,id]) => (acc[id] = tab, acc), {});
  const refreshState = {busy:false, lastRole:'', lastUserKey:''};

  function $(id){ return document.getElementById(id); }
  function safe(fn, fallback){ try{ const value = fn(); return value === undefined ? fallback : value; }catch(_){ return fallback; } }
  function getGlobalFn(name){
    if(typeof window[name] === 'function') return window[name];
    return safe(() => Function('return (typeof '+name+' === "function") ? '+name+' : null')(), null);
  }
  function call(name, args){ const fn = getGlobalFn(name); if(typeof fn !== 'function') return undefined; try{ return fn.apply(window, args || []); }catch(error){ console.warn('[v45.4] Error en '+name, error); return undefined; } }
  function st(){ return safe(() => (typeof state !== 'undefined' && state) || window.state || window.ControlEventApp?.state || {}, window.state || window.ControlEventApp?.state || {}); }
  function auth(){ return safe(() => (typeof authUser !== 'undefined' && authUser) || window.authUser || window.ControlEventApp?.authUser || null, window.authUser || window.ControlEventApp?.authUser || null); }
  function role(){ return String(auth()?.nivel || '').toUpperCase(); }
  function isRO(){ return role() === 'RO'; }
  function isGD(){ return role() === 'GD'; }
  function userKey(){ const u = auth(); return u ? String(u.identificacion || u.nombre || '') + '|' + String(u.nivel || '') : ''; }
  function events(){ const s = st(); return Array.isArray(s.eventos) ? s.eventos : []; }
  function hasEventId(id){ const sid = String(id || ''); return !!sid && events().some(e => String(e.id || '') === sid); }
  function eventId(){ return String(st().selectedEventId || ''); }
  function hasEvent(){ return hasEventId(eventId()); }
  function currentTab(){
    const lexical = safe(() => (typeof currentMainTab !== 'undefined' ? currentMainTab : ''), '');
    if(TABS.includes(String(lexical))) return String(lexical);
    const appTab = safe(() => window.ControlEventApp?.navigation?.currentMainTab || '', '');
    if(TABS.includes(String(appTab))) return String(appTab);
    const visible = TABS.find(tab => { const panel = $(PANEL_BY_TAB[tab]); return panel && !panel.classList.contains('hidden'); });
    return visible || 'ingresos';
  }
  function roleAllowsTab(tab){
    const name = String(tab || '');
    if(!auth()) return false;
    if(isRO()) return ['resumen','mapa','graficas'].includes(name);
    if(name === 'planificacion') return isGD();
    return TABS.includes(name);
  }
  function defaultTabForRole(prefer){
    const p = String(prefer || '');
    if(roleAllowsTab(p)) return p;
    if(isRO()) return 'resumen';
    return roleAllowsTab('ingresos') ? 'ingresos' : 'resumen';
  }
  function setCurrentTab(tab){
    const next = defaultTabForRole(tab || currentTab());
    try{ currentMainTab = next; }catch(_){ }
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = next; }catch(_){ }
    try{ window.__ceCurrentMainTab = next; }catch(_){ }
    return next;
  }
  function show(el, yes){
    if(!el) return;
    if(yes){
      el.classList.remove('hidden','hidden-by-role-v228','ce-v452-hidden-role');
      el.removeAttribute('hidden');
      el.removeAttribute('aria-hidden');
      el.removeAttribute('aria-disabled');
      el.disabled = false;
      el.style.removeProperty('display');
      el.style.removeProperty('visibility');
      el.style.removeProperty('pointer-events');
      el.style.removeProperty('opacity');
    }else{
      el.classList.add('hidden','ce-v452-hidden-role');
      el.setAttribute('aria-hidden','true');
      el.setAttribute('aria-disabled','true');
      el.disabled = true;
      el.style.setProperty('display','none','important');
    }
  }
  function clearDeniedPanels(){
    if(!isRO()) return;
    ['ingresos','donaciones','compras','planificacion'].forEach(tab => {
      const panel = $(PANEL_BY_TAB[tab]);
      if(panel){ panel.classList.add('hidden','ce-v452-hidden-role'); panel.style.setProperty('display','none','important'); }
    });
    ['btnOpenImport','btnExportSeed','btnToggleMaintenance'].forEach(id => show($(id), false));
    document.querySelectorAll('.mobile-menu-action[data-target="btnOpenImport"],.mobile-menu-action[data-target="btnExportSeed"],.mobile-menu-action[data-target="btnToggleMaintenance"]').forEach(el => show(el, false));
  }
  function clearRoleResiduesForWritable(){
    if(isRO()) return;
    // v45.4: al pasar de RO a GD/RW, limpiar restos de display:none!important y clases de ocultación del rol anterior.
    Object.values(PANEL_BY_TAB).forEach(id => {
      const panel = $(id);
      if(!panel) return;
      panel.classList.remove('ce-v452-hidden-role');
      panel.removeAttribute('aria-hidden');
      panel.removeAttribute('aria-disabled');
      panel.style.removeProperty('display');
      panel.style.removeProperty('visibility');
      panel.style.removeProperty('pointer-events');
      panel.style.removeProperty('opacity');
    });
    Object.values(BUTTON_BY_TAB).forEach(id => show($(id), roleAllowsTab(TAB_BY_BUTTON[id] || '')));
    document.querySelectorAll('.mobile-menu-action[data-target],#btnOpenImport,#btnExportSeed,#btnToggleMaintenance').forEach(el => {
      el.classList.remove('ce-v452-hidden-role');
      el.removeAttribute('aria-hidden');
      el.removeAttribute('aria-disabled');
      el.style.removeProperty('display');
      el.style.removeProperty('visibility');
      el.style.removeProperty('pointer-events');
      el.style.removeProperty('opacity');
      if('disabled' in el) el.disabled = false;
    });
  }
  function applyVersion(){
    try{ document.title = VERSION; document.body.dataset.ceVersion = VERSION; window.__ceVersion = VERSION; window.VERSION = VERSION; window.VERSION_FILE = VERSION_FILE; }catch(_){ }
    try{
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
        const text = el.textContent || '';
        if(/ControlEvent\s+v\d+(?:\.\d+)*/i.test(text)) el.textContent = text.replace(/ControlEvent\s+v\d+(?:\.\d+)*/ig, VERSION);
      });
    }catch(_){ }
  }
  function syncRoleMenu(){
    applyVersion();
    const r = role();
    const currentUser = userKey();
    if(currentUser && (currentUser !== refreshState.lastUserKey || r !== refreshState.lastRole)){
      refreshState.lastUserKey = currentUser;
      refreshState.lastRole = r;
      if(!roleAllowsTab(currentTab())) setCurrentTab(defaultTabForRole());
    }
    if(!auth()) return;
    clearRoleResiduesForWritable();
    if(!roleAllowsTab(currentTab())) setCurrentTab(defaultTabForRole());
    Object.entries(BUTTON_BY_TAB).forEach(([tab,id]) => show($(id), roleAllowsTab(tab)));
    document.querySelectorAll('.mobile-menu-action[data-target]').forEach(el => {
      const tab = TAB_BY_BUTTON[el.dataset?.target || ''];
      if(tab) show(el, roleAllowsTab(tab));
    });
    clearDeniedPanels();
    if(hasEvent()){
      const active = setCurrentTab(currentTab());
      TABS.forEach(tab => {
        const panel = $(PANEL_BY_TAB[tab]);
        if(panel){
          const visible = roleAllowsTab(tab) && tab === active;
          panel.classList.toggle('hidden', !visible);
          if(visible) panel.style.removeProperty('display');
          else if(isRO() && !roleAllowsTab(tab)) panel.style.setProperty('display','none','important');
        }
        const btn = $(BUTTON_BY_TAB[tab]);
        if(btn) btn.classList.toggle('active', roleAllowsTab(tab) && tab === active);
      });
    }
    try{ call('renderPermissions'); call('renderLockState'); }catch(_){ }
  }
  function injectStyle(){
    if($('ceV452Style')) return;
    const style = document.createElement('style');
    style.id = 'ceV452Style';
    style.textContent = `
      #btnSoftRefresh{display:inline-flex!important;align-items:center;justify-content:center;gap:4px;min-width:74px;pointer-events:auto!important;position:relative;z-index:40;}
      #btnSoftRefresh.ce-refreshing{opacity:.72;pointer-events:none!important;}
      #ceSoftRefreshNotice{position:fixed;right:calc(env(safe-area-inset-right,0px) + 12px);top:calc(env(safe-area-inset-top,0px) + 58px);z-index:5200;max-width:min(380px,90vw);padding:10px 13px;border-radius:15px;background:rgba(17,24,39,.94);color:#fff;font-weight:850;font-size:12px;box-shadow:0 12px 28px rgba(15,23,42,.24);opacity:0;transform:translateY(-6px);transition:opacity .16s ease, transform .16s ease;pointer-events:none;}
      #ceSoftRefreshNotice.visible{opacity:1;transform:translateY(0);}
      .ce-v452-hidden-role{display:none!important;}
      body.ce-role-ro-v452 #tabIngresosBtn,body.ce-role-ro-v452 #tabDonacionesBtn,body.ce-role-ro-v452 #tabComprasBtn,body.ce-role-ro-v452 #tabPlanificacionBtn{display:none!important;}
      body:not(.ce-role-gd-v452) #tabPlanificacionBtn{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      @media(max-width:760px){#btnLogout:not(.hidden){position:fixed!important;right:calc(env(safe-area-inset-right,0px) + 6px)!important;top:calc(env(safe-area-inset-top,0px) + 6px)!important;z-index:6200!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:54px!important;height:34px!important;padding:0 9px!important;border-radius:12px!important;background:rgba(255,255,255,.96)!important;box-shadow:0 8px 24px rgba(15,23,42,.18)!important;font-size:12px!important;font-weight:900!important;pointer-events:auto!important;}#btnSoftRefresh:not(.hidden){position:fixed!important;right:calc(env(safe-area-inset-right,0px) + 66px)!important;top:calc(env(safe-area-inset-top,0px) + 6px)!important;z-index:6199!important;height:34px!important;min-width:72px!important;padding:0 8px!important;border-radius:12px!important;background:rgba(255,255,255,.96)!important;box-shadow:0 8px 24px rgba(15,23,42,.14)!important;font-size:11px!important;font-weight:850!important;pointer-events:auto!important;}}
    `;
    document.head.appendChild(style);
  }
  function softNotice(text){
    injectStyle();
    let box = $('ceSoftRefreshNotice');
    if(!box){ box = document.createElement('div'); box.id = 'ceSoftRefreshNotice'; document.body.appendChild(box); }
    box.textContent = text || '';
    box.classList.add('visible');
    clearTimeout(box.__timer);
    box.__timer = setTimeout(() => box.classList.remove('visible'), 1800);
  }
  function bindRefreshButton(btn){
    if(!btn || btn.__ceV453RefreshBound) return;
    btn.__ceV453RefreshBound = true;
    const run = function(event){
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      refreshActive('button-direct');
      return false;
    };
    // Click directo además del capturador global: evita que otros listeners de menú lo traten como botón normal.
    btn.addEventListener('click', run, true);
    btn.onclick = run;
  }
  function injectRefreshButton(){
    injectStyle();
    const logout = $('btnLogout');
    let btn = $('btnSoftRefresh');
    if(!btn && logout){
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'btnSoftRefresh';
      btn.className = 'outline small hidden';
      btn.title = 'Refrescar datos de la ventana activa sin salir';
      btn.textContent = 'Refrescar';
      logout.insertAdjacentElement('beforebegin', btn);
    }
    if(btn){
      btn.type = 'button';
      btn.title = 'Refrescar datos de la ventana activa sin salir';
      btn.style.pointerEvents = 'auto';
      bindRefreshButton(btn);
    }
  }
  function setRefreshVisible(){
    injectRefreshButton();
    const btn = $('btnSoftRefresh');
    if(btn){
      btn.classList.toggle('hidden', !auth());
      btn.disabled = !!refreshState.busy;
      btn.style.pointerEvents = refreshState.busy ? 'none' : 'auto';
      bindRefreshButton(btn);
    }
    try{ document.body.classList.toggle('ce-role-ro-v452', isRO()); }catch(_){ }
  }
  async function loadFreshState(){
    const res = await fetch('/api/state', {cache:'no-store'});
    if(!res.ok) throw new Error('No se pudo cargar /api/state');
    const serverState = await res.json();
    let merged = serverState || {};
    const merge = getGlobalFn('mergeLoadedState');
    const defaults = getGlobalFn('defaultState');
    if(typeof merge === 'function' && typeof defaults === 'function') merged = merge(serverState, defaults());
    const target = st();
    Object.keys(target).forEach(k => { delete target[k]; });
    Object.assign(target, merged || {});
    try{ if(window.ControlEventApp) window.ControlEventApp.state = target; }catch(_){ }
    return target;
  }
  async function refreshActive(reason){
    if(refreshState.busy){ softNotice('Ya se está refrescando...'); return false; }
    if(!auth()){ softNotice('No hay usuario identificado.'); return false; }
    const btn = $('btnSoftRefresh');
    const prevText = btn?.textContent || 'Refrescar';
    const activeBefore = defaultTabForRole(currentTab());
    const eventBefore = eventId();
    refreshState.busy = true;
    if(btn){ btn.classList.add('ce-refreshing'); btn.textContent = 'Refrescando...'; btn.disabled = true; }
    softNotice('Refrescando datos...');
    try{
      const s = await loadFreshState();
      const keepEvent = hasEventId(eventBefore) ? eventBefore : '';
      s.selectedEventId = keepEvent;
      const active = setCurrentTab(activeBefore);
      try{ window.ControlEventV447?.install?.(); }catch(_){ }
      syncRoleMenu();
      call('renderAuthUI');
      call('renderHeader');
      if(keepEvent){
        const switcher = window.ControlEventV447;
        if(switcher && typeof switcher.selectEvent === 'function'){
          await switcher.selectEvent(keepEvent, {force:true, tab:active, delay:0, reason:reason || 'soft-refresh'});
        }else{
          call('render');
        }
      }else{
        call('render');
      }
      setTimeout(() => { try{ window.ControlEventV447?.install?.(); }catch(_){ } syncRoleMenu(); }, 80);
      setTimeout(() => {
        const tab = defaultTabForRole(currentTab());
        try{ window.ControlEventViewRefreshStabilizer?.hydrate?.(tab, 'v45.4-soft-refresh'); }catch(_){ }
      }, 180);
      softNotice('Datos refrescados.');
      return true;
    }catch(error){
      console.warn('[v45.4] refresco limpio', error);
      softNotice('No se pudo refrescar. Usa Salir/Entrar si continúa.');
      return false;
    }finally{
      refreshState.busy = false;
      if(btn){ btn.classList.remove('ce-refreshing'); btn.textContent = prevText; btn.disabled = false; }
      setRefreshVisible();
    }
  }
  function handleRefreshClick(event){
    const btn = event.target?.closest?.('#btnSoftRefresh');
    if(!btn) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    refreshActive('button');
    return false;
  }
  function handleDeniedClick(event){
    const trigger = event.target?.closest?.('button[id],.mobile-menu-action[data-target]');
    if(!trigger || !auth()) return;
    const id = trigger.dataset?.target || trigger.id || '';
    const tab = TAB_BY_BUTTON[id] || '';
    if(tab && !roleAllowsTab(tab)){
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      softNotice(isRO() ? 'Usuario RO: solo RESUMEN, Mapa de recursos y GRAFICAS.' : 'Opción no disponible para este usuario.');
      syncRoleMenu();
      return false;
    }
  }
  function patchRender(){
    const old = getGlobalFn('render');
    if(typeof old !== 'function' || old.__ceV452RoleRefresh) return;
    const wrapped = function(){
      const result = old.apply(this, arguments);
      setTimeout(() => { syncRoleMenu(); setRefreshVisible(); }, 20);
      setTimeout(syncRoleMenu, 220);
      return result;
    };
    wrapped.__ceV452RoleRefresh = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
    try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.render = (...args) => wrapped(...args); }catch(_){ }
  }
  function patchLoginLogout(){
    ['doLogin','doLogout'].forEach(name => {
      const old = getGlobalFn(name);
      if(typeof old !== 'function' || old.__ceV452RoleRefresh) return;
      const wrapped = function(){
        const result = old.apply(this, arguments);
        Promise.resolve(result).finally(() => {
          setTimeout(() => { syncRoleMenu(); setRefreshVisible(); }, 50);
          setTimeout(() => { syncRoleMenu(); setRefreshVisible(); }, 500);
        });
        return result;
      };
      wrapped.__ceV452RoleRefresh = true;
      try{ window[name] = wrapped; }catch(_){ }
      try{ Function(name + ' = window["' + name + '"]')(); }catch(_){ }
    });
  }
  function install(){
    applyVersion();
    injectRefreshButton();
    setRefreshVisible();
    syncRoleMenu();
    patchRender();
    patchLoginLogout();
  }

  window.ControlEventV452 = {version:VERSION, refreshActive, syncRoleMenu, roleAllowsTab, defaultTabForRole, inspect:() => ({role:role(), user:userKey(), tab:currentTab(), eventId:eventId(), busy:refreshState.busy})};

  if(!window.__ceV452Capture){
    window.__ceV452Capture = true;
    window.addEventListener('click', handleRefreshClick, true);
    window.addEventListener('click', handleDeniedClick, true);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
  ['load','controlevent:app-ready','controlevent:runtime-ready','controlevent:modules-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 50)));
  [120, 700, 1500].forEach(ms => setTimeout(install, ms));
  // v50.3: evitar refresco visual continuo de menús por rol; solo se mantiene visible el botón Refrescar/Salir.
  setInterval(() => { setRefreshVisible(); }, window.ControlEventLowResource?.interval?.(12000) || 12000);
})();
