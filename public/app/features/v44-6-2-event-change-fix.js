/* ControlEvent v44.6.2 - cambio de evento ligero y no bloqueante.
   Base: recuperación controlada desde v44.5.1 estable.
   Objetivo: no bloquear el selector, no esperar a que el DOM quede inactivo y retirar la pantalla inicial CE cuando ya hay evento. */
(function(){
  'use strict';

  const VERSION = 'ControlEvent v44.6.2';
  const VERSION_FILE = 'ControlEvent_v44_6_2';
  const CHOSEN_KEY = 'controlevent_v44_event_chosen_after_login';
  const OLD_CHOSEN_KEY = 'ControlEvent_v25_event_chosen';
  const TOAST_ID = 'ceV462EventToast';
  const STYLE_ID = 'ceV462EventStyle';
  const PANELS = {
    ingresos: 'tabIngresos',
    compras: 'tabCompras',
    donaciones: 'tabDonaciones',
    mapa: 'tabMapaProductos',
    planificacion: 'tabPlanificacionInicial',
    resumen: 'tabResumen',
    graficas: 'tabGraficas'
  };
  const BUTTONS = {
    ingresos: 'tabIngresosBtn',
    compras: 'tabComprasBtn',
    donaciones: 'tabDonacionesBtn',
    mapa: 'tabMapaBtn',
    planificacion: 'tabPlanificacionBtn',
    resumen: 'tabResumenBtn',
    graficas: 'tabGraficasBtn'
  };

  function $(id){ return document.getElementById(id); }
  function safe(fn, fallback){ try{ const value = fn(); return value === undefined ? fallback : value; }catch(_){ return fallback; } }
  function stateRef(){
    const lexical = safe(() => (typeof state !== 'undefined' ? state : null), null);
    if(lexical) return lexical;
    return window.state || window.ControlEventApp?.state || {};
  }
  function events(){ const s = stateRef(); return Array.isArray(s.eventos) ? s.eventos : []; }
  function selectedId(){
    const s = stateRef();
    return String(s.selectedEventId || window.ControlEventApp?.state?.selectedEventId || $('selectedEvent')?.value || '');
  }
  function hasEventId(id){
    if(!id) return false;
    const list = events();
    return !list.length || list.some(event => String(event.id) === String(id));
  }
  function isChosen(){ return safe(() => sessionStorage.getItem(CHOSEN_KEY) === '1' || sessionStorage.getItem(OLD_CHOSEN_KEY) === '1', false); }
  function markChosen(){
    try{ sessionStorage.setItem(CHOSEN_KEY, '1'); sessionStorage.setItem(OLD_CHOSEN_KEY, '1'); }catch(_){ }
  }
  function clearChosen(){
    try{ sessionStorage.removeItem(CHOSEN_KEY); sessionStorage.removeItem(OLD_CHOSEN_KEY); }catch(_){ }
  }
  function currentTab(){
    const lexical = safe(() => (typeof currentMainTab !== 'undefined' ? currentMainTab : ''), '');
    if(lexical) return String(lexical);
    const runtime = safe(() => window.ControlEventApp?.navigation?.currentMainTab || window.__ceCurrentMainTab || '', '');
    if(runtime) return String(runtime);
    const visible = Object.entries(PANELS).find(([, id]) => { const el = $(id); return el && !el.classList.contains('hidden'); });
    return visible ? visible[0] : 'ingresos';
  }
  function setCurrentTab(tab){
    if(!tab) return;
    try{ currentMainTab = tab; }catch(_){ }
    try{ window.__ceCurrentMainTab = tab; }catch(_){ }
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = tab; }catch(_){ }
  }
  function setSelectedEventId(id){
    if(!id) return;
    try{ stateRef().selectedEventId = id; }catch(_){ }
    try{ if(window.state) window.state.selectedEventId = id; }catch(_){ }
    try{ if(window.ControlEventApp?.state) window.ControlEventApp.state.selectedEventId = id; }catch(_){ }
    const sel = $('selectedEvent');
    if(sel){
      sel.value = id;
      sel.disabled = false;
      sel.classList.remove('locked', 'ce-v44-awaiting');
      sel.style.pointerEvents = 'auto';
      sel.style.opacity = '1';
    }
  }
  function injectStyle(){
    if($(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${TOAST_ID}{position:fixed;top:calc(env(safe-area-inset-top,0px) + 74px);right:14px;z-index:2147483000;pointer-events:none;max-width:min(330px,calc(100vw - 28px));padding:12px 14px;border-radius:16px;background:rgba(15,23,42,.92);color:#fff;box-shadow:0 14px 38px rgba(15,23,42,.22);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;opacity:0;transform:translateY(-8px);transition:opacity .18s ease,transform .18s ease;}
      #${TOAST_ID}.show{opacity:1;transform:translateY(0);}
      #${TOAST_ID} strong{display:block;font-size:14px;line-height:1.2;margin:0 0 3px 0;}
      #${TOAST_ID} span{display:block;font-size:12px;line-height:1.3;opacity:.86;}
      @media(max-width:760px){#${TOAST_ID}{top:calc(env(safe-area-inset-top,0px) + 64px);left:12px;right:12px;max-width:none;text-align:center;}}
    `;
    document.head.appendChild(style);
  }
  function showToast(){
    injectStyle();
    let toast = $(TOAST_ID);
    if(!toast){
      toast = document.createElement('div');
      toast.id = TOAST_ID;
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.innerHTML = '<strong>Cargando nuevo evento...</strong><span>Preparando la ventana activa.</span>';
    clearTimeout(window.__ceV462ToastTimer);
    requestAnimationFrame(() => toast.classList.add('show'));
    window.__ceV462ToastTimer = setTimeout(() => hideToast(), 1200);
  }
  function hideToast(){
    const toast = $(TOAST_ID);
    if(!toast) return;
    toast.classList.remove('show');
    clearTimeout(window.__ceV462ToastRemoveTimer);
    window.__ceV462ToastRemoveTimer = setTimeout(() => {
      if(toast && !toast.classList.contains('show')) toast.remove();
    }, 260);
  }
  function applyVersion(){
    try{ document.title = VERSION; }catch(_){ }
    try{ window.__ceVersion = VERSION; window.VERSION = VERSION; window.VERSION_FILE = VERSION_FILE; }catch(_){ }
    try{ if(document.body) document.body.dataset.ceVersion = VERSION; }catch(_){ }
    try{
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
        const text = el.textContent || '';
        if(/ControlEvent\s+v\d+(?:\.\d+)*/.test(text)) el.textContent = text.replace(/ControlEvent\s+v\d+(?:\.\d+)*/g, VERSION);
      });
    }catch(_){ }
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__ceV462VersionFile){
        const old = proto.click;
        const wrapped = function(){
          try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ }
          return old.apply(this, arguments);
        };
        wrapped.__ceV462VersionFile = true;
        proto.click = wrapped;
      }
    }catch(_){ }
  }
  function removeWelcomeOverlay(id){
    if(!id) return;
    setSelectedEventId(id);
    try{ document.body.classList.remove('ce-v44-awaiting-event'); }catch(_){ }
    const msg = $('noEventMessage');
    if(msg){
      msg.classList.add('hidden');
      msg.classList.remove('ce-v44-welcome-card');
    }
    $('selectedEvent')?.classList.remove('ce-v44-awaiting');
  }
  function applyTabVisibility(tab, id){
    if(!tab || !PANELS[tab]) return;
    setCurrentTab(tab);
    removeWelcomeOverlay(id || selectedId());
    Object.entries(PANELS).forEach(([name, panelId]) => {
      const panel = $(panelId);
      if(panel) panel.classList.toggle('hidden', name !== tab);
    });
    Object.entries(BUTTONS).forEach(([name, btnId]) => {
      const btn = $(btnId);
      if(btn) btn.classList.toggle('active', name === tab);
    });
  }
  function refreshActive(tab, id, reason){
    setCurrentTab(tab);
    setSelectedEventId(id);
    removeWelcomeOverlay(id);
    try{ window.ControlEventModules?.activate?.(tab, {reason: reason || 'v44.6.2-event-change'}); }catch(_){ }
    try{
      if(window.ControlEventV443?.render) window.ControlEventV443.render();
      else if(typeof render === 'function') render();
      else window.render?.();
    }catch(error){ console.warn('[ControlEvent v44.6.2] Refresco ligero tras cambio de evento', error); }
    applyTabVisibility(tab, id);
    if(tab === 'graficas'){
      setTimeout(() => { try{ window.ControlEventV443?.renderStableGraficas?.(); }catch(_){ } }, 40);
    }
  }
  function neutralizeBlockingLoaders(){
    // Defensa por si se instala encima de v44.6/v44.6.1: desactiva cualquier cargador bloqueante conocido sin tocar datos.
    try{ window.__ceV46BlockingEventLoaderDisabled = true; }catch(_){ }
    try{ window.ControlEventV46EventLoader?.disable?.(); }catch(_){ }
    try{ window.ControlEventEventLoadGate?.disable?.(); }catch(_){ }
    const sel = $('selectedEvent');
    if(sel){ sel.disabled = false; sel.style.pointerEvents = 'auto'; sel.style.opacity = '1'; }
  }
  function patchLogin(){
    const old = safe(() => (typeof doLogin === 'function' ? doLogin : window.doLogin), null);
    if(typeof old !== 'function' || old.__ceV462Login) return;
    const wrapped = async function(){
      clearChosen();
      const result = await old.apply(this, arguments);
      setCurrentTab('graficas');
      applyVersion();
      neutralizeBlockingLoaders();
      return result;
    };
    wrapped.__ceV462Login = true;
    wrapped.__ceV462Original = old;
    try{ doLogin = wrapped; }catch(_){ }
    window.doLogin = wrapped;
  }
  function patchChangeSelectedEvent(){
    const old = safe(() => (typeof changeSelectedEvent === 'function' ? changeSelectedEvent : window.changeSelectedEvent), null);
    if(typeof old !== 'function' || old.__ceV462Change) return;
    const wrapped = async function(value){
      const id = String(value || '');
      if(!id) return old.apply(this, arguments);

      const beforeId = selectedId();
      const bodyAwaiting = !!document.body?.classList?.contains('ce-v44-awaiting-event');
      const waitingForFirstEvent = !beforeId || bodyAwaiting;
      const targetTab = waitingForFirstEvent ? 'graficas' : (currentTab() || 'ingresos');

      markChosen();
      setCurrentTab(targetTab);
      setSelectedEventId(id);
      removeWelcomeOverlay(id);
      showToast();
      neutralizeBlockingLoaders();

      let result;
      try{
        result = await old.apply(this, arguments);
      }finally{
        markChosen();
        setCurrentTab(targetTab);
        setSelectedEventId(id);
        removeWelcomeOverlay(id);
        applyVersion();
        neutralizeBlockingLoaders();
        applyTabVisibility(targetTab, id);
        [0, 60, 180, 420, 900].forEach((delay, index) => {
          setTimeout(() => {
            removeWelcomeOverlay(id);
            setCurrentTab(targetTab);
            applyTabVisibility(targetTab, id);
            if(index <= 2) refreshActive(targetTab, id, 'v44.6.2-event-change');
          }, delay);
        });
        setTimeout(hideToast, 950);
      }
      return result;
    };
    wrapped.__ceV462Change = true;
    wrapped.__ceV462Original = old;
    try{ changeSelectedEvent = wrapped; }catch(_){ }
    window.changeSelectedEvent = wrapped;
  }
  function install(){
    applyVersion();
    injectStyle();
    neutralizeBlockingLoaders();
    patchLogin();
    patchChangeSelectedEvent();
  }

  window.ControlEventV462 = {version: VERSION, versionFile: VERSION_FILE, install, refreshActive, removeWelcomeOverlay, neutralizeBlockingLoaders};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
  ['load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30)));
  [120, 600, 1400].forEach(delay => setTimeout(install, delay));
})();
