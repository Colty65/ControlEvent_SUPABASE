/* ControlEvent v50.19 - correccion de estabilidad sin temporizadores de version.
   - No se carga v50.7: se evita la restauracion agresiva de globos que los mandaba a la esquina.
   - Version unificada actualizando las constantes de los scripts cargados a v50.19.
   - Salir/Refrescar en movil se mueven a un dock real inferior, fuera del selector de evento.
   - Cierre tactil de globos reforzado en movil.
*/
(function(){
  'use strict';

  const VERSION = 'ControlEvent v50.19';
  const VERSION_FILE = 'ControlEvent_v50_19';
  const INSTALLED = '__ceV508FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const SESSION_KEY = 'ControlEvent_v26_9_session';
  const LOGOUT_KEY = 'ControlEvent_v50_19_logout_at';
  const TABS = ['ingresos','donaciones','compras','mapa','planificacion','resumen','graficas'];
  const BTN = {ingresos:'tabIngresosBtn',donaciones:'tabDonacionesBtn',compras:'tabComprasBtn',mapa:'tabMapaBtn',planificacion:'tabPlanificacionBtn',resumen:'tabResumenBtn',graficas:'tabGraficasBtn'};
  const PANEL = {ingresos:'tabIngresos',donaciones:'tabDonaciones',compras:'tabCompras',mapa:'tabMapaProductos',planificacion:'tabPlanificacionInicial',resumen:'tabResumen',graficas:'tabGraficas'};

  const $ = id => document.getElementById(id);
  const safe = (fn, fallback) => { try{ const v = fn(); return v === undefined ? fallback : v; }catch(_){ return fallback; } };
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const isMobile = () => safe(() => window.matchMedia('(max-width: 900px)').matches, innerWidth <= 900);

  function stop(ev){
    try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ }
    return false;
  }
  function setLexical(name, expr){ try{ Function(name + ' = ' + expr)(); }catch(_){ } }
  function getFn(name){ return safe(() => (typeof window[name] === 'function') ? window[name] : Function('return (typeof '+name+' === "function") ? '+name+' : null')(), null); }
  function auth(){
    return safe(() => (typeof authUser !== 'undefined' && authUser) ? authUser : null, null)
      || window.authUser
      || window.ControlEventApp?.authUser
      || window.__CONTROL_EVENT_USER__
      || null;
  }
  function role(){ return up(auth()?.nivel || ''); }
  function isRO(){ return role() === 'RO'; }
  function isGD(){ return role() === 'GD'; }
  function hasStoredSession(){
    const raw = safe(() => localStorage.getItem(SESSION_KEY), '');
    if(!raw) return false;
    const obj = safe(() => JSON.parse(raw), null);
    return !!(obj && typeof obj === 'object' && (obj.identificacion || obj.nombre || obj.nivel));
  }
  function explicitLogoutActive(){
    const t = Number(safe(() => sessionStorage.getItem(LOGOUT_KEY), 0) || 0);
    return t > 0 && (Date.now() - t) < 12 * 60 * 60 * 1000;
  }
  function authenticated(){ return !!auth() || (!explicitLogoutActive() && hasStoredSession()); }
  function clearExplicitLogout(){ safe(() => sessionStorage.removeItem(LOGOUT_KEY), null); }
  function markExplicitLogout(){ safe(() => sessionStorage.setItem(LOGOUT_KEY, String(Date.now())), null); }

  function currentTab(){
    const lexical = safe(() => (typeof currentMainTab !== 'undefined' ? String(currentMainTab || '') : ''), '');
    if(TABS.includes(lexical)) return lexical;
    const appTab = String(window.ControlEventApp?.navigation?.currentMainTab || window.__ceCurrentMainTab || '');
    if(TABS.includes(appTab)) return appTab;
    const visible = TABS.find(tab => {
      const panel = $(PANEL[tab]);
      return panel && !panel.classList.contains('hidden') && safe(() => getComputedStyle(panel).display !== 'none', true);
    });
    return visible || (isRO() ? 'resumen' : 'ingresos');
  }
  function roleAllows(tab){
    if(!authenticated()) return false;
    const t = String(tab || '');
    if(isRO()) return ['resumen','mapa','graficas'].includes(t);
    if(t === 'planificacion') return isGD();
    return TABS.includes(t);
  }
  function setCurrentTab(tab){
    const preferred = String(tab || currentTab() || '');
    const next = roleAllows(preferred) ? preferred : (isRO() ? 'resumen' : 'ingresos');
    try{ currentMainTab = next; }catch(_){ }
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = next; }catch(_){ }
    window.__ceCurrentMainTab = next;
    return next;
  }

  function injectStyle(){
    if($('ceV508FinalStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV508FinalStyle';
    style.textContent = `
      body.ce-authenticated-v508 #authOverlay{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}
      body.ce-logged-out-v508 #authOverlay{display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;z-index:200000!important;}
      body.ce-logged-out-v508 .app,body.ce-logged-out-v508 .footer{filter:none!important;pointer-events:none!important;user-select:none!important;}
      body.ce-logged-out-v508 #ceMobileActionDockV508{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      body.ce-role-ro-v508 #tabIngresosBtn,body.ce-role-ro-v508 #tabDonacionesBtn,body.ce-role-ro-v508 #tabComprasBtn,body.ce-role-ro-v508 #tabPlanificacionBtn{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      body.ce-role-ro-v508 #mainTabs.tabs{display:grid!important;grid-template-columns:repeat(3,48px)!important;justify-content:center!important;justify-items:center!important;gap:10px!important;overflow:visible!important;transition:none!important;animation:none!important;}
      body.ce-role-ro-v508 #tabResumenBtn{order:1!important;}body.ce-role-ro-v508 #tabMapaBtn{order:2!important;}body.ce-role-ro-v508 #tabGraficasBtn{order:3!important;}
      #ceMobileActionDockV508{display:none;}
      .ce-v508-tip-close{position:sticky!important;top:0!important;float:right!important;z-index:3!important;width:34px!important;height:34px!important;min-width:34px!important;min-height:34px!important;border-radius:999px!important;border:1px solid rgba(15,23,42,.18)!important;background:rgba(255,255,255,.94)!important;color:#111827!important;font-size:21px!important;font-weight:950!important;line-height:1!important;display:flex!important;align-items:center!important;justify-content:center!important;margin:0 0 4px 8px!important;padding:0!important;box-shadow:0 4px 12px rgba(15,23,42,.12)!important;}
      #ceBudgetLiteTooltipV307 .ce-budget-lite-close{position:sticky!important;top:0!important;z-index:4!important;width:34px!important;height:34px!important;min-width:34px!important;min-height:34px!important;}
      #ceTooltipV21,#ceBudgetLiteTooltipV307,.ce-v21-tooltip,.ce-budget-tooltip,.ce-tooltip{overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;}
      @media(max-width:900px){
        body.ce-authenticated-v508 #ceMobileActionDockV508{display:flex!important;position:fixed!important;right:calc(env(safe-area-inset-right,0px) + 7px)!important;bottom:calc(env(safe-area-inset-bottom,0px) + 10px)!important;left:auto!important;top:auto!important;z-index:2280!important;flex-direction:column!important;gap:4px!important;align-items:flex-end!important;justify-content:flex-end!important;opacity:.38!important;pointer-events:none!important;transition:opacity .14s ease!important;}
        body.ce-authenticated-v508 #ceMobileActionDockV508:active,body.ce-authenticated-v508 #ceMobileActionDockV508:focus-within{opacity:.94!important;}
        body.ce-authenticated-v508 #ceMobileActionDockV508 #btnLogout:not(.hidden),body.ce-authenticated-v508 #ceMobileActionDockV508 #btnSoftRefresh:not(.hidden){position:static!important;display:inline-flex!important;visibility:visible!important;top:auto!important;left:auto!important;right:auto!important;bottom:auto!important;transform:none!important;align-items:center!important;justify-content:center!important;height:30px!important;min-height:30px!important;min-width:54px!important;border-radius:999px!important;background:rgba(255,255,255,.62)!important;color:#111827!important;border:1px solid rgba(15,23,42,.16)!important;box-shadow:0 5px 14px rgba(15,23,42,.10)!important;font-size:10px!important;font-weight:950!important;line-height:1!important;pointer-events:auto!important;touch-action:manipulation!important;padding:0 8px!important;margin:0!important;backdrop-filter:blur(5px)!important;-webkit-backdrop-filter:blur(5px)!important;}
        body.ce-authenticated-v508 #ceMobileActionDockV508 #btnSoftRefresh:not(.hidden){min-width:66px!important;}
        body.ce-authenticated-v508 #ceMobileActionDockV508 #btnLogout:active,body.ce-authenticated-v508 #ceMobileActionDockV508 #btnSoftRefresh:active{background:rgba(255,255,255,.96)!important;}
        body.ce-authenticated-v508 .appname{padding-left:0!important;}
        #ceTooltipV21,#ceBudgetLiteTooltipV307,.ce-v21-tooltip,.ce-budget-tooltip,.ce-tooltip{z-index:4100!important;max-width:calc(100vw - 18px)!important;max-height:78vh!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function applyVersion(){
    try{
      document.title = VERSION;
      document.body.dataset.ceVersion = VERSION;
      window.__ceVersion = VERSION;
      window.VERSION = VERSION;
      window.VERSION_FILE = VERSION_FILE;
      window.ControlEventVersion = {version: VERSION, versionFile: VERSION_FILE};
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
        const t = el.textContent || '';
        if(/ControlEvent\s+v\d+(?:\.\d+)*/i.test(t)) el.textContent = t.replace(/ControlEvent\s+v\d+(?:\.\d+)*/ig, VERSION);
      });
    }catch(_){ }
  }

  function syncAuthAndRole(){
    const ok = authenticated();
    document.body.classList.toggle('ce-authenticated-v508', ok);
    document.body.classList.toggle('ce-logged-out-v508', !ok && explicitLogoutActive());
    document.body.classList.toggle('ce-role-ro-v508', ok && isRO());
    document.body.classList.toggle('ce-role-rw-v508', ok && role() === 'RW');
    document.body.classList.toggle('ce-role-gd-v508', ok && role() === 'GD');

    const overlay = $('authOverlay');
    if(ok && overlay){
      overlay.classList.add('hidden');
      overlay.style.setProperty('display','none','important');
      overlay.style.setProperty('visibility','hidden','important');
      overlay.style.setProperty('pointer-events','none','important');
    }else if(!ok && explicitLogoutActive() && overlay){
      overlay.classList.remove('hidden');
      overlay.removeAttribute('hidden');
      overlay.style.removeProperty('display');
      overlay.style.removeProperty('visibility');
      overlay.style.removeProperty('pointer-events');
    }

    if(ok){
      const active = setCurrentTab(currentTab());
      Object.entries(BTN).forEach(([tab,id]) => {
        const btn = $(id); if(!btn) return;
        const allowed = roleAllows(tab);
        btn.classList.toggle('hidden', !allowed);
        btn.classList.toggle('active', allowed && tab === active);
        btn.toggleAttribute('hidden', !allowed);
        btn.setAttribute('aria-hidden', allowed ? 'false' : 'true');
        if(!allowed) btn.style.setProperty('display','none','important'); else btn.style.removeProperty('display');
      });
      Object.entries(PANEL).forEach(([tab,id]) => {
        const panel = $(id); if(!panel) return;
        const visible = roleAllows(tab) && tab === active;
        panel.classList.toggle('hidden', !visible);
        if(visible){ panel.removeAttribute('hidden'); panel.removeAttribute('aria-hidden'); panel.style.removeProperty('display'); }
        else if(!roleAllows(tab)){ panel.setAttribute('aria-hidden','true'); panel.style.setProperty('display','none','important'); }
      });
      ['btnLogout','btnSoftRefresh'].forEach(id => { const btn=$(id); if(btn){ btn.classList.remove('hidden'); btn.disabled=false; btn.removeAttribute('hidden'); } });
    }else{
      ['btnLogout','btnSoftRefresh'].forEach(id => { const btn=$(id); if(btn) btn.classList.add('hidden'); });
    }
    ensureMobileDock();
  }

  function ensureMobileDock(){
    injectStyle();
    let dock = $('ceMobileActionDockV508');
    if(!dock){ dock = document.createElement('div'); dock.id = 'ceMobileActionDockV508'; dock.setAttribute('aria-label','Acciones de sesión'); document.body.appendChild(dock); }
    const logout = $('btnLogout');
    const refresh = $('btnSoftRefresh');
    [refresh, logout].forEach(btn => {
      if(!btn) return;
      if(!btn.__ceV508Home){ btn.__ceV508Home = {parent: btn.parentNode, next: btn.nextSibling}; }
    });
    const ok = authenticated();
    if(isMobile() && ok){
      if(refresh && refresh.parentNode !== dock) dock.appendChild(refresh);
      if(logout && logout.parentNode !== dock) dock.appendChild(logout);
      [refresh, logout].forEach(btn => { if(btn){ btn.classList.remove('hidden'); btn.removeAttribute('hidden'); btn.disabled=false; } });
    }else{
      [refresh, logout].forEach(btn => {
        if(!btn || !btn.__ceV508Home?.parent || btn.parentNode !== dock) return;
        try{ btn.__ceV508Home.parent.insertBefore(btn, btn.__ceV508Home.next || null); }catch(_){ try{ btn.__ceV508Home.parent.appendChild(btn); }catch(__){ } }
      });
    }
  }

  function hardLogout(ev){
    stop(ev || window.event || {});
    markExplicitLogout();
    try{ localStorage.removeItem(SESSION_KEY); }catch(_){ }
    try{ sessionStorage.removeItem('ce_v250_event_chosen'); }catch(_){ }
    setLexical('authUser','null');
    try{ window.authUser = null; }catch(_){ }
    try{ window.__CONTROL_EVENT_USER__ = null; }catch(_){ }
    try{ if(window.ControlEventApp) window.ControlEventApp.authUser = null; }catch(_){ }
    document.body.classList.remove('ce-authenticated-v508','ce-role-ro-v508','ce-role-rw-v508','ce-role-gd-v508','ce-authenticated-v504','ce-role-ro-v504','ce-role-rw-v504','ce-role-gd-v504','mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
    document.documentElement.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
    document.body.classList.remove('auth-locked');
    document.body.classList.add('ce-logged-out-v508');
    ['brandCurrentUserName','currentUserName'].forEach(id => { const el=$(id); if(el) el.textContent='Sin acceso'; });
    ['brandCurrentUserMeta','currentUserLevel'].forEach(id => { const el=$(id); if(el) el.textContent=''; });
    ['loginIdentificacion','loginClave','changeNewPassword1','changeNewPassword2'].forEach(id => { const el=$(id); if(el) el.value=''; });
    closeAllTooltips();
    const overlay = $('authOverlay');
    if(overlay){ overlay.classList.remove('hidden'); overlay.removeAttribute('hidden'); overlay.style.removeProperty('display'); overlay.style.removeProperty('visibility'); overlay.style.removeProperty('pointer-events'); }
    ['btnLogout','btnSoftRefresh'].forEach(id => $(id)?.classList.add('hidden'));
    ensureMobileDock();
    try{ fetch('/api/logout', {method:'POST', cache:'no-store'}).catch(() => {}); }catch(_){ }
    return false;
  }

  function patchLoginLogout(){
    const oldLogin = getFn('doLogin');
    if(typeof oldLogin === 'function' && !oldLogin.__ceV508Wrapped){
      const wrappedLogin = async function(){
        clearExplicitLogout();
        document.body.classList.remove('ce-logged-out-v508');
        const ret = await oldLogin.apply(this, arguments);
        [30,160,500].forEach(ms => setTimeout(() => { applyVersion(); syncAuthAndRole(); }, ms));
        return ret;
      };
      wrappedLogin.__ceV508Wrapped = true;
      try{ doLogin = wrappedLogin; }catch(_){ }
      window.doLogin = wrappedLogin;
    }
    const logout = function(ev){ return hardLogout(ev || window.event); };
    logout.__ceV508Wrapped = true;
    try{ doLogout = logout; }catch(_){ }
    window.doLogout = logout;
  }

  function tooltipRoots(){
    const ids = ['ceTooltipV21','ceBudgetLiteTooltipV307','ceV462Tooltip'];
    return ids.map($).filter(Boolean).concat(Array.from(document.querySelectorAll('.ce-v21-tooltip,.ce-budget-tooltip,.ce-tooltip'))).filter((el, i, arr) => arr.indexOf(el) === i);
  }
  function isTooltipOpen(el){
    return !!el && safe(() => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || 1) !== 0 && (el.classList.contains('open') || r.width > 0 || r.height > 0);
    }, false);
  }
  function hideTooltip(el){
    if(!el) return;
    if(el.id === 'ceBudgetLiteTooltipV307'){
      el.classList.remove('open');
      el.setAttribute('aria-hidden','true');
      return;
    }
    el.classList.remove('open','show','visible','ce-v462-tip-open');
    el.setAttribute('aria-hidden','true');
    el.style.setProperty('display','none','important');
  }
  function closeAllTooltips(){ tooltipRoots().forEach(hideTooltip); }
  function ensureTooltipCloseButtons(){
    tooltipRoots().forEach(el => {
      if(!isTooltipOpen(el)) return;
      if(el.id === 'ceBudgetLiteTooltipV307') return;
      if(el.querySelector(':scope > .ce-v508-tip-close')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ce-v508-tip-close';
      btn.setAttribute('aria-label','Cerrar globo');
      btn.textContent = '×';
      try{ el.insertBefore(btn, el.firstChild); }catch(_){ el.appendChild(btn); }
    });
  }
  function handleTooltipClose(ev){
    const budgetClose = ev.target?.closest?.('#ceBudgetLiteTooltipV307 .ce-budget-lite-close');
    if(budgetClose){ hideTooltip($('ceBudgetLiteTooltipV307')); return stop(ev); }
    const close = ev.target?.closest?.('.ce-v508-tip-close');
    if(close){ hideTooltip(close.closest('#ceTooltipV21,#ceV462Tooltip,.ce-v21-tooltip,.ce-budget-tooltip,.ce-tooltip')); return stop(ev); }
    return undefined;
  }
  function fixRestoredTooltips(){
    ensureTooltipCloseButtons();
    tooltipRoots().forEach(el => {
      if(!isTooltipOpen(el)) return;
      if(!isMobile()) return;
      try{
        el.style.setProperty('left','50%','important');
        el.style.setProperty('top','50%','important');
        el.style.setProperty('right','auto','important');
        el.style.setProperty('bottom','auto','important');
        el.style.setProperty('transform','translate(-50%,-50%)','important');
        el.style.setProperty('max-width','calc(100vw - 18px)','important');
        el.style.setProperty('max-height','78vh','important');
        el.style.setProperty('overflow','auto','important');
      }catch(_){ }
    });
  }


  let observerInstalled = false;
  let observerTimer = null;
  function installObserver(){
    if(observerInstalled) return;
    observerInstalled = true;
    const mo = new MutationObserver(() => {
      clearTimeout(observerTimer);
      observerTimer = setTimeout(() => { ensureMobileDock(); fixRestoredTooltips(); }, 60);
    });
    try{ mo.observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:['class','style','hidden','aria-hidden']}); }catch(_){ }
  }

  function patchRender(){
    const old = getFn('render');
    if(typeof old !== 'function' || old.__ceV508Wrapped) return;
    const wrapped = function(){
      const ret = old.apply(this, arguments);
      [40,200,700].forEach(ms => setTimeout(() => { applyVersion(); syncAuthAndRole(); fixRestoredTooltips(); }, ms));
      return ret;
    };
    wrapped.__ceV508Wrapped = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
    try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.render = (...args) => wrapped(...args); }catch(_){ }
  }

  function install(){ injectStyle(); applyVersion(); patchLoginLogout(); patchRender(); syncAuthAndRole(); fixRestoredTooltips(); installObserver(); }

  window.addEventListener('click', ev => { if(ev.target?.closest?.('#btnLogout')) return hardLogout(ev); if(ev.target?.closest?.('#btnLogin')) clearExplicitLogout(); }, true);
  ['click','pointerup','touchend'].forEach(type => document.addEventListener(type, ev => { const r = handleTooltipClose(ev); if(r === false) return r; }, {capture:true, passive:false}));
  document.addEventListener('click', () => setTimeout(fixRestoredTooltips, 20), true);
  document.addEventListener('pointerup', () => setTimeout(fixRestoredTooltips, 30), true);
  window.addEventListener('resize', () => { ensureMobileDock(); fixRestoredTooltips(); }, true);
  window.addEventListener('orientationchange', () => setTimeout(() => { ensureMobileDock(); fixRestoredTooltips(); }, 250), true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted','controlevent:modules-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  [0,80,300,900,1800].forEach(ms => setTimeout(install, ms));

  window.ControlEventV508 = {version: VERSION, versionFile: VERSION_FILE, install, logout: hardLogout, syncAuthAndRole, ensureMobileDock, closeAllTooltips};
})();
