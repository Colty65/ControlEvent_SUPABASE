/* ControlEvent v7.3_prod - refresco en sitio y cierre visual del flujo evento.
   Cambios funcionales concentrados:
   - Refres/Refrescar actualiza /api/state y repinta la ventana activa sin volver a CE ni cambiar a otra pestaña.
   - Al elegir/cargar evento se oculta de forma real la pantalla CE en móvil/iPad.
   - Visor de justificantes de globos visible por encima en iPad/iPhone, sin tocar justificantes dentro de INGRESOS. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v7.3_prod';
  const VERSION_FILE = 'ControlEvent_v7_3_prod';
  const INSTALLED = '__ceV5020FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const STYLE_ID = 'ceV5020FinalStyle';
  const BUDGET_TIP_ID = 'ceBudgetLiteTooltipV307';
  const TABS = ['ingresos','donaciones','compras','mapa','planificacion','resumen','graficas'];
  const PANEL_BY_TAB = {ingresos:'tabIngresos',donaciones:'tabDonaciones',compras:'tabCompras',mapa:'tabMapaProductos',planificacion:'tabPlanificacionInicial',resumen:'tabResumen',graficas:'tabGraficas'};
  const BUTTON_BY_TAB = {ingresos:'tabIngresosBtn',donaciones:'tabDonacionesBtn',compras:'tabComprasBtn',mapa:'tabMapaBtn',planificacion:'tabPlanificacionBtn',resumen:'tabResumenBtn',graficas:'tabGraficasBtn'};

  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const stop = ev => { try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; };
  const getLexical = name => safe(() => Function('return (typeof '+name+' !== "undefined") ? '+name+' : undefined;')(), undefined);
  const setLexical = (name, value) => safe(() => Function('value', name + ' = value;')(value), undefined);
  const getFn = name => safe(() => (typeof window[name] === 'function') ? window[name] : Function('return (typeof '+name+' === "function") ? '+name+' : null;')(), null);
  const call = (name, args) => { const fn = getFn(name); if(typeof fn !== 'function') return undefined; try{ return fn.apply(window, args || []); }catch(error){ console.warn('[v50.20] Error en '+name, error); return undefined; } };
  const st = () => getLexical('state') || window.state || window.ControlEventApp?.state || {};
  const auth = () => getLexical('authUser') || window.authUser || window.ControlEventApp?.authUser || null;
  const arr = k => Array.isArray(st()[k]) ? st()[k] : [];
  const eventById = id => arr('eventos').find(e => String(e.id || '') === String(id || '')) || null;
  const hasValidEvent = id => !!eventById(id == null ? st().selectedEventId : id);
  const currentEventId = () => String(st().selectedEventId || $('selectedEvent')?.value || '');
  const isMobileLike = () => safe(() => window.matchMedia('(max-width: 900px)').matches, window.innerWidth <= 900) || /iPad|iPhone|Android/i.test(navigator.userAgent || '');
  const role = () => String(auth()?.nivel || '').trim().toUpperCase();
  const isRO = () => role() === 'RO';
  const roleAllowsTab = tab => {
    const t = String(tab || '');
    if(!auth()) return false;
    if(isRO()) return ['resumen','mapa','graficas'].includes(t);
    if(t === 'planificacion') return role() === 'GD';
    return TABS.includes(t);
  };

  let refreshBusy = false;
  let lastTooltipThumbAt = 0;

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
        if(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/i.test(text)) el.textContent = text.replace(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/ig, VERSION);
      });
    }catch(_){ }
  }

  function injectStyle(){
    if($(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body.ce-v5020-has-event #noEventMessage,
      body.ce-v5020-has-event .ce-v44-welcome,
      body.ce-v5020-has-event .ce-v5019-welcome{display:none!important;visibility:hidden!important;pointer-events:none!important;max-height:0!important;overflow:hidden!important;margin:0!important;padding:0!important;border:0!important;}
      body.ce-v5020-has-event #tabGraficas:not(.hidden),
      body.ce-v5020-has-event #tabResumen:not(.hidden),
      body.ce-v5020-has-event #tabIngresos:not(.hidden),
      body.ce-v5020-has-event #tabDonaciones:not(.hidden),
      body.ce-v5020-has-event #tabCompras:not(.hidden),
      body.ce-v5020-has-event #tabMapaProductos:not(.hidden){display:block!important;}
      .ce-v468-modal{position:fixed!important;inset:0!important;display:flex!important;align-items:center!important;justify-content:center!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;z-index:650000!important;background:rgba(15,23,42,.74)!important;}
      .ce-v468-modal-card{position:relative!important;z-index:650001!important;}
      .ce-v468-modal-img{display:block!important;visibility:visible!important;opacity:1!important;}
      .ce-v468-modal [data-close]{touch-action:manipulation!important;pointer-events:auto!important;}
      #${BUDGET_TIP_ID}.open,#ceTooltipV21{z-index:600000!important;}
    `;
    document.head.appendChild(style);
  }

  function currentTab(){
    const lexical = safe(() => (typeof currentMainTab !== 'undefined' ? currentMainTab : ''), '');
    if(TABS.includes(String(lexical))) return String(lexical);
    const appTab = safe(() => window.ControlEventApp?.navigation?.currentMainTab || '', '');
    if(TABS.includes(String(appTab))) return String(appTab);
    const visible = TABS.find(tab => { const p = $(PANEL_BY_TAB[tab]); return p && !p.classList.contains('hidden') && getComputedStyle(p).display !== 'none'; });
    if(visible) return visible;
    const memorized = safe(() => window.__ceCurrentMainTab || '', '');
    if(TABS.includes(String(memorized))) return String(memorized);
    return isRO() ? 'resumen' : 'graficas';
  }
  function setTab(tab){
    let next = TABS.includes(String(tab)) ? String(tab) : currentTab();
    if(auth() && !roleAllowsTab(next)) next = isRO() ? 'resumen' : 'graficas';
    setLexical('currentMainTab', next);
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = next; }catch(_){ }
    try{ window.__ceCurrentMainTab = next; }catch(_){ }
    return next;
  }
  function clearWelcome(){
    if(!auth() || !hasValidEvent()) return;
    try{
      document.body.classList.remove('ce-v44-awaiting-event','ce-v5013-force-event-choice','ce-v5015-awaiting-event','ce-v5017-awaiting-event','ce-v5018-awaiting-event','ce-v5019-awaiting-event');
      document.body.classList.add('ce-v5020-has-event');
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
  }
  function showOnlyTab(tab){
    const active = setTab(tab || currentTab());
    TABS.forEach(t => {
      const p = $(PANEL_BY_TAB[t]);
      if(p){
        const visible = t === active && roleAllowsTab(t) && hasValidEvent();
        p.classList.toggle('hidden', !visible);
        if(visible){ p.style.removeProperty('display'); p.removeAttribute('aria-hidden'); }
      }
      const b = $(BUTTON_BY_TAB[t]);
      if(b) b.classList.toggle('active', t === active && hasValidEvent());
    });
    clearWelcome();
    return active;
  }

  function mergeFreshState(fresh, keepEvent){
    const target = st();
    let merged = fresh || {};
    try{ if(typeof mergeLoadedState === 'function' && typeof defaultState === 'function') merged = mergeLoadedState(fresh, defaultState()); }catch(_){ }
    Object.keys(target).forEach(k => delete target[k]);
    Object.assign(target, merged || {});
    target.selectedEventId = String(keepEvent || '');
    try{ if(window.ControlEventApp) window.ControlEventApp.state = target; }catch(_){ }
    const sel = $('selectedEvent'); if(sel) sel.value = String(keepEvent || '');
    return target;
  }

  function hydrateAfterRender(reason){
    clearWelcome();
    applyVersion();
    try{ window.ControlEventBudgetLiteTips?.sanitize?.(); }catch(_){ }
    try{ window.ControlEventV469?.hydrateEventReceipts?.(true); }catch(_){ }
    try{ window.ControlEventV469?.migrateLocalIngresoReceipts?.(); }catch(_){ }
    try{ window.ControlEventV469?.compactIngresoReceipts?.(); }catch(_){ }
    try{ window.ControlEventV469?.enrichOpenTooltips?.(); }catch(_){ }
    // enrichOpenTooltips no estaba exportado en v46.9: lo fuerzo indirectamente provocando una micro-mutación inocua.
    try{
      const b = $(BUDGET_TIP_ID) || $('ceTooltipV21');
      if(b){ b.dataset.ceV5020Hydrate = String(Date.now()); }
    }catch(_){ }
  }

  function renderActiveOnly(tab, reason){
    if(!hasValidEvent()) return;
    const active = showOnlyTab(tab || currentTab());
    try{ window.ControlEventV447?.renderActive?.(active); }
    catch(error){
      console.warn('[v50.20] renderActive fallback', error);
      call('renderHeader'); call('renderMainSelectors');
      if(active === 'ingresos'){ call('renderIngresosSummary'); call('renderColabs'); }
      else if(active === 'donaciones') call('renderDonaciones');
      else if(active === 'compras') call('renderCompras');
      else if(active === 'resumen') call('renderBudget');
      else if(active === 'graficas') call('renderGraficas', [{force:true, reason:reason || 'v50.20'}]);
      else if(active === 'mapa') call('renderMapaProductos');
      else if(active === 'planificacion') { try{ window.showPlanificacionInicial?.(); }catch(_){ } }
    }
    clearWelcome();
    [60,180,420,900,1600].forEach(ms => setTimeout(() => hydrateAfterRender(reason || 'render-active'), ms));
  }

  async function refreshInPlace(ev){
    if(ev) stop(ev);
    if(refreshBusy) return false;
    const keepEvent = currentEventId();
    const keepTab = currentTab();
    if(!auth() || !keepEvent || !eventById(keepEvent)) return false;
    refreshBusy = true;
    const btns = Array.from(document.querySelectorAll('#btnSoftRefresh,#ceBtnRefresV518'));
    btns.forEach(b => { try{ b.disabled = true; b.classList.add('ce-refreshing'); }catch(_){ } });
    try{
      const res = await fetch('/api/state', {cache:'no-store'});
      if(res.ok){
        const fresh = await res.json().catch(() => ({}));
        mergeFreshState(fresh, keepEvent);
      }
      setTab(keepTab);
      clearWelcome();
      renderActiveOnly(keepTab, 'refresh-in-place');
      return false;
    }catch(error){
      console.warn('[v50.20] Refres en sitio falló', error);
      renderActiveOnly(keepTab, 'refresh-fallback');
      return false;
    }finally{
      refreshBusy = false;
      btns.forEach(b => { try{ b.disabled = false; b.classList.remove('ce-refreshing'); }catch(_){ } });
    }
  }

  function patchLegacyRefresh(){
    try{
      if(window.ControlEventV452 && !window.ControlEventV452.__ceV5020RefreshPatched){
        window.ControlEventV452.__ceV5020RefreshPatched = true;
        window.ControlEventV452.refreshActive = function(){ return refreshInPlace(); };
      }
      const btn = $('btnSoftRefresh');
      if(btn && !btn.__ceV5020RefreshBound){
        btn.__ceV5020RefreshBound = true;
        const run = ev => refreshInPlace(ev);
        btn.addEventListener('click', run, true);
        btn.onclick = run;
      }
    }catch(_){ }
  }

  function ensureModalVisible(){
    const modal = document.querySelector('.ce-v468-modal');
    if(!modal) return;
    modal.style.setProperty('display','flex','important');
    modal.style.setProperty('visibility','visible','important');
    modal.style.setProperty('opacity','1','important');
    modal.style.setProperty('pointer-events','auto','important');
    modal.style.setProperty('z-index','650000','important');
    const img = modal.querySelector('img');
    if(img){ img.style.setProperty('display','block','important'); img.style.setProperty('visibility','visible','important'); img.style.setProperty('opacity','1','important'); }
  }

  function installHandlers(){
    if(window.__ceV5020Handlers) return;
    window.__ceV5020Handlers = true;
    ['click','touchend','pointerup'].forEach(type => {
      window.addEventListener(type, ev => {
        if(ev.target?.closest?.('#btnSoftRefresh,#ceBtnRefresV518')) return refreshInPlace(ev);
      }, {capture:true, passive:false});
    });
    document.addEventListener('change', ev => {
      if(ev.target?.id === 'selectedEvent'){
        const id = String(ev.target.value || '');
        if(id && eventById(id)) [120,360,800,1500].forEach(ms => setTimeout(() => { clearWelcome(); renderActiveOnly(currentTab() || 'graficas', 'event-change'); }, ms));
      }
    }, true);
    document.addEventListener('click', ev => {
      if(ev.target?.closest?.('.ce-v465-tip-thumb')){
        lastTooltipThumbAt = Date.now();
        [0,80,180,360].forEach(ms => setTimeout(ensureModalVisible, ms));
      }
    }, true);
    document.addEventListener('pointerup', ev => {
      if(ev.target?.closest?.('.ce-v465-tip-thumb')){
        lastTooltipThumbAt = Date.now();
        [0,80,180,360].forEach(ms => setTimeout(ensureModalVisible, ms));
      }
    }, true);
    document.addEventListener('click', ev => {
      if(ev.target?.closest?.('.ce-v468-modal [data-close],.ce-v468-modal')){
        setTimeout(() => { if(Date.now() - lastTooltipThumbAt < 12000) hydrateAfterRender('modal-close'); }, 80);
      }
    }, true);
  }

  function install(){
    injectStyle();
    applyVersion();
    patchLegacyRefresh();
    installHandlers();
    if(auth() && hasValidEvent()){
      clearWelcome();
      showOnlyTab(currentTab());
      [180,700,1600].forEach(ms => setTimeout(() => hydrateAfterRender('install'), ms));
    }else{
      try{ document.body.classList.remove('ce-v5020-has-event'); }catch(_){ }
    }
  }

  window.ControlEventV5020 = {version:VERSION, versionFile:VERSION_FILE, install, refreshInPlace, renderActiveOnly, clearWelcome, applyVersion};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true}); else install();
  ['load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 40)));
  [80,260,800,1800,3600].forEach(ms => setTimeout(install, ms));
})();
