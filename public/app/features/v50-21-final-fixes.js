/* ControlEvent v50.21 - limpieza exacta Salir -> Login -> CE.
   Ajuste funcional único:
   - Si se pulsa Salir y se entra con otro usuario, se elimina el evento anterior antes de que
     cualquier mantenimiento renderice pantallas/globos. Tras login queda CE + Selecciona evento.
   - Al elegir evento se libera el bloqueo y se mantiene el flujo v50.20 que ya funciona. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v50.21';
  const VERSION_FILE = 'ControlEvent_v50_21';
  const INSTALLED = '__ceV5021FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const RESET_UNTIL = 'controlevent_v5021_login_reset_until';
  const CHOSEN_KEYS = ['controlevent_v44_event_chosen_after_login','ControlEvent_v25_event_chosen','controlevent_v5021_event_chosen'];
  const SELECT_KEYS = ['controlevent_v229_selected_event_id','ControlEvent_v25_selected_event','ControlEvent_v26_selected_event'];
  const SESSION_KEYS = ['ControlEvent_v26_9_session'];
  const PANEL_IDS = ['tabIngresos','tabDonaciones','tabCompras','tabMapaProductos','tabPlanificacionInicial','tabResumen','tabGraficas'];
  const DYNAMIC_IDS = ['ingresosSummaryGrid','collabList','donacionesList','comprasList','mapaProductosSummary','mapaProductosList','budgetLayout','summarySegmento','summaryDestino','summaryTiendaTicket','eventChartWrap'];
  const AWAITING_CLASSES = ['ce-v44-awaiting-event','ce-v5013-force-event-choice','ce-v5015-awaiting-event','ce-v5017-awaiting-event','ce-v5018-awaiting-event','ce-v5019-awaiting-event','ce-v5021-awaiting-event'];
  const HAS_EVENT_CLASSES = ['ce-v5018-has-event','ce-v5019-has-event','ce-v5020-has-event','ce-v5021-has-event'];
  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const stop = ev => { try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; };
  const getLexical = name => safe(() => Function('return (typeof '+name+' !== "undefined") ? '+name+' : undefined;')(), undefined);
  const setLexical = (name, value) => safe(() => Function('value', name + ' = value;')(value), undefined);
  const call = (name, args) => { const fn = safe(() => (typeof window[name] === 'function') ? window[name] : Function('return (typeof '+name+' === "function") ? '+name+' : null;')(), null); if(typeof fn !== 'function') return undefined; try{ return fn.apply(window, args || []); }catch(error){ console.warn('[v50.21] Error en '+name, error); return undefined; } };
  const st = () => getLexical('state') || window.state || window.ControlEventApp?.state || {};
  const auth = () => getLexical('authUser') || window.authUser || window.ControlEventApp?.authUser || null;
  const arr = key => Array.isArray(st()[key]) ? st()[key] : [];
  const eventById = id => arr('eventos').find(ev => String(ev?.id || '') === String(id || '')) || null;
  const hasValidEvent = id => !!eventById(id == null ? st().selectedEventId : id);
  const currentEventId = () => String(st().selectedEventId || $('selectedEvent')?.value || '');
  const currentTab = () => {
    const lexical = safe(() => (typeof currentMainTab !== 'undefined' ? currentMainTab : ''), '');
    if(lexical) return String(lexical);
    return String(window.__ceCurrentMainTab || window.ControlEventApp?.navigation?.currentMainTab || 'graficas');
  };

  function applyVersion(){
    try{ document.title = VERSION; document.documentElement.dataset.ceVersion = VERSION; if(document.body) document.body.dataset.ceVersion = VERSION; }catch(_){ }
    try{ window.__ceVersion = VERSION; window.VERSION = VERSION; window.VERSION_FILE = VERSION_FILE; window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE}; }catch(_){ }
    try{
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
        const txt = el.textContent || '';
        if(/ControlEvent\s+v\d+(?:\.\d+)*/i.test(txt)) el.textContent = txt.replace(/ControlEvent\s+v\d+(?:\.\d+)*/ig, VERSION);
      });
    }catch(_){ }
  }

  function clearStorageSession(){
    [...SESSION_KEYS, ...SELECT_KEYS, ...CHOSEN_KEYS].forEach(k => { safe(() => localStorage.removeItem(k), null); safe(() => sessionStorage.removeItem(k), null); });
  }
  function markReset(ms){ safe(() => sessionStorage.setItem(RESET_UNTIL, String(Date.now() + (ms || 12000))), null); }
  function clearReset(){ safe(() => sessionStorage.removeItem(RESET_UNTIL), null); }
  function resetActive(){ return Number(safe(() => sessionStorage.getItem(RESET_UNTIL), '0') || 0) > Date.now(); }
  function markChosen(){ CHOSEN_KEYS.forEach(k => safe(() => sessionStorage.setItem(k, '1'), null)); clearReset(); }
  function clearChosen(){ CHOSEN_KEYS.forEach(k => safe(() => sessionStorage.removeItem(k), null)); }

  function clearSelectedEventOnly(){
    try{ const s = st(); if(s) s.selectedEventId = ''; }catch(_){ }
    try{ if(window.ControlEventApp?.state) window.ControlEventApp.state.selectedEventId = ''; }catch(_){ }
    try{ const sel = $('selectedEvent'); if(sel) sel.value = ''; }catch(_){ }
    SELECT_KEYS.forEach(k => { safe(() => localStorage.removeItem(k), null); safe(() => sessionStorage.removeItem(k), null); });
  }
  function ensurePlaceholder(){
    const sel = $('selectedEvent');
    if(!sel) return;
    let opt = sel.querySelector('option[value=""]');
    if(!opt){ opt = document.createElement('option'); opt.value = ''; sel.insertBefore(opt, sel.firstChild); }
    opt.textContent = arr('eventos').length ? 'Selecciona evento...' : 'Cargando eventos...';
    if(!hasValidEvent()) sel.value = '';
    sel.disabled = false;
  }
  function hideWorkPanels(clearContent){
    PANEL_IDS.forEach(id => { const el = $(id); if(el) el.classList.add('hidden'); });
    if(clearContent){
      DYNAMIC_IDS.forEach(id => { const el=$(id); if(!el) return; try{ el.replaceChildren(); }catch(_){ el.innerHTML=''; } });
    }
  }
  function showWelcome(){
    if(!auth()) return;
    clearSelectedEventOnly();
    clearChosen();
    ensurePlaceholder();
    hideWorkPanels(false);
    try{
      document.body.classList.remove('auth-locked', ...HAS_EVENT_CLASSES);
      document.body.classList.add('ce-v5021-awaiting-event','ce-v44-awaiting-event');
    }catch(_){ }
    const ov = $('authOverlay');
    if(ov){
      ov.classList.add('hidden'); ov.setAttribute('aria-hidden','true');
      ov.style.setProperty('display','none','important');
      ov.style.setProperty('visibility','hidden','important');
      ov.style.setProperty('opacity','0','important');
      ov.style.setProperty('pointer-events','none','important');
    }
    const msg = $('noEventMessage');
    if(msg){
      msg.classList.remove('hidden');
      msg.removeAttribute('aria-hidden');
      msg.style.removeProperty('display');
      msg.style.removeProperty('visibility');
      msg.style.removeProperty('max-height');
      if(!msg.querySelector('.ce-v5021-welcome')){
        msg.innerHTML = '<div class="ce-v5021-welcome"><img src="./assets/icons/controlevent-welcome-v44.png" alt="ControlEvent"><h2>Selecciona un evento para trabajar</h2><p>Elige el evento en el desplegable superior para cargar todos los datos y activar los globos.</p></div>';
      }
    }
    try{ setLexical('currentMainTab', 'graficas'); window.__ceCurrentMainTab = 'graficas'; }catch(_){ }
    applyVersion();
  }
  function showCleanLogin(){
    clearStorageSession(); clearSelectedEventOnly(); clearChosen(); hideWorkPanels(true); clearReset();
    setLexical('authUser', null); setLexical('authBusy', false);
    try{ window.authUser = null; }catch(_){ }
    try{ if(window.ControlEventApp) window.ControlEventApp.authUser = null; }catch(_){ }
    try{ document.body.classList.remove(...AWAITING_CLASSES, ...HAS_EVENT_CLASSES, 'ce-v5019-authenticated'); document.body.classList.add('auth-locked','ce-v5021-logged-out'); }catch(_){ }
    const msg = $('noEventMessage'); if(msg) msg.classList.add('hidden');
    const ov = $('authOverlay');
    if(ov){
      ov.classList.remove('hidden'); ov.removeAttribute('hidden'); ov.setAttribute('aria-hidden','false');
      ov.style.setProperty('display','flex','important'); ov.style.setProperty('visibility','visible','important'); ov.style.setProperty('opacity','1','important'); ov.style.setProperty('pointer-events','auto','important'); ov.style.setProperty('z-index','300000','important');
    }
    ['brandCurrentUserName','currentUserName'].forEach(id => { const el=$(id); if(el) el.textContent='Sin acceso'; });
    ['brandCurrentUserMeta','currentUserLevel'].forEach(id => { const el=$(id); if(el) el.textContent=''; });
    applyVersion();
  }

  function finalizeEventChosen(id){
    if(!hasValidEvent(id)) return;
    markChosen();
    try{
      document.body.classList.remove(...AWAITING_CLASSES, 'ce-v5021-logged-out','auth-locked');
      document.body.classList.add('ce-v5021-has-event');
    }catch(_){ }
    const msg = $('noEventMessage');
    if(msg){ msg.classList.add('hidden'); msg.setAttribute('aria-hidden','true'); msg.style.setProperty('display','none','important'); }
    const sel = $('selectedEvent'); if(sel) sel.value = String(id);
    try{ st().selectedEventId = String(id); }catch(_){ }
    try{ window.ControlEventV5020?.clearWelcome?.(); }catch(_){ }
    applyVersion();
  }
  function hydrateAfterEvent(id, reason){
    if(!hasValidEvent(id)) return;
    finalizeEventChosen(id);
    const tab = currentTab() || 'graficas';
    try{ window.ControlEventV5020?.renderActiveOnly?.(tab, reason || 'v50.21-event'); }catch(_){ }
    try{ window.ControlEventV5019?.afterEventSelected?.(id, reason || 'v50.21-event'); }catch(_){ }
    try{ window.ControlEventBudgetLiteTips?.sanitize?.(); }catch(_){ }
    try{ window.ControlEventV469?.enrichOpenTooltips?.(); }catch(_){ }
  }

  function patchFetch(){
    if(window.__ceV5021FetchPatched || typeof window.fetch !== 'function') return;
    window.__ceV5021FetchPatched = true;
    const oldFetch = window.fetch.bind(window);
    window.fetch = function(input, init){
      const url = String((input && input.url) || input || '');
      const p = oldFetch(input, init);
      if(/\/api\/login(?:\?|$)/.test(url)){
        return p.then(res => {
          try{
            res.clone().json().then(data => {
              if(res.ok && data && data.ok && data.user){
                markReset(14000);
                clearSelectedEventOnly();
                clearChosen();
                [120,320,700,1200,2200,3800].forEach(ms => setTimeout(() => { if(auth() && resetActive()) showWelcome(); }, ms));
              }
            }).catch(()=>{});
          }catch(_){ }
          return res;
        });
      }
      if(resetActive() && /\/api\/state(?:\?|$)/.test(url)){
        return p.then(async res => {
          try{
            const data = await res.clone().json();
            if(data && typeof data === 'object') data.selectedEventId = '';
            const headers = new Headers(res.headers || {}); headers.set('Content-Type','application/json');
            return new Response(JSON.stringify(data), {status:res.status, statusText:res.statusText, headers});
          }catch(_){ return res; }
        });
      }
      return p;
    };
  }

  function patchSelectors(){
    if(!window.__ceV5021SelectorsPatched){
      window.__ceV5021SelectorsPatched = true;
      document.addEventListener('change', ev => {
        if(ev.target?.id !== 'selectedEvent') return;
        const id = String(ev.target.value || '');
        if(id && eventById(id)){
          markChosen();
          [80,260,650,1300,2400].forEach(ms => setTimeout(() => hydrateAfterEvent(id, 'selector-change'), ms));
        }else if(auth()){
          markReset(12000);
          setTimeout(showWelcome, 40);
        }
      }, true);
    }
    const oldChange = window.changeSelectedEvent;
    if(typeof oldChange === 'function' && !oldChange.__ceV5021Wrapped){
      const wrapped = function(value){
        const id = String(value || '');
        if(id && eventById(id)) markChosen();
        const ret = oldChange.apply(this, arguments);
        if(id && eventById(id)) [80,260,650,1300,2400].forEach(ms => setTimeout(() => hydrateAfterEvent(id, 'changeSelectedEvent'), ms));
        else if(auth()) setTimeout(showWelcome, 80);
        return ret;
      };
      wrapped.__ceV5021Wrapped = true;
      window.changeSelectedEvent = wrapped;
      try{ changeSelectedEvent = wrapped; }catch(_){ }
    }
    const sw = window.ControlEventV447;
    if(sw && typeof sw.selectEvent === 'function' && !sw.selectEvent.__ceV5021Wrapped){
      const oldSelect = sw.selectEvent.bind(sw);
      const wrappedSelect = function(value, options){
        const id = String(value || '');
        if(id && eventById(id)) markChosen();
        const ret = oldSelect(value, options);
        if(id && eventById(id)) [100,300,800,1600,2600].forEach(ms => setTimeout(() => hydrateAfterEvent(id, 'ControlEventV447.selectEvent'), ms));
        return ret;
      };
      wrappedSelect.__ceV5021Wrapped = true;
      sw.selectEvent = wrappedSelect;
    }
  }

  function patchLogout(){
    if(window.__ceV5021LogoutPatched) return;
    window.__ceV5021LogoutPatched = true;
    const hard = function(ev){
      if(ev) stop(ev);
      try{ fetch('/api/logout', {method:'POST', cache:'no-store'}).catch(()=>{}); }catch(_){ }
      showCleanLogin();
      return false;
    };
    window.ControlEventV5021Logout = hard;
    const oldDoLogout = window.doLogout || safe(() => (typeof doLogout === 'function' ? doLogout : null), null);
    const wrapped = function(ev){ return hard(ev); };
    wrapped.__ceV5021Wrapped = true;
    window.doLogout = wrapped;
    try{ doLogout = wrapped; }catch(_){ }
    try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.doLogout = wrapped; }catch(_){ }
    // Captura en document: el manejador antiguo de window puede actuar primero, pero este queda como red de seguridad
    // para cualquier botón creado después.
    document.addEventListener('click', ev => {
      if(ev.target?.closest?.('#btnLogout,#ceBtnSalirV518')) return hard(ev);
    }, true);
    try{ if(oldDoLogout && oldDoLogout.__ceV5021Wrapped) void oldDoLogout; }catch(_){ }
  }

  function installStyle(){
    if($('ceV5021Style')) return;
    const style = document.createElement('style');
    style.id = 'ceV5021Style';
    style.textContent = `
      body.ce-v5021-awaiting-event #tabIngresos,
      body.ce-v5021-awaiting-event #tabDonaciones,
      body.ce-v5021-awaiting-event #tabCompras,
      body.ce-v5021-awaiting-event #tabMapaProductos,
      body.ce-v5021-awaiting-event #tabPlanificacionInicial,
      body.ce-v5021-awaiting-event #tabResumen,
      body.ce-v5021-awaiting-event #tabGraficas{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      body.ce-v5021-awaiting-event #noEventMessage{display:flex!important;align-items:center!important;justify-content:center!important;min-height:48vh!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;visibility:visible!important;}
      .ce-v5021-welcome{width:min(560px,92vw);margin:22px auto;text-align:center;padding:30px 22px;border-radius:28px;background:rgba(255,255,255,.92);box-shadow:0 20px 50px rgba(15,23,42,.12);border:1px solid rgba(148,163,184,.22);}
      .ce-v5021-welcome img{display:block;width:min(220px,52vw);height:auto;margin:0 auto 18px auto;border-radius:34px;filter:drop-shadow(0 16px 28px rgba(15,23,42,.24));}
      .ce-v5021-welcome h2{margin:0 0 8px 0;font-size:clamp(21px,3.2vw,31px);letter-spacing:-.02em;color:#0f172a;}
      .ce-v5021-welcome p{margin:0;color:#475569;font-size:15px;line-height:1.45;}
    `;
    document.head.appendChild(style);
  }

  function bootCheck(){
    applyVersion(); installStyle(); patchFetch(); patchLogout(); patchSelectors(); ensurePlaceholder();
    if(auth() && resetActive() && !hasValidEvent()) showWelcome();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootCheck, {once:true}); else bootCheck();
  ['load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(bootCheck, 30)));
  [80,260,700,1500,3000,5000].forEach(ms => setTimeout(bootCheck, ms));
  window.ControlEventV5021 = {version:VERSION, versionFile:VERSION_FILE, showWelcome, showCleanLogin, hydrateAfterEvent, applyVersion};
})();
