/* ControlEvent v50.23 - cierre de estabilidad sobre la base v50.20/v50.22.
   Objetivo: tocar solo la transicion que quedaba pendiente.
   - Cambio de usuario + eleccion de evento: rehidratacion de todos los globos tras el render real.
   - Version unica para cabecera, descargas e INFOEVENTO.
   - Boton Refres en verde Excel mientras actualiza y blanco al terminar. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v50.23';
  const VERSION_FILE = 'ControlEvent_v50_23';
  const INSTALLED = '__ceV5023FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const STYLE_ID = 'ceV5023FinalStyle';
  const VERSION_OBSERVER = '__ceV5023VersionObserver';
  const TABS = ['ingresos','donaciones','compras','mapa','planificacion','resumen','graficas'];
  const PANEL_BY_TAB = {ingresos:'tabIngresos',donaciones:'tabDonaciones',compras:'tabCompras',mapa:'tabMapaProductos',planificacion:'tabPlanificacionInicial',resumen:'tabResumen',graficas:'tabGraficas'};
  const BUTTON_BY_TAB = {ingresos:'tabIngresosBtn',donaciones:'tabDonacionesBtn',compras:'tabComprasBtn',mapa:'tabMapaBtn',planificacion:'tabPlanificacionBtn',resumen:'tabResumenBtn',graficas:'tabGraficasBtn'};
  const AWAIT_CLASSES = [
    'ce-v44-awaiting-event','ce-v5013-force-event-choice','ce-v5015-awaiting-event','ce-v5017-awaiting-event','ce-v5018-awaiting-event','ce-v5019-awaiting-event','ce-v5021-awaiting-event','ce-v5022-awaiting-event'
  ];

  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const getLexical = name => safe(() => Function('return (typeof '+name+' !== "undefined") ? '+name+' : undefined;')(), undefined);
  const setLexical = (name, value) => safe(() => Function('value', name + ' = value;')(value), undefined);
  const getFn = name => safe(() => (typeof window[name] === 'function') ? window[name] : Function('return (typeof '+name+' === "function") ? '+name+' : null;')(), null);
  const st = () => getLexical('state') || window.state || window.ControlEventApp?.state || {};
  const auth = () => getLexical('authUser') || window.authUser || window.ControlEventApp?.authUser || null;
  const arr = k => Array.isArray(st()[k]) ? st()[k] : [];
  const eventById = id => arr('eventos').find(e => String(e?.id || '') === String(id || '')) || null;
  const hasValidEvent = id => !!eventById(id == null ? st().selectedEventId : id);
  const currentEventId = () => String(st().selectedEventId || $('selectedEvent')?.value || '');
  const role = () => String(auth()?.nivel || '').trim().toUpperCase();
  const isRO = () => role() === 'RO';
  const roleAllowsTab = tab => {
    const t = String(tab || '');
    if(!auth()) return false;
    if(isRO()) return ['resumen','mapa','graficas'].includes(t);
    if(t === 'planificacion') return role() === 'GD';
    return TABS.includes(t);
  };

  let applyingVersion = false;
  let lastHydrateAt = 0;
  let hydrateTimer = 0;
  let lastEventId = '';

  function replaceVersionText(text){
    return String(text || '')
      .replace(/ControlEvent\s+v\d+(?:\.\d+)*/ig, VERSION)
      .replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE);
  }

  function applyVersion(){
    if(applyingVersion) return;
    applyingVersion = true;
    try{
      document.title = VERSION;
      document.documentElement.dataset.ceVersion = VERSION;
      if(document.body) document.body.dataset.ceVersion = VERSION;
      window.__ceVersion = VERSION;
      window.VERSION = VERSION;
      window.VERSION_FILE = VERSION_FILE;
      window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE};
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
        const next = replaceVersionText(el.textContent || '');
        if(next && next !== el.textContent) el.textContent = next;
      });
    }catch(_){ }
    finally{ applyingVersion = false; }
  }

  function patchVersionOutputs(){
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__ceV5023VersionFile){
        const old = proto.click;
        const wrapped = function(){
          try{ if(this.download) this.download = replaceVersionText(this.download); }catch(_){ }
          return old.apply(this, arguments);
        };
        wrapped.__ceV5023VersionFile = true;
        proto.click = wrapped;
      }
    }catch(_){ }
    try{
      if(!window.URL.__ceV5023ObjectUrl){
        const oldCreate = window.URL.createObjectURL.bind(window.URL);
        window.URL.createObjectURL = function(){ return oldCreate.apply(this, arguments); };
        window.URL.__ceV5023ObjectUrl = true;
      }
    }catch(_){ }
  }

  function watchVersionLabel(){
    if(window[VERSION_OBSERVER]) return;
    window[VERSION_OBSERVER] = true;
    try{
      const mo = new MutationObserver(() => applyVersion());
      mo.observe(document.documentElement, {childList:true, subtree:true, characterData:true});
    }catch(_){ }
  }

  function injectStyle(){
    if($(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #btnSoftRefresh.ce-refreshing,#ceBtnRefresV518.ce-refreshing,
      #btnSoftRefresh[data-ce-refreshing="1"],#ceBtnRefresV518[data-ce-refreshing="1"]{
        background:#107C41!important;color:#fff!important;border-color:#0B5D2A!important;opacity:1!important;box-shadow:0 0 0 3px rgba(16,124,65,.22),0 8px 22px rgba(16,124,65,.22)!important;
      }
      #btnSoftRefresh:not(.ce-refreshing):not([data-ce-refreshing="1"]),#ceBtnRefresV518:not(.ce-refreshing):not([data-ce-refreshing="1"]){
        background:#fff!important;color:#111827!important;
      }
      body.ce-v5023-has-event #noEventMessage,
      body.ce-v5023-has-event .ce-v44-welcome,
      body.ce-v5023-has-event .ce-v5019-welcome,
      body.ce-v5023-has-event .ce-v5022-welcome{
        display:none!important;visibility:hidden!important;pointer-events:none!important;max-height:0!important;overflow:hidden!important;margin:0!important;padding:0!important;border:0!important;
      }
      #ceBudgetLiteTooltipV307.open,#ceTooltipV21{pointer-events:auto!important;}
      .ce-v468-modal{z-index:650000!important;}
    `;
    document.head.appendChild(style);
  }

  function currentTab(){
    const lexical = safe(() => (typeof currentMainTab !== 'undefined' ? currentMainTab : ''), '');
    if(TABS.includes(String(lexical))) return String(lexical);
    const appTab = safe(() => window.ControlEventApp?.navigation?.currentMainTab || '', '');
    if(TABS.includes(String(appTab))) return String(appTab);
    const visible = TABS.find(tab => { const p=$(PANEL_BY_TAB[tab]); return p && !p.classList.contains('hidden') && safe(() => getComputedStyle(p).display !== 'none', true); });
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

  function clearWelcomeIfEvent(){
    if(!auth() || !hasValidEvent()) return;
    try{
      document.body.classList.remove(...AWAIT_CLASSES, 'auth-locked','ce-v5019-logged-out','ce-v5022-logged-out');
      document.body.classList.add('ce-v5019-authenticated','ce-v5020-has-event','ce-v5023-has-event');
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
    const sel = $('selectedEvent');
    const id = currentEventId();
    if(sel && id && sel.value !== id) sel.value = id;
  }

  function visibleActivePanel(){
    const tab = currentTab();
    const panel = $(PANEL_BY_TAB[tab]);
    return panel && !panel.classList.contains('hidden') ? {tab, panel} : null;
  }

  function ensurePanelVisibility(){
    if(!auth() || !hasValidEvent()) return;
    let tab = setTab(currentTab());
    TABS.forEach(t => {
      const p = $(PANEL_BY_TAB[t]);
      if(!p) return;
      const show = t === tab && roleAllowsTab(t);
      p.classList.toggle('hidden', !show);
      if(show){ p.removeAttribute('aria-hidden'); p.style.removeProperty('display'); }
    });
    Object.entries(BUTTON_BY_TAB).forEach(([t,id]) => {
      const b=$(id); if(b) b.classList.toggle('active', t === tab && roleAllowsTab(t));
    });
    clearWelcomeIfEvent();
  }

  function resetOpenTooltipMarkers(){
    // Si un globo quedó abierto sin Just. después de cambiar de usuario/evento,
    // se permite que v46.9 lo enriquezca de nuevo. No toca el módulo de INGRESOS.
    document.querySelectorAll('#ceTooltipV21 table,#ceBudgetLiteTooltipV307 table').forEach(table => {
      const hasJust = !!table.querySelector('.ce-v465-thumb-cell') || /\bJust\.?\b/i.test(table.textContent || '');
      if(!hasJust){
        try{ delete table.dataset.ceV468Receipts; delete table.dataset.ceV465Receipts; }catch(_){ }
        try{ table.removeAttribute('data-ce-v468-receipts'); table.removeAttribute('data-ce-v465-receipts'); }catch(_){ }
      }
    });
  }

  function rehydrateAll(reason){
    if(!auth() || !hasValidEvent()) return;
    const now = Date.now();
    if(now - lastHydrateAt < 45) return;
    lastHydrateAt = now;
    applyVersion();
    injectStyle();
    clearWelcomeIfEvent();
    ensurePanelVisibility();
    resetOpenTooltipMarkers();
    try{ window.ControlEventBudgetLiteTips?.sanitize?.(); }catch(_){ }
    try{ window.ControlEventV469?.hydrateEventReceipts?.(false); }catch(_){ }
    try{ window.ControlEventV469?.migrateLocalIngresoReceipts?.(); }catch(_){ }
    try{ window.ControlEventV469?.enrichOpenTooltips?.(); }catch(_){ }
    try{ window.ControlEventV467?.enrichOpenTooltips?.(); }catch(_){ }
    try{ window.ControlEventV465?.enrichOpenTooltips?.(); }catch(_){ }
    try{ window.ControlEventV5019?.ensureMobileDock?.(); }catch(_){ }
    try{ window.ControlEventV452?.syncRoleMenu?.(); }catch(_){ }
  }

  function scheduleHydrate(reason){
    clearTimeout(hydrateTimer);
    [50,140,320,700,1200,2100,3600].forEach(ms => setTimeout(() => rehydrateAll(reason || 'scheduled'), ms));
    hydrateTimer = setTimeout(() => rehydrateAll(reason || 'scheduled-final'), 5200);
  }

  function afterEventSelected(id, reason){
    if(!id) id = currentEventId();
    if(!hasValidEvent(id)) return;
    lastEventId = String(id);
    clearWelcomeIfEvent();
    setTab(currentTab() || (isRO() ? 'resumen' : 'graficas'));
    scheduleHydrate(reason || 'event-selected');
    try{ window.dispatchEvent(new CustomEvent('controlevent:module-mounted', {detail:{reason:'v50.23-event-selected', eventId:String(id)}})); }catch(_){ }
  }

  function afterRenderActive(tab, reason){
    if(!hasValidEvent()) return;
    setTab(tab || currentTab());
    clearWelcomeIfEvent();
    scheduleHydrate(reason || 'render-active');
  }

  function afterLoginWelcome(reason){
    applyVersion();
    injectStyle();
    try{ window.ControlEventV5019?.ensureMobileDock?.(); }catch(_){ }
  }

  function patchRefreshVisual(){
    if(window.__ceV5023RefreshVisual) return;
    window.__ceV5023RefreshVisual = true;
    const mark = on => {
      document.querySelectorAll('#btnSoftRefresh,#ceBtnRefresV518').forEach(btn => {
        try{
          btn.classList.toggle('ce-refreshing', !!on);
          if(on) btn.dataset.ceRefreshing = '1'; else delete btn.dataset.ceRefreshing;
        }catch(_){ }
      });
    };
    const begin = ev => {
      if(ev.target?.closest?.('#btnSoftRefresh,#ceBtnRefresV518')){
        mark(true);
        setTimeout(() => mark(false), 6500);
      }
    };
    window.addEventListener('click', begin, true);
    window.addEventListener('touchend', begin, {capture:true, passive:true});
    const patchApi = () => {
      const api = window.ControlEventV5020;
      if(api && typeof api.refreshInPlace === 'function' && !api.refreshInPlace.__ceV5023Visual){
        const old = api.refreshInPlace.bind(api);
        const wrapped = function(){
          mark(true);
          const done = () => setTimeout(() => mark(false), 120);
          try{
            const ret = old.apply(this, arguments);
            Promise.resolve(ret).finally(done);
            return ret;
          }catch(error){ done(); throw error; }
        };
        wrapped.__ceV5023Visual = true;
        api.refreshInPlace = wrapped;
      }
    };
    patchApi();
    [100,600,1500].forEach(ms => setTimeout(patchApi, ms));
  }

  function patchExports(){
    // Capa de seguridad: si algún módulo llama al API exportado, añadimos la rehidratación final.
    try{
      const api = window.ControlEventV447;
      if(api && typeof api.renderActive === 'function' && !api.renderActive.__ceV5023Wrapped){
        const oldRenderActive = api.renderActive.bind(api);
        api.renderActive = function(tab){
          const ret = oldRenderActive.apply(this, arguments);
          afterRenderActive(tab || currentTab(), 'api-renderActive');
          return ret;
        };
        api.renderActive.__ceV5023Wrapped = true;
      }
      if(api && typeof api.selectEvent === 'function' && !api.selectEvent.__ceV5023Wrapped){
        const oldSelect = api.selectEvent.bind(api);
        api.selectEvent = function(id){
          const ret = oldSelect.apply(this, arguments);
          if(id) afterEventSelected(id, 'api-selectEvent');
          return ret;
        };
        api.selectEvent.__ceV5023Wrapped = true;
      }
    }catch(_){ }
  }

  function patchDownloadNames(){
    document.addEventListener('click', ev => {
      const a = ev.target?.closest?.('a[download]');
      if(a && a.download) a.download = replaceVersionText(a.download);
    }, true);
  }

  function installMutationHydrator(){
    if(window.__ceV5023MutationHydrator) return;
    window.__ceV5023MutationHydrator = true;
    try{
      const mo = new MutationObserver(() => {
        if(!auth() || !hasValidEvent()) return;
        clearTimeout(mo._t);
        mo._t = setTimeout(() => rehydrateAll('dom-mutation'), 120);
      });
      mo.observe(document.body || document.documentElement, {childList:true, subtree:true});
    }catch(_){ }
  }

  function installHandlers(){
    if(window.__ceV5023Handlers) return;
    window.__ceV5023Handlers = true;
    document.addEventListener('change', ev => {
      if(ev.target?.id === 'selectedEvent'){
        const id = String(ev.target.value || '');
        if(id && eventById(id)) afterEventSelected(id, 'select-change-fallback');
      }
    }, false);
    document.addEventListener('click', ev => {
      const tabBtn = ev.target?.closest?.('#tabIngresosBtn,#tabDonacionesBtn,#tabComprasBtn,#tabMapaBtn,#tabPlanificacionBtn,#tabResumenBtn,#tabGraficasBtn,.mobile-menu-action[data-target]');
      if(tabBtn && hasValidEvent()) setTimeout(() => afterRenderActive(currentTab(), 'tab-click'), 220);
    }, false);
    window.addEventListener('controlevent:module-mounted', () => setTimeout(() => rehydrateAll('module-mounted'), 80));
  }

  function install(){
    injectStyle();
    applyVersion();
    patchVersionOutputs();
    watchVersionLabel();
    patchRefreshVisual();
    patchExports();
    patchDownloadNames();
    installHandlers();
    installMutationHydrator();
    if(auth() && hasValidEvent()) afterEventSelected(currentEventId(), 'install-has-event');
  }

  window.ControlEventV5023 = {
    version:VERSION,
    versionFile:VERSION_FILE,
    install,
    applyVersion,
    rehydrateAll,
    scheduleHydrate,
    afterEventSelected,
    afterRenderActive,
    afterLoginWelcome
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true}); else install();
  ['load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 40)));
  [80,260,800,1600,3200].forEach(ms => setTimeout(install, ms));
})();
